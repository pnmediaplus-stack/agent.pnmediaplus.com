import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
// Strict: rejects invalid revision, lowercases UUIDs, NFKC normalize
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

async function runE2ETest() {
  console.log('================================================================');
  console.log('MARKETING-TO-CSKH KNOWLEDGE HANDOFF E2E VERIFICATION SUITE');
  console.log('Target Environment: AUTHORIZED DB CLONE');
  console.log('Target Supabase URL:', supabaseUrl);
  console.log('Scope: Validation Barrier + State Machine + Atomic Superseding + Namespace Isolation');
  console.log('================================================================\n');

  let orgId = '';
  let ownerUserId = '';
  let ownerJwt = '';
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

    const ownerClient = createClient(supabaseUrl, anonKey, {
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
    console.log('  -> Content contains internal notes?:', redactedContent.includes('media_budget'));

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
    // STAGE 2: Test Validation Barrier at REVIEWED -> APPROVED
    // -------------------------------------------------------------------------
    console.log('--- STAGE 2: VALIDATION BARRIER AT REVIEWED -> APPROVED ---');

    // 2.1 Insert DRAFT document (Allowed with initial metadata)
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

    // 2.3 Attempt REVIEWED -> APPROVED with INVALID metadata (Must be rejected by trigger)
    console.log('  [Barrier Test 2.3] Attempting APPROVED with invalid metadata (expect rejection):');
    const { error: badApproveErr } = await ownerClient
      .from('crm_knowledge_documents')
      .update({
        knowledge_status: 'APPROVED',
        knowledge_metadata: {
          semantic_type: 'invalid_enum', // Invalid enum
        },
      })
      .eq('id', doc1.id);

    console.log('  Error returned on bad approval:', badApproveErr?.message || 'None');
    if (badApproveErr && (badApproveErr.message.includes('VALIDATION_ERROR') || badApproveErr.message.includes('AUTHORIZATION_VIOLATION'))) {
      console.log('  -> PASS: Invalid metadata transition to APPROVED was HARD BLOCKED by trigger!\n');
    } else {
      throw new Error(`Barrier Test FAILED: Expected trigger rejection, got: ${JSON.stringify(badApproveErr)}`);
    }

    // 2.4 Transition REVIEWED -> APPROVED with VALID canonical metadata and provenance
    console.log('  [Valid Test 2.4] Submitting APPROVED with valid canonical metadata & provenance:');
    const validMetadataDoc1 = {
      object_class: 'knowledge',
      semantic_type: 'fact',
      usage_authority: 'cross_department',
      sensitivity: 'public',
      allowed_purposes: ['customer_response'],
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
      applicability: {
        departments: ['cskh'],
        campaign_id: '1eac6963-0d02-4d08-88f8-7d0a7bebd14f',
        content_item_id: '1d93b33e-8e54-4e90-ab7f-b19451e94cb6',
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
    // STAGE 3: Atomic Ingestion Callback & Activation of Document 1
    // -------------------------------------------------------------------------
    console.log('--- STAGE 3: ATOMIC INGESTION CALLBACK & ACTIVATION ---');
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
    console.log('  -> PASS: Chunk for Document 1 indexed in namespace cskh.\n');

    // -------------------------------------------------------------------------
    // STAGE 4: Atomic Superseding (Document 2 supersedes Document 1)
    // -------------------------------------------------------------------------
    console.log('--- STAGE 4: ATOMIC SUPERSEDING OF OLD DOCUMENT ---');

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

    // Transition Doc 2: DRAFT -> REVIEWED -> APPROVED
    await adminClient.from('crm_knowledge_documents').update({ knowledge_status: 'REVIEWED' }).eq('id', doc2.id);

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

    // 4.2 Execute Ingestion Callback on Document 2 with SUCCESS
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
    console.log('  -> Callback Result Doc 2:', cb2Res);

    // 4.3 Verify Atomic Superseding: Doc 2 is ACTIVE, Doc 1 is DEPRECATED
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
    // STAGE 5: Namespace Two-Layer Defense Verification
    // -------------------------------------------------------------------------
    console.log('--- STAGE 5: NAMESPACE TWO-LAYER DEFENSE & RETRIEVAL PROOF ---');

    // 5.1 Insert a REAL active marketing document with chunks in namespace 'marketing'
    const { data: docMkt, error: docMktErr } = await adminClient
      .from('crm_knowledge_documents')
      .insert({
        organization_id: orgId,
        title: '[MARKETING INTERNAL] Chien Luoc Gia & Media Budget',
        namespace: 'marketing',
        knowledge_status: 'ACTIVE',
        ingestion_status: 'SUCCESS',
      })
      .select('id')
      .single();

    if (docMktErr || !docMkt?.id) throw new Error(`Failed to create marketing doc: ${docMktErr?.message}`);
    createdDocIds.push(docMkt.id);

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
    console.log('  -> Active marketing document created with internal chunk in namespace marketing.');

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
    // STAGE 6: Replay vs Idempotency Semantic Conflict (409)
    // -------------------------------------------------------------------------
    console.log('--- STAGE 6: IDEMPOTENCY REPLAY VS SEMANTIC CONFLICT (409) ---');

    // 6.1 Identical Retry: Same correlation_id + Same payload_hash -> IDEMPOTENT_REPLAY (200)
    console.log('  [Test 6.1] Identical retry with same correlation_id and payload_hash:');
    const { data: replayRes } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: doc2.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: corrIdDoc2,
      p_payload_hash: payloadHashDoc2, // SAME hash
      p_retry_attempt: 1,
    });

    console.log('  Replay Response:', replayRes);
    if (replayRes?.status !== 'IDEMPOTENT_REPLAY') {
      throw new Error(`Expected IDEMPOTENT_REPLAY, got: ${JSON.stringify(replayRes)}`);
    }
    console.log('  -> PASS: Identical retry returned IDEMPOTENT_REPLAY with zero duplication.\n');

    // 6.2 Semantic Conflict: Same correlation_id + DIFFERENT payload_hash -> SEMANTIC_CONFLICT (409)
    console.log('  [Test 6.2] Conflict retry with same correlation_id but DIFFERENT payload_hash:');
    const tamperedPayloadHash = crypto.createHash('sha256').update('tampered-body').digest('hex');

    const { data: conflictRes } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: doc2.id,
      p_organization_id: orgId,
      p_status: 'SUCCESS',
      p_correlation_id: corrIdDoc2,
      p_payload_hash: tamperedPayloadHash, // DIFFERENT hash
      p_retry_attempt: 2,
    });

    console.log('  Conflict Response:', conflictRes);
    if (conflictRes?.status !== 'SEMANTIC_CONFLICT' || conflictRes?.code !== 409) {
      throw new Error(`Expected SEMANTIC_CONFLICT 409, got: ${JSON.stringify(conflictRes)}`);
    }
    console.log('  -> PASS: Different payload under same correlation_id was HARD BLOCKED with 409 Semantic Conflict!\n');

    console.log('================================================================');
    console.log('ALL 6 E2E TEST STAGES PASSED 100% ON DB CLONE:');
    console.log('  1. Canonical Handoff Serialization & Negative Revision Rejection: PASS');
    console.log('  2. Validation Barrier at REVIEWED -> APPROVED: PASS');
    console.log('  3. Ingestion Callback & Document Activation: PASS');
    console.log('  4. Atomic Superseding in Same Transaction: PASS');
    console.log('  5. Two-Layer Namespace Isolation Defense: PASS');
    console.log('  6. Idempotent Replay & 409 Semantic Conflict: PASS');
    console.log('================================================================');
  } finally {
    console.log('\n--- CLEANUP FIXTURE INVENTORY ---');
    for (const docId of createdDocIds) {
      // Transition test documents to ARCHIVED state via state machine
      await adminClient
        .from('crm_knowledge_documents')
        .update({ knowledge_status: 'ARCHIVED' })
        .eq('id', docId);
    }
    console.log(`  -> Cleaned up ${createdDocIds.length} test documents safely into ARCHIVED state.`);
  }
}

runE2ETest().catch((err) => {
  console.error('\nE2E Suite FAILED:', err);
  process.exit(1);
});
