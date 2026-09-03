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
  console.log('PRODUCTION ZERO-MUTATION PREFLIGHT & READ-ONLY VERIFICATION');
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

  // -------------------------------------------------------------------------
  // SECTION 1: Production Preflight Data Integrity Check
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: PRODUCTION PREFLIGHT DATA INTEGRITY ---');

  // 1.1 Document Tenant Validity & Distribution
  console.log('[Preflight 1] Verifying Production Document Distribution & Organization IDs:');
  const { data: docs, error: docErr } = await adminClient
    .from('crm_knowledge_documents')
    .select('id, organization_id, knowledge_status, ingestion_status');

  if (docErr) throw new Error(`Preflight 1 FAILED: Could not query crm_knowledge_documents: ${docErr.message}`);

  const totalDocs = docs?.length || 0;
  const invalidOrgs = docs?.filter(d => !d.organization_id) || [];
  const activeDocs = docs?.filter(d => d.knowledge_status === 'ACTIVE') || [];
  const reviewedDocs = docs?.filter(d => d.knowledge_status === 'REVIEWED') || [];

  console.log(`  Total Documents on Production: ${totalDocs}`);
  console.log(`  Invalid organization_id count: ${invalidOrgs.length}`);
  console.log(`  Distribution: REVIEWED=${reviewedDocs.length}, ACTIVE=${activeDocs.length}`);

  if (invalidOrgs.length > 0) {
    throw new Error(`Preflight 1 FAILED: Found ${invalidOrgs.length} documents with missing organization_id!`);
  }
  if (activeDocs.length > 0) {
    throw new Error(`Preflight 1 FAILED: Zero-Trust violation: Found ${activeDocs.length} ACTIVE documents without approved ingestion!`);
  }
  console.log('  -> PASS: All documents have valid organization_id; 0 ACTIVE documents (Zero-Trust boundary preserved)\n');

  // 1.2 Audit Log Anomalies (Orphans, Missing Correlation, Negative Retries)
  console.log('[Preflight 2] Verifying Audit Log Anomalies (Orphans, Correlations, Retries):');
  const { data: audits, error: auditErr } = await adminClient
    .from('crm_knowledge_audit_logs')
    .select('id, document_id, organization_id, action, correlation_id, retry_attempt');

  if (auditErr) throw new Error(`Preflight 2 FAILED: Could not query crm_knowledge_audit_logs: ${auditErr.message}`);

  const totalAudits = audits?.length || 0;
  const orphanAudits = audits?.filter(a => !a.document_id || !a.organization_id) || [];
  const missingCorrAudits = audits?.filter(a => a.action?.startsWith('INGESTION_') && !a.correlation_id) || [];
  const negRetryAudits = audits?.filter(a => a.retry_attempt < 0) || [];

  console.log(`  Total Audit Rows: ${totalAudits}`);
  console.log(`  Orphan Audits: ${orphanAudits.length}`);
  console.log(`  Missing Correlation on Ingestion: ${missingCorrAudits.length}`);
  console.log(`  Negative retry_attempt: ${negRetryAudits.length}`);

  if (orphanAudits.length > 0 || missingCorrAudits.length > 0 || negRetryAudits.length > 0) {
    throw new Error('Preflight 2 FAILED: Audit log anomalies detected on Production!');
  }
  console.log('  -> PASS: Zero audit anomalies detected (0 orphans, 0 missing correlation, 0 negative retries)\n');

  // -------------------------------------------------------------------------
  // SECTION 2: RPC Access-Control Execution Boundary (Zero Mutation)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 2: RPC ACCESS-CONTROL EXECUTION BOUNDARY ---');

  // 2.1 match_documents RPC Execution Boundary (Exact 42501 for Anon)
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
    throw new Error(`Smoke 1 FAILED: Expected exact code 42501 for anon caller, got ${JSON.stringify(anonErr)}`);
  }

  // 2.2 apply_knowledge_ingestion_callback Execution Boundary (Exact 42501 for Anon)
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

  // 2.3 get_auth_user_organizations Execution Boundary (Exact 42501 or Zero Leakage for Anon)
  console.log('[Smoke 3] Verifying get_auth_user_organizations helper (Zero Leakage for Unauthenticated):');
  const { data: anonOrgs, error: helperAnonErr } = await publicClient.rpc('get_auth_user_organizations');
  console.log('  Anon Authorized Orgs:', anonOrgs, 'Error:', helperAnonErr?.message || 'None');
  if (!anonOrgs || anonOrgs.length === 0 || helperAnonErr?.code === '42501') {
    console.log('  -> PASS: Unauthenticated caller has 0 authorized organizations (Zero Tenant Leakage)\n');
  } else {
    throw new Error(`Smoke 3 FAILED: Unexpected organizations leaked to unauthenticated caller: ${JSON.stringify(anonOrgs)}`);
  }

  // 2.4 Service Role Vector Search Execution (Must Succeed)
  console.log('[Smoke 4] Verifying Service Role caller can execute match_documents:');
  const { error: sErr } = await adminClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 1,
    filter: { organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160', namespace: 'cskh' },
  });

  if (sErr) {
    throw new Error(`Smoke 4 FAILED: Service role RPC failed: ${sErr.message}`);
  }
  console.log('  -> PASS: Service role successfully executed match_documents (zero-mutation read)\n');

  // -------------------------------------------------------------------------
  // SECTION 3: Migration Schema & Column Integrity
  // -------------------------------------------------------------------------
  console.log('--- SECTION 3: MIGRATION 1 & 2 SCHEMA VERIFICATION ---');
  console.log('[Smoke 5] Verifying Schema Columns for Migration 1 (v1.1) and Migration 2 (callback RPC):');
  const { data: docCols, error: docColErr } = await adminClient
    .from('crm_knowledge_documents')
    .select('id, knowledge_status, ingestion_status, idempotency_key')
    .limit(1);
  if (docColErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_documents missing migration 1 columns: ${docColErr.message}`);

  const { data: auditCols, error: auditColErr } = await adminClient
    .from('crm_knowledge_audit_logs')
    .select('id, payload_hash, correlation_id, action')
    .limit(1);
  if (auditColErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_audit_logs missing migration 2 columns: ${auditColErr.message}`);

  const { data: chunkCols, error: chunkColErr } = await adminClient
    .from('crm_knowledge_chunks')
    .select('id, organization_id, document_id')
    .limit(1);
  if (chunkColErr) throw new Error(`Smoke 5 FAILED: crm_knowledge_chunks query failed: ${chunkColErr.message}`);

  console.log('  -> PASS: All migration 1 & 2 schema columns verified (knowledge_status, ingestion_status, idempotency_key, payload_hash)\n');

  console.log('================================================================');
  console.log('ALL PRODUCTION PREFLIGHT CHECKS AND SMOKE TESTS PASSED 100%!');
  console.log('Production Environment Confirmed Fully Compliant with Zero-Trust.');
  console.log('================================================================');
}

runProdReadonlySmokeTest().catch((err) => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
