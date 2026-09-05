import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';
import { createPackageApprovalSignature } from '@/lib/knowledge/package-approval-signer';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const PackageApprovalSchema = z.object({
  packageId: z.string().min(1),
  packageVersion: z.string().min(1),
  expectedParts: z.number().int().min(1).max(10),
  expectedManifestSha256: z.string().regex(/^[a-fA-F0-9]{64}$/, 'expectedManifestSha256 must be a 64-character hex string')
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session via UI Auth Guard
    const auth = await verifyUiAuth(req, PackageApprovalSchema);
    if (!auth.ok) return auth.response;

    // 2. Load portal organization context & verify active founder/owner role
    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'User does not have an active organization context.' }, { status: 403 });
    }

    const membershipRole = orgContext.active_membership.role;
    if (membershipRole !== 'owner') {
      return NextResponse.json({
        error: 'FORBIDDEN',
        code: 'FOUNDER_ROLE_REQUIRED',
        message: 'Only organization Founder/Owner (role: owner) is authorized to approve knowledge packages.'
      }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    const { packageId, packageVersion, expectedParts, expectedManifestSha256 } = auth.payload;

    // 3. Cryptographically sign package approval payload server-side using KNOWLEDGE_APPROVAL_SECRET
    const signed = createPackageApprovalSignature({
      organizationId,
      packageId,
      packageVersion,
      expectedParts,
      expectedManifestSha256,
      callerId: auth.user.id
    });

    // 4. Call authoritative Supabase RPC using user's access token
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '', {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false }
    });

    const { data: approvalResult, error: rpcError } = await userClient.rpc('approve_knowledge_package', {
      p_organization_id: organizationId,
      p_package_id: packageId,
      p_package_version: packageVersion,
      p_expected_parts: expectedParts,
      p_expected_manifest_sha256: expectedManifestSha256,
      p_nonce: signed.nonce,
      p_timestamp: signed.timestamp,
      p_signature: signed.signature
    });

    if (rpcError) {
      console.error('[PackageApproval] RPC call failed:', rpcError.message);
      return NextResponse.json({ error: 'RPC_FAILED', message: rpcError.message }, { status: 400 });
    }

    // 5. Audit Log successful approval (Fail-Closed with Compensating Rollback)
    try {
      if (process.env.NODE_ENV !== 'production' && req.headers.get('x-test-simulate-audit-failure') === 'true') {
        throw new Error('Simulated audit logging failure for fault recovery testing');
      }

      await auth.logAudit(
        'KNOWLEDGE_PACKAGE_APPROVED',
        `Approved package ${packageId} v${packageVersion} (${expectedParts} parts)`,
        {
          organizationId,
          packageId,
          packageVersion,
          nonce: signed.nonce,
          result: approvalResult
        }
      );
    } catch (auditErr: any) {
      console.error('[PackageApproval] Audit logging failed:', auditErr.message);

      // Gatekeeper Blocker 1 & 2: Targeted Compensating Rollback
      // If this request was an idempotent replay (transitioned_now is false),
      // DO NOT roll back or archive already approved packages!
      const transitionedNow = approvalResult?.transitioned_now === true;
      const rawTransitionedDocIds = approvalResult?.transitioned_doc_ids || [];
      const transitionedDocIds: string[] = Array.isArray(rawTransitionedDocIds) ? rawTransitionedDocIds : [];

      if (!transitionedNow || transitionedDocIds.length === 0) {
        // Idempotent replay where audit failed: No documents were transitioned in this request,
        // so NO documents must be rolled back or archived. The previously approved package remains active.
        return NextResponse.json({
          error: 'AUDIT_LOG_FAILED',
          message: 'Package was already approved in database, but writing authoritative audit log for this approval replay failed.',
          audit_rollback_status: 'NOOP_ALREADY_APPROVED',
          idempotent: true
        }, { status: 500 });
      }

      // First-time approval where audit failed: Roll back ONLY the documents transitioned in this request
      let dbRollbackSuccess = false;
      let dbRollbackError: string | null = null;
      let affectedRows = 0;

      try {
        if (process.env.NODE_ENV !== 'production' && req.headers.get('x-test-simulate-rpc-failure') === 'true') {
          throw new Error('Simulated RPC rollback_knowledge_package_approval failure for fault recovery testing');
        }

        const rollbackRes = await fetch(`${supabaseUrl}/rest/v1/rpc/rollback_knowledge_package_approval`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_organization_id: organizationId,
            p_package_id: packageId,
            p_package_version: packageVersion,
            p_document_ids: transitionedDocIds,
            p_expected_status: 'APPROVED',
            p_target_status: 'ARCHIVED',
            p_reason: 'AUDIT_LOG_FAILED'
          })
        });

        if (!rollbackRes.ok) {
          const errText = await rollbackRes.text();
          dbRollbackError = `RPC rollback_knowledge_package_approval failed with HTTP ${rollbackRes.status}: ${errText}`;
          console.error('[PackageApproval Rollback]', dbRollbackError);
        } else {
          const rbData = await rollbackRes.json();
          affectedRows = rbData?.affected_rows || 0;
          dbRollbackSuccess = true;
        }
      } catch (dbErr: any) {
        dbRollbackError = `Compensating rollback error: ${dbErr.message}`;
        console.error('[PackageApproval Rollback]', dbRollbackError);
      }

      if (!dbRollbackSuccess) {
        return NextResponse.json({
          error: 'AUDIT_LOG_AND_ROLLBACK_FAILED',
          message: 'Package approval audit log failed AND compensating rollback also failed.',
          audit_rollback_status: 'ROLLBACK_FAILURE',
          rollback_errors: dbRollbackError ? [dbRollbackError] : [],
          transitioned_doc_ids: transitionedDocIds
        }, { status: 500 });
      }

      return NextResponse.json({
        error: 'AUDIT_LOG_FAILED',
        message: 'Package was approved in database but writing authoritative audit log failed. Transitioned documents have been retired to ARCHIVED (Append-Only).',
        audit_rollback_status: 'ROLLED_BACK',
        rolled_back_parts: affectedRows,
        transitioned_doc_ids: transitionedDocIds
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result: approvalResult
    });
  } catch (error: any) {
    console.error('[PackageApproval] Internal error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message: error.message }, { status: 500 });
  }
}
