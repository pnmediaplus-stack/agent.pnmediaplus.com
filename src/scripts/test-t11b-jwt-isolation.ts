import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
const publicClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

async function testT11bJwtIsolation() {
  console.log('================================================================');
  console.log('T11b: RPC ACCESS-CONTROL & FULL MULTI-TENANT RLS REGRESSION TEST');
  console.log('Target Supabase:', supabaseUrl);
  console.log('Scope: RPC Access Boundary + Comprehensive RLS Multi-Tenant Isolation');
  console.log('================================================================\n');

  const zeroVector = Array(1536).fill(0.0);
  const targetOrgBId = 'aaaaaaaa-cccc-cccc-cccc-000000000002'; // Target foreign Org B

  // 1. Authenticate real user session dynamically via OTP verification (pnmediaplus@gmail.com)
  console.log('[Setup] Authenticating real user session via OTP exchange (pnmediaplus@gmail.com)...');
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'pnmediaplus@gmail.com',
  });

  if (linkRes.error || !linkRes.data?.properties?.email_otp) {
    throw new Error(`Failed to generate magiclink for test user: ${linkRes.error?.message}`);
  }

  const { data: authData, error: authErr } = await publicClient.auth.verifyOtp({
    email: 'pnmediaplus@gmail.com',
    token: linkRes.data.properties.email_otp,
    type: 'email',
  });

  if (authErr || !authData?.session?.access_token || !authData?.user?.id) {
    throw new Error(`Failed to verify OTP session: ${authErr?.message}`);
  }

  const realUserJwt = authData.session.access_token;
  const verifiedUserId = authData.user.id;

  // Retrieve user organization membership
  const { data: memberRows } = await adminClient
    .from('portal_organization_memberships')
    .select('organization_id, role')
    .eq('user_id', verifiedUserId);

  const userOrgId = memberRows?.[0]?.organization_id || 'aaaaaaaa-cccc-cccc-cccc-000000000001';

  console.log(`  -> User verified: id=${verifiedUserId} | Member of Org A: ${userOrgId}`);
  console.log('  -> Real User Access Token (JWT) acquired successfully.\n');

  // =========================================================================
  // SECTION 1: RPC Access Control Execution Boundary
  // =========================================================================
  console.log('--- SECTION 1: RPC ACCESS-CONTROL EXECUTION BOUNDARY ---');

  // 1.1 Service Role Access (Expected: Permitted)
  console.log('[Test T11b.1] Trusted service_role executing match_documents:');
  const { data: serviceData, error: serviceErr } = await adminClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 5,
    filter: { organization_id: userOrgId, namespace: 'cskh' },
  });

  if (serviceErr) {
    throw new Error(`T11b.1 FAILED: Service role RPC test returned error: ${serviceErr.message}`);
  }
  console.log('  -> PASS: Trusted service_role successfully executes match_documents. Returned rows:', Array.isArray(serviceData) ? serviceData.length : 0, '\n');

  // 1.2 Public / Anon Key Caller Probe (Expected: Hard Blocked)
  console.log('[Test T11b.2] Public/Anon Client attempting to execute match_documents:');
  const anonClient = createClient(supabaseUrl, anonKey);
  const { error: anonErr } = await anonClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 5,
    filter: { organization_id: targetOrgBId, namespace: 'cskh' },
  });

  console.log('  Error returned for Anon:', anonErr?.message || 'None', `(Code: ${anonErr?.code})`);
  if (anonErr && (anonErr.message?.includes('permission denied') || anonErr.code === '42501')) {
    console.log('  -> PASS: Public/Anon caller is HARD BLOCKED from match_documents (42501 permission denied)\n');
  } else {
    throw new Error(`T11b.2 FAILED: Expected 42501 permission denied for anon client, got ${JSON.stringify(anonErr)}`);
  }

  // 1.3 Authenticated User JWT Caller Probe (Expected: Hard Blocked)
  console.log('[Test T11b.3] Authenticated User JWT Client attempting to execute match_documents:');
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${realUserJwt}` } },
  });

  const { error: userErr } = await userClient.rpc('match_documents', {
    query_embedding: zeroVector,
    match_count: 5,
    filter: { organization_id: targetOrgBId, namespace: 'cskh' },
  });

  console.log('  Error returned for User JWT:', userErr?.message || 'None', `(Code: ${userErr?.code})`);
  if (userErr && (userErr.message?.includes('permission denied') || userErr.code === '42501')) {
    console.log('  -> PASS: Authenticated User JWT is HARD BLOCKED from executing match_documents (42501 permission denied)\n');
  } else {
    throw new Error(`T11b.3 FAILED: Expected 42501 permission denied for user client, got ${JSON.stringify(userErr)}`);
  }

  // 1.4 Direct PostgREST HTTP REST API Probe with Real Bearer JWT
  console.log('[Test T11b.4] Direct PostgREST HTTP probe with Real Bearer JWT Token:');
  const restRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_documents`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${realUserJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query_embedding: zeroVector,
      match_count: 5,
      filter: { organization_id: targetOrgBId, namespace: 'cskh' },
    }),
  });

  console.log('  HTTP Response Status:', restRes.status);
  const restText = await restRes.text();
  console.log('  HTTP Response Body:', restText);

  if (restRes.status === 401 || restRes.status === 403 || restText.includes('permission denied') || restText.includes('42501')) {
    console.log('  -> PASS: Direct PostgREST HTTP probe with Real Bearer JWT is HARD BLOCKED! (HTTP 401/403 Permission Denied)\n');
  } else {
    throw new Error(`T11b.4 FAILED: Expected HTTP 401/403 Permission Denied, got HTTP ${restRes.status}`);
  }

  // =========================================================================
  // SECTION 2: Comprehensive Multi-Tenant RLS Policy Regression Test
  // =========================================================================
  console.log('--- SECTION 2: MULTI-TENANT RLS REGRESSION VERIFICATION ---');

  // 2.1 Call get_auth_user_organizations() helper: Must return ONLY Org A, NEVER Org B
  console.log('[Test T11b.5] Calling get_auth_user_organizations() as Authenticated User:');
  const { data: userOrgs, error: helperErr } = await userClient.rpc('get_auth_user_organizations');
  if (helperErr) {
    throw new Error(`T11b.5 FAILED: get_auth_user_organizations helper returned error: ${helperErr.message}`);
  }
  console.log('  -> User Authorized Organizations returned:', userOrgs);
  if (!userOrgs || userOrgs.includes(targetOrgBId)) {
    throw new Error(`T11b.5 CRITICAL FAIL: Helper unexpectedly leaked foreign Org B (${targetOrgBId}) to user!`);
  }
  console.log('  -> PASS: Helper strictly returned user authorized tenants, zero cross-tenant leakage!\n');

  // 2.2 Table 1: crm_knowledge_documents RLS isolation
  console.log('[Test T11b.6] Verifying crm_knowledge_documents RLS isolation:');
  const { data: ownDocs } = await userClient.from('crm_knowledge_documents').select('id').eq('organization_id', userOrgId);
  const { data: foreignDocs } = await userClient.from('crm_knowledge_documents').select('id').eq('organization_id', targetOrgBId);
  console.log(`  -> Own documents read: ${ownDocs?.length ?? 0} | Foreign (Org B) documents read: ${foreignDocs?.length ?? 0} (Expected: 0)`);
  if ((foreignDocs?.length ?? 0) > 0) {
    throw new Error(`T11b.6 CRITICAL FAIL: User of Org A was able to read ${foreignDocs?.length} documents from Org B!`);
  }
  console.log('  -> PASS: crm_knowledge_documents RLS blocked 100% of Org B documents.\n');

  // 2.3 Table 2: crm_knowledge_chunks RLS isolation
  console.log('[Test T11b.7] Verifying crm_knowledge_chunks RLS isolation:');
  const { data: foreignChunks } = await userClient.from('crm_knowledge_chunks').select('id').eq('organization_id', targetOrgBId);
  console.log(`  -> Foreign (Org B) chunks read: ${foreignChunks?.length ?? 0} (Expected: 0)`);
  if ((foreignChunks?.length ?? 0) > 0) {
    throw new Error(`T11b.7 CRITICAL FAIL: User of Org A was able to read ${foreignChunks?.length} chunks from Org B!`);
  }
  console.log('  -> PASS: crm_knowledge_chunks RLS blocked 100% of Org B chunks.\n');

  // 2.4 Table 3: crm_knowledge_audit_logs RLS isolation
  console.log('[Test T11b.8] Verifying crm_knowledge_audit_logs RLS isolation:');
  const { data: foreignAudits } = await userClient.from('crm_knowledge_audit_logs').select('id').eq('organization_id', targetOrgBId);
  console.log(`  -> Foreign (Org B) audit logs read: ${foreignAudits?.length ?? 0} (Expected: 0)`);
  if ((foreignAudits?.length ?? 0) > 0) {
    throw new Error(`T11b.8 CRITICAL FAIL: User of Org A was able to read ${foreignAudits?.length} audit logs from Org B!`);
  }
  console.log('  -> PASS: crm_knowledge_audit_logs RLS blocked 100% of Org B audit logs.\n');

  console.log('================================================================');
  console.log('T11b COMPLETE VERIFICATION PASSED 100%:');
  console.log('  1. RPC Execution Access Boundary: Protected (42501)');
  console.log('  2. Multi-Tenant Helper get_auth_user_organizations: Isolated');
  console.log('  3. crm_knowledge_documents RLS: Zero-Leakage (0 rows from Org B)');
  console.log('  4. crm_knowledge_chunks RLS: Zero-Leakage (0 rows from Org B)');
  console.log('  5. crm_knowledge_audit_logs RLS: Zero-Leakage (0 rows from Org B)');
  console.log('================================================================');
}

testT11bJwtIsolation().catch((err) => {
  console.error('T11b Test Failed:', err);
  process.exit(1);
});
