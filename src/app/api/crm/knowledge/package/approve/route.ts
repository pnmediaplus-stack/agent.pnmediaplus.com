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
  expectedManifestSha256: z.string().length(64)
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate user session via UI Auth Guard
    const auth = await verifyUiAuth(req, PackageApprovalSchema);
    if (!auth.ok) return auth.response;

    // 2. Load portal organization context & verify active founder/admin role
    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'User does not have an active organization context.' }, { status: 403 });
    }

    const membershipRole = orgContext.active_membership.role;
    if (!['owner', 'admin', 'department_owner'].includes(membershipRole)) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Caller role is not authorized to approve knowledge packages.' }, { status: 403 });
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

    // 5. Audit Log successful approval (Fail-Closed: if audit fails, do NOT return success)
    try {
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
      return NextResponse.json({
        error: 'AUDIT_LOG_FAILED',
        message: 'Package was approved in database but writing authoritative audit log failed.'
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
