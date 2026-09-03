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

// Canonical Test Org B UUID from security test suite
const targetOrgBId = 'aaaaaaaa-cccc-cccc-cccc-000000000002';

async function runProdReadonlySmokeTest() {
  console.log('================================================================');
  console.log('PRODUCTION ZERO-MUTATION VERIFICATION & STRICT CATALOG PROBE');
  console.log('Target Environment: PRODUCTION');
  console.log('Target Supabase URL:', supabaseUrl);
  console.log('Target Org B UUID:', targetOrgBId);
  console.log('Mode: Strictly Read-Only / Zero Business Mutation / Hard Failure on Any Error');
  console.log('================================================================\n');

  const zeroVector = Array(1536).fill(0.0);
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const publicClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  // -------------------------------------------------------------------------
  // SECTION 1: Production Preflight Data Integrity & Root Organization Existence
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: PRODUCTION PREFLIGHT DATA INTEGRITY & ROOT ORGANIZATIONS ---');

  // 1.1 Document Tenant Validity & Distribution
  console.log('[Preflight 1] Verifying Production Documents & Distinct Organization IDs:');
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

  // 1.2 Verify ALL distinct organization_ids exist and are active in root table portal_organizations
  const distinctDocOrgs = Array.from(new Set(docs?.map(d => d.organization_id) || []));
  console.log(`  Distinct document organizations found: ${JSON.stringify(distinctDocOrgs)}`);

  const { data: rootOrgs, error: rootOrgsErr } = await adminClient
    .from('portal_organizations')
    .select('organization_id, status');

  if (rootOrgsErr) throw new Error(`Preflight 1 FAILED: Could not query root table portal_organizations: ${rootOrgsErr.message}`);

  console.log(`  Total organizations in root table portal_organizations: ${rootOrgs?.length}`);
  const activeRootOrgSet = new Set(rootOrgs?.filter(o => o.status === 'active').map(o => o.organization_id) || []);
  for (const orgId of distinctDocOrgs) {
    if (!activeRootOrgSet.has(orgId)) {
      throw new Error(`Preflight 1 FAILED: Document organization_id ${orgId} does NOT exist or is NOT active in root portal_organizations!`);
    }
  }
  console.log('  -> PASS: 100% of distinct document organizations verified active in root portal_organizations.\n');

  // 1.3 Audit Log Anomalies & Strict Tenant Mismatch JOIN
  console.log('[Preflight 2] Verifying Audit Log Anomalies & Strict Tenant Mismatch JOIN:');
  const { data: audits, error: auditErr } = await adminClient
    .from('crm_knowledge_audit_logs')
    .select('id, document_id, organization_id, action, correlation_id, retry_attempt');

  if (auditErr) throw new Error(`Preflight 2 FAILED: Could not query crm_knowledge_audit_logs: ${auditErr.message}`);

  const totalAudits = audits?.length || 0;
  const docIdToOrgMap = new Map(docs?.map(d => [d.id, d.organization_id]) || []);

  // Strict check: if document_id does not exist in crm_knowledge_documents, it is an orphan!
  const orphanAudits = audits?.filter(a => !a.document_id || !a.organization_id || !docIdToOrgMap.has(a.document_id)) || [];
  const missingCorrAudits = audits?.filter(a => a.action?.startsWith('INGESTION_') && !a.correlation_id) || [];
  const negRetryAudits = audits?.filter(a => a.retry_attempt < 0) || [];
  
  // Strict JOIN check: compare audit.organization_id with the real document.organization_id
  const tenantMismatchAudits = audits?.filter(a => {
    const realDocOrg = docIdToOrgMap.get(a.document_id);
    return realDocOrg && realDocOrg !== a.organization_id;
  }) || [];

  console.log(`  Total Audit Rows: ${totalAudits}`);
  console.log(`  Orphan Audits (missing doc or null): ${orphanAudits.length}`);
  console.log(`  Missing Correlation on Ingestion: ${missingCorrAudits.length}`);
  console.log(`  Negative retry_attempt: ${negRetryAudits.length}`);
  console.log(`  Tenant Mismatch (JOIN audit to document): ${tenantMismatchAudits.length}`);

  if (orphanAudits.length > 0 || missingCorrAudits.length > 0 || negRetryAudits.length > 0 || tenantMismatchAudits.length > 0) {
    throw new Error('Preflight 2 FAILED: Audit log anomalies detected on Production!');
  }
  console.log('  -> PASS: Zero audit anomalies detected (0 orphans, 0 missing correlation, 0 negative retries, 0 tenant mismatches)\n');

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
    filter: { organization_id: distinctDocOrgs[0], namespace: 'cskh' },
  });

  if (sErr) {
    throw new Error(`Smoke 4 FAILED: Service role RPC failed: ${sErr.message}`);
  }
  console.log('  -> PASS: Service role successfully executed match_documents (zero-mutation read)\n');

  // -------------------------------------------------------------------------
  // SECTION 3: Authenticated User JWT Multi-Tenant RLS Read-Only Probe
  // -------------------------------------------------------------------------
  console.log('--- SECTION 3: AUTHENTICATED USER JWT MULTI-TENANT RLS READ-ONLY PROBE ---');
  console.log('[RLS 1] Authenticating Owner Session Server-Side (Zero Email / Read-Only Probe):');
  const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'pnmediaplus@gmail.com',
  });

  if (linkErr || !link?.properties?.hashed_token) {
    throw new Error(`RLS 1 FAILED: Could not generate local verification token: ${linkErr?.message}`);
  }

  const { data: sess, error: sessErr } = await publicClient.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: 'magiclink',
  });

  if (sessErr || !sess?.session?.access_token || !sess?.user) {
    throw new Error(`RLS 1 FAILED: Could not acquire authenticated session: ${sessErr?.message}`);
  }

  const currentUserId = sess.user.id;
  console.log(`  User ID verified: ${currentUserId}`);

  // 3.1 Directly cross-examine helper output with real user active memberships in portal_organization_memberships
  const { data: userMemberships, error: uMemErr } = await adminClient
    .from('portal_organization_memberships')
    .select('organization_id, status')
    .eq('user_id', currentUserId)
    .eq('status', 'active');

  if (uMemErr) throw new Error(`RLS 1 FAILED: Could not query user memberships: ${uMemErr.message}`);

  const expectedUserOrgs = userMemberships?.map(m => m.organization_id).sort() || [];
  console.log(`  Expected Active User Organizations in Membership Table: ${JSON.stringify(expectedUserOrgs)}`);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } },
    auth: { persistSession: false },
  });

  const { data: userOrgs, error: uHelperErr } = await userClient.rpc('get_auth_user_organizations');
  if (uHelperErr) throw new Error(`RLS 1 FAILED: User could not call get_auth_user_organizations: ${uHelperErr.message}`);

  const returnedUserOrgs = (userOrgs || []).slice().sort();
  console.log(`  Organizations returned by helper get_auth_user_organizations: ${JSON.stringify(returnedUserOrgs)}`);

  if (JSON.stringify(expectedUserOrgs) !== JSON.stringify(returnedUserOrgs)) {
    throw new Error(`RLS 1 CRITICAL FAIL: Helper returned ${JSON.stringify(returnedUserOrgs)}, but active memberships are ${JSON.stringify(expectedUserOrgs)}!`);
  }
  console.log('  -> PASS: Helper get_auth_user_organizations EXACTLY matches active memberships for current user.\n');

  // 3.2 Determine expected own documents count vs unauthorized tenants
  const userTenantDocs = docs?.filter(d => expectedUserOrgs.includes(d.organization_id)) || [];
  console.log('[RLS 2] Verifying crm_knowledge_documents Multi-Tenant Isolation:');
  const { data: ownDocs, error: ownDocsErr } = await userClient.from('crm_knowledge_documents').select('id');
  if (ownDocsErr) {
    throw new Error(`RLS 2 HARD FAIL: Authenticated user cannot read own documents under RLS: ${ownDocsErr.message} (Hint: Apply updated migration 20260904000001 with GRANT SELECT TO authenticated)`);
  }
  console.log(`  Own Documents Read by User: ${ownDocs?.length} (Expected: ${userTenantDocs.length} matching user tenants)`);
  if (ownDocs?.length !== userTenantDocs.length) {
    throw new Error(`RLS 2 FAILED: Expected ${userTenantDocs.length} documents matching user tenants, got ${ownDocs?.length}`);
  }
  console.log('  -> PASS: User read exactly all documents belonging to their authorized tenant(s).\n');

  // 3.3 Verify RLS isolation against ALL unauthorized tenants across documents, chunks, and audit logs
  const allKnownOrgs = Array.from(new Set([
    ...distinctDocOrgs,
    ...rootOrgs?.map(o => o.organization_id) || [],
    targetOrgBId
  ]));
  const unauthorizedOrgs = allKnownOrgs.filter(orgId => !expectedUserOrgs.includes(orgId));
  console.log(`[RLS 3] Probing ALL Unauthorized Tenants (${unauthorizedOrgs.length} tenant(s)):`, unauthorizedOrgs);

  for (const unauthOrgId of unauthorizedOrgs) {
    // Documents probe
    const { data: foreignDocs, error: foreignDocsErr } = await userClient.from('crm_knowledge_documents').select('id').eq('organization_id', unauthOrgId);
    if (foreignDocsErr) {
      throw new Error(`RLS 3 HARD FAIL: Query for documents of tenant ${unauthOrgId} returned error: ${foreignDocsErr.message}`);
    }
    console.log(`  Tenant ${unauthOrgId} -> Documents Read: ${foreignDocs?.length} (Expected: 0, error: null)`);
    if ((foreignDocs?.length || 0) > 0) {
      throw new Error(`RLS 3 CRITICAL FAIL: Leaked documents from unauthorized tenant ${unauthOrgId}!`);
    }

    // Chunks probe
    const { data: foreignChunks, error: foreignChunksErr } = await userClient.from('crm_knowledge_chunks').select('id').eq('organization_id', unauthOrgId);
    if (foreignChunksErr) {
      throw new Error(`RLS 3 HARD FAIL: Query for chunks of tenant ${unauthOrgId} returned error: ${foreignChunksErr.message}`);
    }
    console.log(`  Tenant ${unauthOrgId} -> Chunks Read: ${foreignChunks?.length} (Expected: 0, error: null)`);
    if ((foreignChunks?.length || 0) > 0) {
      throw new Error(`RLS 3 CRITICAL FAIL: Leaked chunks from unauthorized tenant ${unauthOrgId}!`);
    }

    // Audit logs probe
    const { data: foreignAudits, error: foreignAuditsErr } = await userClient.from('crm_knowledge_audit_logs').select('id').eq('organization_id', unauthOrgId);
    if (foreignAuditsErr) {
      throw new Error(`RLS 3 HARD FAIL: Query for audit logs of tenant ${unauthOrgId} returned error: ${foreignAuditsErr.message}`);
    }
    console.log(`  Tenant ${unauthOrgId} -> Audit Logs Read: ${foreignAudits?.length} (Expected: 0, error: null)`);
    if ((foreignAudits?.length || 0) > 0) {
      throw new Error(`RLS 3 CRITICAL FAIL: Leaked audit logs from unauthorized tenant ${unauthOrgId}!`);
    }
  }
  console.log('  -> PASS: All unauthorized tenants blocked with 0 rows and zero query errors across documents, chunks, and audit logs.\n');

  // -------------------------------------------------------------------------
  // SECTION 4: PostgreSQL Catalog Security Verification (SECURITY DEFINER, RLS, Indexes)
  // -------------------------------------------------------------------------
  console.log('--- SECTION 4: POSTGRESQL CATALOG SECURITY VERIFICATION ---');
  console.log('[Catalog 1] Verifying System Objects via verify_knowledge_security_catalog:');
  const { data: catReport, error: catErr } = await adminClient.rpc('verify_knowledge_security_catalog');

  if (catErr) {
    throw new Error(`Catalog 1 HARD FAIL: verify_knowledge_security_catalog failed or missing on Production: ${catErr.message}`);
  }
  if (!catReport) {
    throw new Error('Catalog 1 HARD FAIL: Catalog verifier returned null report!');
  }

  console.log('  Catalog Inspection Report:');
  console.log('    RLS Enabled on Tables:', catReport.rls_enabled);
  console.log('    Idempotency Unique Index Details:', catReport.idempotency_index);
  console.log('    Functions Verified:', catReport.functions?.map((f: any) => `${f.name}(${f.args}) [secdef: ${f.secdef}, config: ${f.config}]`));
  console.log('    Triggers Verified:', catReport.triggers);
  console.log('    Policies Verified Count:', catReport.policies?.length);

  // 4.1 Strict assertion: RLS enabled on all 3 tables in schema public
  if (catReport.rls_enabled?.crm_knowledge_documents !== true || catReport.rls_enabled?.crm_knowledge_chunks !== true || catReport.rls_enabled?.crm_knowledge_audit_logs !== true) {
    throw new Error(`Catalog 1 FAILED: RLS is not enabled on all 3 tables: ${JSON.stringify(catReport.rls_enabled)}`);
  }
  console.log('  -> PASS: relrowsecurity = true on all 3 knowledge tables in public schema.');

  // 4.2 Strict assertion: RLS Policies exist and enforce get_auth_user_organizations() on all 3 tables
  const policyList = catReport.policies || [];
  for (const targetTbl of ['crm_knowledge_documents', 'crm_knowledge_chunks', 'crm_knowledge_audit_logs']) {
    const tblPolicies = policyList.filter((p: any) => p.table === targetTbl);
    if (tblPolicies.length === 0) {
      throw new Error(`Catalog 1 FAILED: No RLS policies found for table ${targetTbl}!`);
    }
    const hasTenantHelperQual = tblPolicies.some((p: any) => p.qual && p.qual.includes('get_auth_user_organizations()'));
    if (!hasTenantHelperQual) {
      throw new Error(`Catalog 1 FAILED: Table ${targetTbl} policies do NOT contain get_auth_user_organizations() qualifier! Got: ${JSON.stringify(tblPolicies)}`);
    }
  }
  console.log('  -> PASS: RLS policies verified on all 3 tables with strict get_auth_user_organizations() tenant-safe qualifiers.');

  // 4.3 Strict assertion: Idempotency unique index exists, is unique, and has correct key columns
  if (!catReport.idempotency_index?.exists || !catReport.idempotency_index?.is_unique) {
    throw new Error(`Catalog 1 FAILED: Unique index idx_crm_knowledge_audit_idemp is missing or not unique! Report: ${JSON.stringify(catReport.idempotency_index)}`);
  }
  const indexDef: string = catReport.idempotency_index?.indexdef || '';
  if (!indexDef.includes('(document_id, action, correlation_id)')) {
    throw new Error(`Catalog 1 FAILED: Index definition does not match (document_id, action, correlation_id)! Got: ${indexDef}`);
  }
  console.log('  -> PASS: Unique index idx_crm_knowledge_audit_idemp confirmed UNIQUE ON (document_id, action, correlation_id).');

  // 4.4 Strict assertion: Exactly 1 function per name, prosecdef = true, search_path fixed
  const fnList = catReport.functions || [];
  for (const requiredFn of ['get_auth_user_organizations', 'crm_knowledge_state_machine', 'apply_knowledge_ingestion_callback']) {
    const matchingFns = fnList.filter((f: any) => f.name === requiredFn);
    if (matchingFns.length === 0) {
      throw new Error(`Catalog 1 FAILED: Function ${requiredFn} is missing in public schema!`);
    }
    if (matchingFns.length > 1) {
      throw new Error(`Catalog 1 FAILED: Ambiguous overload detected for function ${requiredFn} (${matchingFns.length} overloads found)!`);
    }
    const fnObj = matchingFns[0];
    if (fnObj.secdef !== true) {
      throw new Error(`Catalog 1 FAILED: Function ${requiredFn} is NOT SECURITY DEFINER!`);
    }
    if (!fnObj.config || !fnObj.config.includes('search_path=pg_catalog, public')) {
      throw new Error(`Catalog 1 FAILED: Function ${requiredFn} does NOT have fixed search_path=pg_catalog, public! Got: ${fnObj.config}`);
    }
  }
  console.log('  -> PASS: All 3 security-critical functions verified with zero overloads, prosecdef = true, and fixed search_path = pg_catalog, public.');

  // 4.5 Strict assertion: Triggers mapped correctly to tables and functions
  const trigList = catReport.triggers || [];
  const smTrigger = trigList.find((t: any) => t.trigger_name === 'trg_crm_knowledge_state_machine');
  if (!smTrigger || smTrigger.table_name !== 'crm_knowledge_documents' || smTrigger.proc_name !== 'crm_knowledge_state_machine') {
    throw new Error(`Catalog 1 FAILED: Trigger trg_crm_knowledge_state_machine mapping is invalid: ${JSON.stringify(smTrigger)}`);
  }
  const auditTrigger = trigList.find((t: any) => t.trigger_name === 'trg_crm_knowledge_audit_insert');
  if (!auditTrigger || auditTrigger.table_name !== 'crm_knowledge_documents' || auditTrigger.proc_name !== 'crm_knowledge_audit_trigger') {
    throw new Error(`Catalog 1 FAILED: Trigger trg_crm_knowledge_audit_insert mapping is invalid: ${JSON.stringify(auditTrigger)}`);
  }
  console.log('  -> PASS: State machine and audit triggers confirmed mapped to correct tables and procedure functions in public schema.\n');

  // Verify Schema Columns
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
  console.log('ALL PRODUCTION PREFLIGHT, STRICT RLS, AND CATALOG TESTS PASSED 100%!');
  console.log('Production Environment Confirmed Fully Compliant with Zero-Trust.');
  console.log('================================================================');
}

runProdReadonlySmokeTest().catch((err) => {
  console.error('Smoke Test Failed:', err);
  process.exit(1);
});
