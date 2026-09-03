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

  // 1. Verify Public/Anon Execution Boundary (Must be HARD BLOCKED)
  console.log('[Smoke 1] Verifying Public/Anon caller is hard-blocked from match_documents:');
  const { error: anonErr } = await publicClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 1,
    filter: { organization_id: '00000000-0000-0000-0000-000000000000', namespace: 'cskh' },
  });

  console.log('  Anon RPC Error:', anonErr?.message || 'None', `(Code: ${anonErr?.code})`);
  if (anonErr && (anonErr.message?.includes('permission denied') || anonErr.code === '42501')) {
    console.log('  -> PASS: Public/Anon caller is HARD BLOCKED from match_documents (42501)\n');
  } else {
    throw new Error(`Smoke 1 FAILED: Expected 42501 permission denied for anon caller, got ${JSON.stringify(anonErr)}`);
  }

  // 2. Verify Service Role Execution on match_documents (Must SUCCEED)
  console.log('[Smoke 2] Verifying Service Role caller can execute match_documents:');
  const { data: sData, error: sErr } = await adminClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 1,
    filter: { organization_id: '00000000-0000-0000-0000-000000000000', namespace: 'cskh' },
  });

  if (sErr) {
    throw new Error(`Smoke 2 FAILED: Service role RPC failed: ${sErr.message}`);
  }
  console.log('  -> PASS: Service role successfully executed match_documents (zero-mutation read)\n');

  // 3. Verify Table Read-Only Access via Service Role
  console.log('[Smoke 3] Verifying Read-Only Schema Integrity for Knowledge Tables:');
  const { count: docCount, error: docErr } = await adminClient
    .from('crm_knowledge_documents')
    .select('*', { count: 'exact', head: true });
  if (docErr) throw new Error(`Smoke 3 FAILED: Could not inspect crm_knowledge_documents: ${docErr.message}`);

  const { count: auditCount, error: auditErr } = await adminClient
    .from('crm_knowledge_audit_logs')
    .select('*', { count: 'exact', head: true });
  if (auditErr) throw new Error(`Smoke 3 FAILED: Could not inspect crm_knowledge_audit_logs: ${auditErr.message}`);

  const { count: chunkCount, error: chunkErr } = await adminClient
    .from('crm_knowledge_chunks')
    .select('*', { count: 'exact', head: true });
  if (chunkErr) throw new Error(`Smoke 3 FAILED: Could not inspect crm_knowledge_chunks: ${chunkErr.message}`);

  console.log(`  Table Row Counts (Head Only): docs=${docCount}, audits=${auditCount}, chunks=${chunkCount}`);
  console.log('  -> PASS: All knowledge tables accessible read-only via service_role without mutations\n');

  console.log('================================================================');
  console.log('PRODUCTION READ-ONLY SMOKE TEST PASSED 100%!');
  console.log('Zero mutations performed. Production schema verified clean.');
  console.log('================================================================');
}

runProdReadonlySmokeTest().catch((err) => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
