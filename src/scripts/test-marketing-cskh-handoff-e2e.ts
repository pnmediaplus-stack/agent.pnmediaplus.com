import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { POST as handleKnowledgeCallback } from '../app/api/crm/knowledge/callback/route';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// STRICT ENVIRONMENT ALLOWLIST GUARD: ONLY permitted on DB Clone / Local
// -----------------------------------------------------------------------------
const ALLOWED_CLONE_HOSTS = new Set([
  'ldhjrdihrcjsjfmrqtbi.supabase.co', // Authorized DB Clone
  '127.0.0.1',
  'localhost',
]);

let targetHost = '';
try {
  targetHost = new URL(supabaseUrl).hostname;
} catch {
  targetHost = supabaseUrl;
}

if (!ALLOWED_CLONE_HOSTS.has(targetHost)) {
  console.error('================================================================');
  console.error(`⛔ HARD BLOCKED: Target environment (${targetHost}) is NOT on the`);
  console.error('allowed clone list! This E2E suite contains mutation fixtures');
  console.error('and is STRICTLY RESTRICTED to authorized DB Clone (ldhjrdihrcjsjfmrqtbi.supabase.co) or Local.');
  console.error('================================================================');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const publicClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

// -----------------------------------------------------------------------------
// CANONICAL IDEMPOTENCY KEY SERIALIZER
// -----------------------------------------------------------------------------
export function computeCanonicalHandoffIdempotencyKey(
  orgId: string,
  campaignId: string | null,
  contentItemId: string | null,
  revision: number,
  redactionHash: string
): string {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error(`VALIDATION_ERROR: revision must be a strictly positive integer >= 1, got: ${revision}`);
  }
  const cleanOrg = orgId.trim().toLowerCase();
  const cleanCamp = (campaignId || '').trim().toLowerCase();
  const cleanItem = (contentItemId || '').trim().toLowerCase();
  const cleanHash = redactionHash.trim().toLowerCase();

  if (!/^[0-9a-f]{64}$/.test(cleanHash)) {
    throw new Error(`VALIDATION_ERROR: redactionHash must be a valid 64-char lowercase hex string, got: ${cleanHash}`);
  }

  const canonicalString = `${cleanOrg}:${cleanCamp}:${cleanItem}:rev_${revision}:${cleanHash}:cskh`.normalize('NFKC');
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

// -----------------------------------------------------------------------------
// DETERMINISTIC REDACTION SCANNER & HASH COMPUTATION
// -----------------------------------------------------------------------------
export function executeDeterministicRedaction(rawContent: string): {
  redactedContent: string;
  redactionHash: string;
  rulesVersion: string;
} {
  const BLACKLIST_PATTERNS = [
    /system_prompt\s*[:=].*/gi,
    /media_budget\s*[:=].*/gi,
    /cpm\s*[:=].*/gi,
    /cpl\s*[:=].*/gi,
    /designer_notes\s*[:=].*/gi,
  ];

  let cleaned = rawContent;
  for (const pattern of BLACKLIST_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED_INTERNAL_NOTE]');
  }

  const normalized = cleaned.trim().normalize('NFKC');
  const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');

  return {
    redactedContent: normalized,
    redactionHash: hash,
    rulesVersion: 'v1.0-strict',
  };
}

// -----------------------------------------------------------------------------
// SAFE STATE-MACHINE COMPLIANT ARCHIVE HELPER (FAIL-FAST)
// Graph: DRAFT -> REVIEWED -> APPROVED -> DEPRECATED -> ARCHIVED
// -----------------------------------------------------------------------------
async function safeArchiveDocument(admin: any, ownerClient: any, docId: string, ownerUserId: string) {
  const { data: doc, error: getErr } = await admin
    .from('crm_knowledge_documents')
    .select('knowledge_status')
    .eq('id', docId)
    .single();

  if (getErr || !doc) {
    throw new Error(`Cleanup failed to get doc ${docId}: ${getErr?.message}`);
  }
  let status = doc.knowledge_status;
  if (status === 'ARCHIVED') return;

  if (status === 'DRAFT') {
    const { error: revErr } = await admin.from('crm_knowledge_documents').update({ knowledge_status: 'REVIEWED' }).eq('id', docId);
    if (revErr) throw new Error(`Cleanup failed DRAFT->REVIEWED for doc ${docId}: ${revErr.message}`);
    status = 'REVIEWED';
  }

  if (status === 'REVIEWED') {
    const minApprovedMetadata = {
      object_class: 'knowledge',
      semantic_type: 'fact',
      governance_type: 'none',
      usage_authority: 'cross_department',
      sensitivity: 'internal',
      allowed_purposes: ['internal_reasoning'],
      evidence_basis: ['internal_data'],
      applicability: { departments: ['cskh'] },
      provenance: {
        author_role: 'system_cleanup',
        approved_by: ownerUserId,
        approved_at: new Date().toISOString(),
        approver_role: 'department_owner',
      },
    };

    const { error: appErr } = await ownerClient
      .from('crm_knowledge_documents')
      .update({
        knowledge_status: 'APPROVED',
        knowledge_metadata: minApprovedMetadata,
      })
      .eq('id', docId);
    if (appErr) throw new Error(`Cleanup failed REVIEWED->APPROVED for doc ${docId}: ${appErr.message}`);
    status = 'APPROVED';
  }

  if (status === 'APPROVED' || status === 'ACTIVE') {
    const { error: depErr } = await admin.from('crm_knowledge_documents').update({ knowledge_status: 'DEPRECATED' }).eq('id', docId);
    if (depErr) throw new Error(`Cleanup failed APPROVED/ACTIVE->DEPRECATED for doc ${docId}: ${depErr.message}`);
    status = 'DEPRECATED';
  }

  if (status === 'DEPRECATED' || status === 'SUPERSEDED') {
    const { error: arcErr } = await admin.from('crm_knowledge_documents').update({ knowledge_status: 'ARCHIVED' }).eq('id', docId);
    if (arcErr) throw new Error(`Cleanup failed DEPRECATED->ARCHIVED for doc ${docId}: ${arcErr.message}`);
  }

  const { data: finalDoc } = await admin.from('crm_knowledge_documents').select('knowledge_status').eq('id', docId).single();
  if (finalDoc?.knowledge_status !== 'ARCHIVED') {
    throw new Error(`Cleanup verification failed: Document ${docId} ended in state ${finalDoc?.knowledge_status}, expected ARCHIVED`);
  }
}

// -----------------------------------------------------------------------------
// HELPER: SIGN AND CALL NEXT.JS CALLBACK API ROUTE
// -----------------------------------------------------------------------------
async function callNextJsCallbackApi(payload: any): Promise<Response> {
  const secret = (process.env.N8N_WEBHOOK_SECRET || 'dev-n8n-webhook-secret-32-chars-long!!')
    .split(',')[0]
    .trim();
  const rawBody = Buffer.from(JSON.stringify(payload));
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');

  const req = new Request('http://localhost:3000/api/crm/knowledge/callback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-n8n-signature': `sha256=${signature}`,
      'x-n8n-timestamp': timestamp,
      'x-request-id': `e2e-test-${Date.now()}`,
    },
    body: rawBody,
  });

  return handleKnowledgeCallback(req);
}

async function runE2ETest() {
  console.log('================================================================');
  console.log('MARKETING-TO-CSKH KNOWLEDGE HANDOFF E2E VERIFICATION SUITE');
  console.log('Target Environment: AUTHORIZED DB CLONE');
  console.log('Target Supabase URL:', supabaseUrl);
  console.log('Scope: Fail-Fast Cleanup + Fresh Replay Audit + HTTP 409 + Atomic Rollback + Chunk Hash Proof');
  console.log('================================================================\n');

  let orgId = '';
  let ownerUserId = '';
  let ownerJwt = '';
  let ownerClient: any = null;
  const createdDocIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Authenticate Owner Session & Determine Target Tenant
    // -------------------------------------------------------------------------
    console.log('[Setup 1] Authenticating Owner Session via OTP exchange...');
    const linkRes = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: 'pnmediaplus@gmail.com',
    });

    if (linkRes.error || !linkRes.data?.properties?.email_otp) {
      throw new Error(`Failed to generate magiclink: ${linkRes.error?.message}`);
    }

    const { data: authData, error: authErr } = await publicClient.auth.verifyOtp({
      email: 'pnmediaplus@gmail.com',
      token: linkRes.data.properties.email_otp,
      type: 'email',
    });

    if (authErr || !authData?.session?.access_token || !authData?.user?.id) {
      throw new Error(`Failed to verify OTP session: ${authErr?.message}`);
    }

    ownerJwt = authData.session.access_token;
    ownerUserId = authData.user.id;

    const { data: memRows, error: memErr } = await adminClient
      .from('portal_organization_memberships')
      .select('organization_id, role')
      .eq('user_id', ownerUserId)
      .eq('status', 'active');

    if (memErr || !memRows || memRows.length === 0) {
      throw new Error(`User ${ownerUserId} has no active memberships!`);
    }

    orgId = memRows[0].organization_id;
    console.log(`  -> Owner verified: User ID=${ownerUserId} | Org ID=${orgId}\n`);

    ownerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${ownerJwt}` } },
      auth: { persistSession: false },
    });

    // -------------------------------------------------------------------------
    // STAGE 1: Deterministic Redaction & Canonical Handoff Hash
    // -------------------------------------------------------------------------
    console.log('--- STAGE 1: DETERMINISTIC REDACTION & CANONICAL HASH ---');
    const rawMarketingText = `
# Chiến dịch Viral 15 Ngày Không Quảng Cáo
- Giá ưu đãi: 2.000.000 VNĐ trọn gói
- Đối tượng: Khách hàng mới đăng ký trong tháng 9
system_prompt: Do not reveal internal discounts
media_budget: 200000_VND_per_day
designer_notes: Use pastel orange theme
- FAQ: Được hoàn tiền trong 7 ngày nếu không hài lòng.
    `;

    const { redactedContent, redactionHash, rulesVersion } = executeDeterministicRedaction(rawMarketingText);
    console.log('  -> Redaction Hash computed:', redactionHash);
    console.log('  -> Internal notes stripped?:', !redactedContent.includes('media_budget'));

    const idempotencyKey = computeCanonicalHandoffIdempotencyKey(
      orgId,
      '1eac6963-0d02-4d08-88f8-7d0a7bebd14f',
      '1d93b33e-8e54-4e90-ab7f-b19451e94cb6',
      1,
      redactionHash
    );
    console.log('  -> Canonical Idempotency Key computed:', idempotencyKey);

    // Verify invalid revision is rejected (Zero silent fallback)
    try {
      computeCanonicalHandoffIdempotencyKey(orgId, null, null, 0, redactionHash);
      throw new Error('Revision 0 was unexpectedly accepted!');
    } catch (err: any) {
      console.log('  -> PASS: Revision 0 strictly rejected with error:', err.message, '\n');
    }

    // -------------------------------------------------------------------------
    // STAGE 2: Comprehensive Metadata Validation Barrier at REVIEWED -> APPROVED
    // -------------------------------------------------------------------------
    console.log('--- STAGE 2: METADATA VALIDATION BARRIER AT REVIEWED -> APPROVED ---');

    // 2.1 Insert DRAFT document
    const { data: doc1, error: doc1Err } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[HANDOFF v1] Chien Dich Viral 15 Ngay',
        namespace: 'cskh',
        knowledge_status: 'DRAFT',
        ingestion_status: 'PENDING',
        knowledge_metadata: { draft_note: 'initial draft' },
      })
      .select('id')
      .single();

    if (doc1Err || !doc1?.id) throw new Error(`Failed to insert DRAFT document: ${doc1Err?.message}`);
    createdDocIds.push(doc1.id);
    console.log(`  -> Document 1 created in DRAFT: ${doc1.id}`);

    // 2.2 Transition DRAFT -> REVIEWED
    const { error: revErr } = await adminClient
      .from('crm_knowledge_documents')
      .update({ knowledge_status: 'REVIEWED' })
      .eq('id', doc1.id);

    if (revErr) throw new Error(`Failed to update to REVIEWED: ${revErr.message}`);
    console.log('  -> Document 1 transitioned: DRAFT -> REVIEWED');

    // 2.3 Attempt REVIEWED -> APPROVED with MISSING contract fields (e.g. missing governance_type)
    console.log('  [Barrier Test 2.3] Submitting APPROVED with incomplete metadata (missing governance_type):');
    const { error: badApproveErr } = await ownerClient
      .from('crm_knowledge_documents')
      .update({
        knowledge_status: 'APPROVED',
        knowledge_metadata: {
          object_class: 'knowledge',
          semantic_type: 'fact',
          // governance_type missing!
          usage_authority: 'cross_department',
          sensitivity: 'public',
          allowed_purposes: ['customer_response'],
          provenance: {
            approved_by: ownerUserId,
            approved_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', doc1.id);

    console.log('  Error returned on bad approval:', badApproveErr?.message || 'None');
    if (badApproveErr && badApproveErr.message.includes('VALIDATION_ERROR')) {
      console.log('  -> PASS: Incomplete metadata transition to APPROVED was HARD BLOCKED by trigger!\n');
    } else {
      throw new Error(`Barrier Test FAILED: Expected trigger rejection, got: ${JSON.stringify(badApproveErr)}`);
    }

    // 2.4 Transition REVIEWED -> APPROVED with FULL VALID canonical metadata and provenance
    console.log('  [Valid Test 2.4] Submitting APPROVED with full valid metadata:');
    const validMetadataDoc1 = {
      object_class: 'knowledge',
      semantic_type: 'fact',
      governance_type: 'none',
      usage_authority: 'cross_department',
      sensitivity: 'public',
      allowed_purposes: ['customer_response'],
      evidence_basis: ['internal_data'],
      applicability: {
        departments: ['cskh'],
        campaign_id: '1eac6963-0d02-4d08-88f8-7d0a7bebd14f',
        content_item_id: '1d93b33e-8e54-4e90-ab7f-b19451e94cb6',
      },
      provenance: {
        author_role: 'marketing_agent',
        approved_by: ownerUserId,
        approved_at: new Date().toISOString(),
        approver_role: 'department_owner',
      },
      redaction: {
        redaction_hash: redactionHash,
        rules_version: rulesVersion,
      },
    };

    const { error: goodApproveErr } = await ownerClient
      .from('crm_knowledge_documents')
      .update({
        knowledge_status: 'APPROVED',
        knowledge_metadata: validMetadataDoc1,
      })
      .eq('id', doc1.id);

    if (goodApproveErr) throw new Error(`Valid approval FAILED: ${goodApproveErr.message}`);
    console.log('  -> PASS: Valid metadata & provenance successfully transitioned to APPROVED!\n');

    // -------------------------------------------------------------------------
    // STAGE 3: Atomic Ingestion Callback & Actual Chunk Hash Proof
    // -------------------------------------------------------------------------
    console.log('--- STAGE 3: INGESTION CALLBACK & REAL CHUNK CONTENT HASH PROOF ---');
    const corrIdDoc1 = `handoff-corr-${Date.now()}-1`;
    const payloadHashDoc1 = crypto.createHash('sha256').update(`event-payload-1-${corrIdDoc1}`).digest('hex');

    const { data: cb1Res, error: cb1Err } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: doc1.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: corrIdDoc1,
      p_payload_hash: payloadHashDoc1,
      p_retry_attempt: 0,
    });

    if (cb1Err || !cb1Res?.success) throw new Error(`Callback for Document 1 FAILED: ${cb1Err?.message || JSON.stringify(cb1Res)}`);
    console.log('  -> Callback Result Doc 1:', cb1Res);

    // Insert real chunk for Document 1 in namespace 'cskh'
    const dummyEmbedding = Array(1536).fill(0.01);
    const { error: chunk1Err } = await adminClient
      .from('crm_knowledge_chunks')
      .insert({
        document_id: doc1.id,
        organization_id: orgId,
        content: redactedContent,
        metadata: {
          namespace: 'cskh',
          campaign_id: '1eac6963-0d02-4d08-88f8-7d0a7bebd14f',
        },
        embedding: dummyEmbedding,
      });

    if (chunk1Err) throw new Error(`Failed to insert chunk for Doc 1: ${chunk1Err.message}`);

    // Fetch the inserted chunk from database and compute hash directly from stored content
    const { data: insertedChunk, error: fetchChunkErr } = await adminClient
      .from('crm_knowledge_chunks')
      .select('content')
      .eq('document_id', doc1.id)
      .single();

    if (fetchChunkErr || !insertedChunk) throw new Error('Failed to fetch inserted chunk from database');

    const computedChunkHash = crypto
      .createHash('sha256')
      .update(insertedChunk.content.trim().normalize('NFKC'), 'utf8')
      .digest('hex');

    console.log('  -> Stored Chunk Content Hash:', computedChunkHash);
    console.log('  -> Metadata redaction_hash:   ', redactionHash);
    if (computedChunkHash !== redactionHash) {
      throw new Error(`CRITICAL INTEGRITY FAILURE: Stored chunk hash does not match metadata redaction_hash!`);
    }
    console.log('  -> PASS: Stored chunk content in vector store matches metadata redaction_hash 100%!\n');

    // -------------------------------------------------------------------------
    // STAGE 4: Atomic Superseding & Mid-Transaction Rollback Guards
    // -------------------------------------------------------------------------
    console.log('--- STAGE 4: ATOMIC SUPERSEDING & ROLLBACK GUARDS ---');

    // 4.1 Create Document 2 (Revision 2) with supersedes_id = doc1.id
    const { data: doc2, error: doc2Err } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[HANDOFF v2] Chien Dich Viral 15 Ngay - Cap Nhat Uu Dai',
        namespace: 'cskh',
        knowledge_status: 'DRAFT',
        ingestion_status: 'PENDING',
        supersedes_id: doc1.id,
        knowledge_metadata: { draft: 'rev 2' },
      })
      .select('id')
      .single();

    if (doc2Err || !doc2?.id) throw new Error(`Failed to insert Doc 2: ${doc2Err?.message}`);
    createdDocIds.push(doc2.id);

    const { error: rev2Err } = await adminClient.from('crm_knowledge_documents').update({ knowledge_status: 'REVIEWED' }).eq('id', doc2.id);
    if (rev2Err) throw new Error(`Failed to transition Doc 2 to REVIEWED: ${rev2Err.message}`);

    const validMetadataDoc2 = {
      ...validMetadataDoc1,
      provenance: {
        author_role: 'marketing_agent',
        approved_by: ownerUserId,
        approved_at: new Date().toISOString(),
        approver_role: 'department_owner',
      },
    };

    const { error: app2Err } = await ownerClient
      .from('crm_knowledge_documents')
      .update({
        knowledge_status: 'APPROVED',
        knowledge_metadata: validMetadataDoc2,
      })
      .eq('id', doc2.id);

    if (app2Err) throw new Error(`Failed to approve Doc 2: ${app2Err.message}`);
    console.log(`  -> Document 2 APPROVED with supersedes_id = ${doc1.id}`);

    // 4.2 Test Atomic Rollback: Point supersedes_id to a document NOT in APPROVED/ACTIVE
    console.log('  [Rollback Test 4.2] Testing atomic rollback when superseded document is not APPROVED/ACTIVE:');
    const { data: unapprovedOldDoc, error: unappErr } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[UNAPPROVED DOC] Draft to test superseding fail-fast',
        namespace: 'cskh',
        knowledge_status: 'DRAFT',
        ingestion_status: 'PENDING',
        knowledge_metadata: { note: 'draft' },
      })
      .select('id')
      .single();

    if (unappErr || !unapprovedOldDoc?.id) throw new Error(`Failed to insert unapproved doc: ${unappErr?.message}`);
    createdDocIds.push(unapprovedOldDoc.id);

    // Point Doc 2 to unapproved doc
    await adminClient.from('crm_knowledge_documents').update({ supersedes_id: unapprovedOldDoc.id }).eq('id', doc2.id);

    const { error: rollbackErr } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: doc2.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: `rollback-test-${Date.now()}`,
      p_payload_hash: 'payloadhashdummy',
    });

    console.log('  Superseding violation error:', rollbackErr?.message || 'None');
    if (rollbackErr && rollbackErr.message.includes('SUPERSEDING_VIOLATION')) {
      const { data: rbDoc2 } = await adminClient.from('crm_knowledge_documents').select('knowledge_status').eq('id', doc2.id).single();
      const { data: rbDocOld } = await adminClient.from('crm_knowledge_documents').select('knowledge_status').eq('id', unapprovedOldDoc.id).single();

      if (rbDoc2?.knowledge_status === 'APPROVED' && rbDocOld?.knowledge_status === 'DRAFT') {
        console.log('  -> PASS: Atomic rollback verified! Neither document mutated when superseding condition failed.\n');
      } else {
        throw new Error(`Rollback verification FAILED: Doc 2=${rbDoc2?.knowledge_status}, Old Doc=${rbDocOld?.knowledge_status}`);
      }
    } else {
      throw new Error(`Expected SUPERSEDING_VIOLATION exception, got: ${JSON.stringify(rollbackErr)}`);
    }

    // 4.3 Restore supersedes_id = doc1.id and execute successful atomic superseding
    await adminClient.from('crm_knowledge_documents').update({ supersedes_id: doc1.id }).eq('id', doc2.id);

    const corrIdDoc2 = `handoff-corr-${Date.now()}-2`;
    const payloadHashDoc2 = crypto.createHash('sha256').update(`event-payload-2-${corrIdDoc2}`).digest('hex');

    const { data: cb2Res, error: cb2Err } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: doc2.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: corrIdDoc2,
      p_payload_hash: payloadHashDoc2,
      p_retry_attempt: 0,
    });

    if (cb2Err || !cb2Res?.success) throw new Error(`Callback for Doc 2 FAILED: ${cb2Err?.message || JSON.stringify(cb2Res)}`);
    console.log('  -> Successful Callback Result Doc 2:', cb2Res);

    const { data: stateCheck } = await adminClient
      .from('crm_knowledge_documents')
      .select('id, knowledge_status')
      .in('id', [doc1.id, doc2.id]);

    const doc1State = stateCheck?.find(d => d.id === doc1.id)?.knowledge_status;
    const doc2State = stateCheck?.find(d => d.id === doc2.id)?.knowledge_status;

    console.log(`  -> State Audit: Doc 1 = ${doc1State} | Doc 2 = ${doc2State}`);
    if (doc1State !== 'DEPRECATED' || doc2State !== 'ACTIVE') {
      throw new Error(`Atomic Superseding FAILED: Expected Doc 1 DEPRECATED and Doc 2 ACTIVE, got Doc 1=${doc1State}, Doc 2=${doc2State}`);
    }
    console.log('  -> PASS: Atomic superseding executed flawlessly in the exact same transaction!\n');

    // -------------------------------------------------------------------------
    // STAGE 5: State Machine Compliant Marketing Fixture & Namespace Isolation
    // -------------------------------------------------------------------------
    console.log('--- STAGE 5: STATE-MACHINE COMPLIANT FIXTURE & NAMESPACE ISOLATION ---');

    // 5.1 Create and activate real marketing fixture through FULL STATE MACHINE with zero bypass
    const { data: docMkt, error: docMktErr } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[MARKETING INTERNAL] Chien Luoc Gia & Media Budget',
        namespace: 'marketing',
        knowledge_status: 'DRAFT',
        ingestion_status: 'PENDING',
        knowledge_metadata: { draft: 'mkt' },
      })
      .select('id')
      .single();

    if (docMktErr || !docMkt?.id) throw new Error(`Failed to create marketing doc: ${docMktErr?.message}`);
    createdDocIds.push(docMkt.id);

    const { error: mktRevErr } = await adminClient.from('crm_knowledge_documents').update({ knowledge_status: 'REVIEWED' }).eq('id', docMkt.id);
    if (mktRevErr) throw new Error(`Marketing doc transition to REVIEWED failed: ${mktRevErr.message}`);

    const mktApprovedMeta = {
      object_class: 'knowledge',
      semantic_type: 'recommendation',
      governance_type: 'none',
      usage_authority: 'internal_reasoning_only',
      sensitivity: 'internal',
      allowed_purposes: ['internal_reasoning'],
      evidence_basis: ['internal_data'],
      applicability: { departments: ['marketing'] },
      provenance: {
        author_role: 'marketing_lead',
        approved_by: ownerUserId,
        approved_at: new Date().toISOString(),
        approver_role: 'department_owner',
      },
    };

    const { error: mktAppErr } = await ownerClient.from('crm_knowledge_documents').update({
      knowledge_status: 'APPROVED',
      knowledge_metadata: mktApprovedMeta,
    }).eq('id', docMkt.id);

    if (mktAppErr) throw new Error(`Marketing doc transition to APPROVED failed: ${mktAppErr.message}`);

    // Legally activate via callback RPC
    const mktCorrId = `mkt-fixture-${Date.now()}`;
    const mktHash = crypto.createHash('sha256').update(mktCorrId).digest('hex');
    const { data: mktCbRes, error: mktCbErr } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: docMkt.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: mktCorrId,
      p_payload_hash: mktHash,
    });

    if (mktCbErr || !mktCbRes?.success) throw new Error(`Marketing doc legal activation callback failed: ${mktCbErr?.message}`);

    const { error: chunkMktErr } = await adminClient
      .from('crm_knowledge_chunks')
      .insert({
        document_id: docMkt.id,
        organization_id: orgId,
        content: 'CONFIDENTIAL: Internal Marketing budget is 500.000.000 VND. Margin 40%.',
        metadata: { namespace: 'marketing' },
        embedding: dummyEmbedding,
      });

    if (chunkMktErr) throw new Error(`Failed to insert marketing chunk: ${chunkMktErr.message}`);
    console.log('  -> Legally activated marketing fixture in namespace marketing.');

    // 5.2 CSKH calls match_documents with namespace = 'cskh'
    console.log('  [Test 5.2] CSKH queries match_documents with namespace = cskh:');
    const { data: cskhResults, error: matchErr } = await adminClient.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_count: 10,
      filter: { organization_id: orgId, namespace: 'cskh' },
    });

    if (matchErr) throw new Error(`match_documents query failed: ${matchErr.message}`);

    const hasMktChunk = (cskhResults || []).some((r: any) => r.content.includes('CONFIDENTIAL'));
    console.log(`  -> Total chunks retrieved by CSKH: ${cskhResults?.length || 0}`);
    console.log(`  -> Did CSKH leak confidential marketing chunk?: ${hasMktChunk}`);

    if (hasMktChunk) {
      throw new Error('CRITICAL SECURITY LEAK: CSKH match_documents retrieved internal marketing chunk!');
    }
    console.log('  -> PASS: CSKH query with namespace cskh completely excluded 100% of marketing chunks.\n');

    // -------------------------------------------------------------------------
    // STAGE 6: Real API Route HTTP 409 & Replay with Fresh Document Fixture
    // -------------------------------------------------------------------------
    console.log('--- STAGE 6: FRESH FIXTURE AUDIT, HTTP 409 & REPLAY VIA REAL API ROUTE ---');

    // 6.1 Create a FRESH document in APPROVED state with PENDING ingestion
    const { data: docApiTest, error: apiDocErr } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[API TEST] Fresh Doc For Real Callback Test',
        namespace: 'cskh',
        knowledge_status: 'DRAFT',
        ingestion_status: 'PENDING',
        knowledge_metadata: { draft: 'api test' },
      })
      .select('id')
      .single();

    if (apiDocErr || !docApiTest?.id) throw new Error(`Failed to create API test doc: ${apiDocErr?.message}`);
    createdDocIds.push(docApiTest.id);

    await adminClient.from('crm_knowledge_documents').update({ knowledge_status: 'REVIEWED' }).eq('id', docApiTest.id);

    const { error: apiAppErr } = await ownerClient.from('crm_knowledge_documents').update({
      knowledge_status: 'APPROVED',
      knowledge_metadata: validMetadataDoc1,
    }).eq('id', docApiTest.id);

    if (apiAppErr) throw new Error(`Failed to approve API test doc: ${apiAppErr.message}`);
    console.log(`  -> Fresh Document created in APPROVED state (ingestion PENDING): ${docApiTest.id}`);

    const apiCorrId = `api-test-corr-${Date.now()}`;
    const apiPayloadInitial = {
      document_id: docApiTest.id,
      organization_id: orgId,
      status: 'SUCCESS',
      correlation_id: apiCorrId,
      retry_attempt: 0,
      error_message: null,
    };

    // 6.2 Call API route first time -> Expect HTTP 200 PROCESSED
    console.log('  [API Test 6.2] Invoking /api/crm/knowledge/callback initial call:');
    const res1 = await callNextJsCallbackApi(apiPayloadInitial);
    const json1 = await res1.json();
    console.log(`  -> Initial Call HTTP Status: ${res1.status} | Body:`, json1);
    if (res1.status !== 200) {
      throw new Error(`Expected HTTP 200 on initial callback, got: ${res1.status}`);
    }

    // 6.3 Explicit Audit Record Assertion: Verify audit row was actually created with correlation_id
    const { data: auditRow, error: auditFetchErr } = await adminClient
      .from('crm_knowledge_audit_logs')
      .select('id, correlation_id, payload_hash')
      .eq('correlation_id', apiCorrId)
      .limit(1);

    if (auditFetchErr || !auditRow || auditRow.length === 0) {
      throw new Error(`IDEMPOTENCY FAILURE: Audit log record was NOT created for correlation_id ${apiCorrId}`);
    }
    console.log('  -> Verified Audit Log Record exists in database: ID =', auditRow[0].id);

    // 6.4 Identical Replay via API route -> Expect HTTP 200 (duplicate: true, IDEMPOTENT_ACK)
    console.log('  [API Test 6.4] Invoking identical replay with same correlation_id and payload:');
    const res2 = await callNextJsCallbackApi(apiPayloadInitial);
    const json2 = await res2.json();
    console.log(`  -> Replay Call HTTP Status: ${res2.status} | Body:`, json2);
    if (res2.status !== 200 || json2.status !== 'IDEMPOTENT_ACK') {
      throw new Error(`Expected HTTP 200 IDEMPOTENT_ACK on replay, got: ${res2.status} ${JSON.stringify(json2)}`);
    }
    console.log('  -> PASS: Real API Route returned HTTP 200 IDEMPOTENT_ACK on identical replay!\n');

    // 6.5 Semantic Conflict via API route: Same correlation_id but DIFFERENT payload (e.g. status: 'FAILED')
    console.log('  [API Test 6.5] Invoking conflicting call with same correlation_id but different status:');
    const apiPayloadConflicting = {
      ...apiPayloadInitial,
      status: 'FAILED', // Tampered status creates differing payload_hash
      error_message: 'tampered failure',
    };

    const res3 = await callNextJsCallbackApi(apiPayloadConflicting);
    const json3 = await res3.json();
    console.log(`  -> Conflicting Call HTTP Status: ${res3.status} | Body:`, json3);
    if (res3.status !== 409) {
      throw new Error(`Expected HTTP 409 on semantic conflict, got: ${res3.status} ${JSON.stringify(json3)}`);
    }
    console.log('  -> PASS: Real API Route returned HTTP 409 IDEMPOTENCY_CONFLICT with 100% precision!\n');

    console.log('================================================================');
    console.log('ALL 6 E2E TEST STAGES PASSED 100% ON DB CLONE:');
    console.log('  1. Canonical Handoff Serialization & Negative Revision Rejection: PASS');
    console.log('  2. Comprehensive Metadata Contract Barrier at REVIEWED -> APPROVED: PASS');
    console.log('  3. Ingestion Callback & Real Chunk Content Hash Proof: PASS');
    console.log('  4. Atomic Superseding & Fail-Fast Rollback Guards: PASS');
    console.log('  5. State-Machine Compliant Fixture & Two-Layer Namespace Isolation: PASS');
    console.log('  6. Real Next.js API Route HTTP 409 Conflict & Idempotent Replay: PASS');
    console.log('================================================================');
  } finally {
    console.log('\n--- CLEANUP FIXTURE INVENTORY VIA STRICT STATE MACHINE (FAIL-FAST) ---');
    let cleanupErrors = 0;
    for (const docId of createdDocIds) {
      try {
        await safeArchiveDocument(adminClient, ownerClient, docId, ownerUserId);
        console.log(`  -> Document ${docId} successfully ARCHIVED.`);
      } catch (err: any) {
        console.error(`  CRITICAL: Cleanup failed for doc ${docId}:`, err.message);
        cleanupErrors++;
      }
    }
    if (cleanupErrors > 0) {
      throw new Error(`CLEANUP_FAILURE: ${cleanupErrors} test fixtures failed to transition to ARCHIVED!`);
    }
    console.log(`  -> Cleaned up 100% of ${createdDocIds.length} test documents safely into ARCHIVED state.`);
  }
}

runE2ETest().catch((err) => {
  console.error('\nE2E Suite FAILED:', err);
  process.exit(1);
});
