import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

async function runProdReadonlySmokeTest() {
  console.log('================================================================');
  console.log('PRODUCTION READ-ONLY ZERO-MUTATION SMOKE TEST');
  console.log('Target Supabase:', supabaseUrl);
  console.log('Mode: Strictly Read-Only / Zero Data Mutation / No User OTPs');
  console.log('================================================================\n');

  const zeroVector = Array(1536).fill(0.0);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  // 1. Verify Public/Anon Execution Boundary on match_documents (Must be EXACT 42501)
  console.log('[Smoke 1] Verifying Public/Anon caller is hard-blocked from match_documents (Exact 42501):');
  const { error: anonErr } = await publicClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 1,
    filter: { organization_id: '00000000-0000-0000-0000-000000000000', namespace: 'cskh' },
  });

  console.log('  Anon RPC Error:', anonErr?.message || 'None', `(Code: ${anonErr?.code})`);
  if (anonErr && anonErr.code === '42501') {
    console.log('  -> PASS: Public/Anon caller is HARD BLOCKED from match_documents with exact 42501\n');
  } else {
    throw new Error(`Smoke 1 FAILED: Expected exact code 42501 permission denied for anon caller, got ${JSON.stringify(anonErr)}`);
  }

  // 2. Verify Public/Anon Execution Boundary on apply_knowledge_ingestion_callback (Must be EXACT 42501 - proves migration 2 applied)
  console.log('[Smoke 2] Verifying Public/Anon caller is hard-blocked from apply_knowledge_ingestion_callback (Exact 42501):');
  const { error: cbAnonErr } = await publicClient.rpc('apply_knowledge_ingestion_callback', {
    p_document_id: '00000000-0000-0000-0000-000000000000',
    p_organization_id: '00000000-0000-0000-0000-000000000000',
    p_status: 'SUCCESS',
    p_correlation_id: 'smoke-probe',
    p_payload_hash: 'probe',
  });

  console.log('  Anon Callback RPC Error:', cbAnonErr?.message || 'None', `(Code: ${cbAnonErr?.code})`);
  if (cbAnonErr && cbAnonErr.code === '42501') {
    console.log('  -> PASS: Callback RPC exists and is HARD BLOCKED from Public/Anon with exact 42501 (Migration 2 verified)\n');
  } else {
    throw new Error(`Smoke 2 FAILED: Expected exact code 42501 for anon callback RPC, got ${JSON.stringify(cbAnonErr)}`);
  }

  // 3. Verify get_auth_user_organizations helper returns zero organizations for unauthenticated caller
  console.log('[Smoke 3] Verifying get_auth_user_organizations helper (Zero Leakage for Unauthenticated):');
  const { data: anonOrgs, error: helperAnonErr } = await publicClient.rpc('get_auth_user_organizations');
  console.log('  Anon Authorized Orgs:', anonOrgs, 'Error:', helperAnonErr?.message || 'None');
  if (!anonOrgs || anonOrgs.length === 0 || helperAnonErr?.code === '42501') {
    console.log('  -> PASS: Unauthenticated caller has 0 authorized organizations (Zero Tenant Leakage)\n');
  } else {
    throw new Error(`Smoke 3 FAILED: Unexpected organizations leaked to unauthenticated caller: ${JSON.stringify(anonOrgs)}`);
  }

  // 4. Verify Service Role Execution on match_documents (Must SUCCEED)
  console.log('[Smoke 4] Verifying Service Role caller can execute match_documents:');
  const { data: sData, error: sErr } = await adminClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 1,
    filter: { organization_id: '00000000-0000-0000-0000-000000000000', namespace: 'cskh' },
  });

  if (sErr) {
    throw new Error(`Smoke 4 FAILED: Service role RPC failed: ${sErr.message}`);
  }
  console.log('  -> PASS: Service role successfully executed match_documents (zero-mutation read)\n');

  // 5. Verify Read-Only Schema Integrity & Column Existence (Proves Migration 1 & 2 applied)
  console.log('[Smoke 5] Verifying Read-Only Schema Integrity & Column Structure for Knowledge Tables:');
  const { data: docCols, error: docErr } = await adminClient
    .from('crm_knowledge_documents')
    .select('id, knowledge_status, ingestion_status, idempotency_key')
    .limit(1);
  if (docErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_documents missing migration 1 columns: ${docErr.message}`);

  const { data: auditCols, error: auditErr } = await adminClient
    .from('crm_knowledge_audit_logs')
    .select('id, payload_hash, correlation_id, action')
    .limit(1);
  if (auditErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_audit_logs missing migration 2 columns: ${auditErr.message}`);

  const { data: chunkCols, error: chunkErr } = await adminClient
    .from('crm_knowledge_chunks')
    .select('id, organization_id, document_id')
    .limit(1);
  if (chunkErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_chunks query failed: ${chunkErr.message}`);

  console.log('  -> PASS: All migration 1 & 2 schema columns verified (knowledge_status, ingestion_status, idempotency_key, payload_hash)\n');

  console.log('================================================================');
  console.log('PRODUCTION READ-ONLY SMOKE TEST PASSED 100%!');
  console.log('Zero mutations performed. Production schema verified clean.');
  console.log('================================================================');
}

runProdReadonlySmokeTest().catch((err) => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
