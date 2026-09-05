import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';
import {
  runDocumentQA,
  CANONICAL_NAMESPACE_DEPARTMENT_MAP,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/qa-scanner/document-qa-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Authenticate session & strictly derive organization from server context (Never trust client org_id)
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready' || !orgContext.active_membership?.organization_id) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready or no active membership' }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const channelIdStr = formData.get('channel_id') as string;
    const channelId = (channelIdStr && channelIdStr !== 'null' && channelIdStr !== 'undefined' && channelIdStr.trim() !== '') ? channelIdStr : null;
    
    // 2. Strict Namespace Validation: FAIL-CLOSED (Zero Fallback)
    const rawNamespace = (formData.get('namespace') as string || '').trim().toLowerCase();
    const departmentId = CANONICAL_NAMESPACE_DEPARTMENT_MAP[rawNamespace];
    if (!rawNamespace || !departmentId) {
      return NextResponse.json({
        error: 'FAIL_CLOSED_INVALID_NAMESPACE',
        message: 'Namespace is mandatory and must be one of: ' + Object.keys(CANONICAL_NAMESPACE_DEPARTMENT_MAP).join(', '),
      }, { status: 400 });
    }

    if (!file || !title) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing file or title' }, { status: 400 });
    }

    // 3. Strict File Hygiene Enforcement (Size and MIME)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({
        error: 'FILE_TOO_LARGE',
        message: `File size (${file.size} bytes) exceeds maximum limit of ${MAX_FILE_SIZE_BYTES} bytes (10MB)`,
      }, { status: 400 });
    }

    const isMarkdown = file.type === 'text/markdown' || file.type === 'application/markdown' || /\.md$/i.test(file.name);
    const isPlainText = file.type === 'text/plain' || /\.txt$/i.test(file.name);
    const isBinaryFormat = /\.(pdf|docx?|doc)$/i.test(file.name) || ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);

    if (isBinaryFormat) {
      return NextResponse.json({
        error: 'BINARY_EXTRACTION_UNAVAILABLE',
        message: 'Binary documents (.pdf, .doc, .docx) cannot be verified via direct TextDecoder. In Phase 1-2 prototype, please upload verified markdown (.md) or plaintext (.txt) documents to ensure 100% reliable QA inspection.',
      }, { status: 422 });
    }

    if (!isMarkdown && !isPlainText) {
      return NextResponse.json({
        error: 'UNSUPPORTED_FILE_TYPE',
        message: 'Only verified markdown (.md) and plaintext (.txt) files are supported for direct text QA scanning.',
      }, { status: 400 });
    }

    // 4. Extract Text & Execute Server-Side Document QA Scan
    const arrayBuffer = await file.arrayBuffer();
    let extractedText = '';
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      extractedText = decoder.decode(arrayBuffer);
    } catch (extractErr: any) {
      return NextResponse.json({
        error: 'EXTRACTION_FAILED',
        message: 'Failed to extract text from uploaded document: ' + extractErr.message,
      }, { status: 422 });
    }

    const qaReport = runDocumentQA(extractedText, rawNamespace);

    // 5. Enforce Gate: P0 HARD BLOCK vs REVIEW_RECOMMENDED
    if (qaReport.verdict === 'HARD_BLOCKED') {
      // ZERO STORAGE POLLUTION: Blocked file is NEVER uploaded to Storage bucket!
      const quarantineSentinel = `quarantine://qa-hard-blocked/${crypto.randomUUID()}`;

      // Record blocked document in DB as DRAFT + NOT_REQUIRED for audit provenance
      const insertRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          organization_id: organizationId,
          channel_id: channelId,
          namespace: rawNamespace,
          title: title,
          file_url: quarantineSentinel,
          status: 'failed',
          knowledge_status: 'DRAFT',
          ingestion_status: 'NOT_REQUIRED',
          error_message: `QA_HARD_BLOCKED: ${qaReport.p0_violations.length} P0 violation(s) detected`,
          knowledge_metadata: {
            qa_inspection_report: qaReport,
            department_id: departmentId,
            actor_id: auth.user.id,
            inspected_at: qaReport.inspected_at,
          },
          created_by: auth.user.id
        })
      });

      // STRICT INVARIANT: N8N is NEVER called when blocked!
      return NextResponse.json({
        error: 'QA_HARD_BLOCKED',
        message: 'Document contains prohibited P0 claim violations and cannot be ingested',
        qa_report: qaReport,
      }, { status: 422 });
    }

    // 6. Happy Path (QA Passed): Upload clean file to Supabase Storage (crm_knowledge_files)
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = `${organizationId}/${fileName}`;
    
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${storagePath}`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': file.type || 'text/plain',
        'x-upsert': 'true'
      },
      body: arrayBuffer
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Storage upload failed:', err);
      return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 502 });
    }

    // 7. Happy Path (QA Passed): Insert as REVIEWED + PENDING awaiting Founder Approval
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        organization_id: organizationId,
        channel_id: channelId,
        namespace: rawNamespace,
        title: title,
        file_url: storagePath,
        status: 'processing',
        knowledge_status: 'REVIEWED',
        ingestion_status: 'PENDING',
        knowledge_metadata: {
          qa_inspection_report: qaReport,
          department_id: departmentId,
          actor_id: auth.user.id,
          inspected_at: qaReport.inspected_at,
        },
        created_by: auth.user.id
      })
    });

    if (!insertRes.ok) {
      const errTxt = await insertRes.text();
      console.error('DB Insert Error:', errTxt);
      return NextResponse.json({ error: 'DB_INSERT_FAILED' }, { status: 502 });
    }

    const docs = await insertRes.json();
    const document = docs[0];

    // NOTE: Per Gatekeeper invariant, automatic N8N embedding is NOT triggered here.
    // Document is securely queued as REVIEWED + PENDING until Founder clicks APPROVE on UI.

    return NextResponse.json({
      document,
      qa_report: qaReport,
      message: 'Document passed QA Gatekeeper inspection and is queued for Founder review',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error uploading knowledge document:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
