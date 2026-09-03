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

// -----------------------------------------------------------------------------
// STRICT ENVIRONMENT ALLOWLIST GUARD: ONLY permitted on DB Clone / Local
// -----------------------------------------------------------------------------
const ALLOWED_CLONE_HOSTS = [
  'ldhjrdihrcjsjfmrqtbi.supabase.co', // Authorized DB Clone
  '127.0.0.1',
  'localhost',
];

let targetHost = '';
try {
  targetHost = new URL(supabaseUrl).hostname;
} catch {
  targetHost = supabaseUrl;
}

const isAllowedHost = ALLOWED_CLONE_HOSTS.some(allowed => targetHost.includes(allowed));

if (!isAllowedHost) {
  console.error('================================================================');
  console.error(`⛔ HARD BLOCKED: Target environment (${targetHost}) is NOT on the`);
  console.error('allowed clone list! This regression suite contains mutation fixtures');
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

async function testT11bJwtIsolation() {
  console.log('================================================================');
  console.log('T11b: RPC ACCESS-CONTROL & FULL MULTI-TENANT RLS REGRESSION TEST');
  console.log('Target Environment: AUTHORIZED DB CLONE / STAGING ONLY');
  console.log('Target Supabase URL:', supabaseUrl);
  console.log('Scope: RPC Access Boundary + Real Foreign Tenant Data RLS Isolation + Append-Only Immutability');
  console.log('================================================================\n');

  const zeroVector = Array(1536).fill(0.0);
  const targetOrgBId = 'aaaaaaaa-cccc-cccc-cccc-000000000002'; // Target foreign Org B

  let realOrgBDocId: string | null = null;
  let isSeededDoc = false;
  let testAuditId: string | null = null;

  try {
    // 1. Authenticate real user session dynamically via OTP verification (pnmediaplus@gmail.com)
    console.log('[Setup 1] Authenticating real user session via OTP exchange (pnmediaplus@gmail.com)...');
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

    // 2. Retrieve user organization membership (Strict: ZERO Fallback)
    console.log('[Setup 2] Verifying User Active Membership in portal_organization_memberships:');
    const { data: memberRows, error: memErr } = await adminClient
      .from('portal_organization_memberships')
      .select('organization_id, role')
      .eq('user_id', verifiedUserId)
      .eq('status', 'active');

    if (memErr || !memberRows || memberRows.length === 0) {
      throw new Error(`T11b Setup FAILED: User ${verifiedUserId} has no active memberships in portal_organization_memberships! Fallback UUID is strictly prohibited.`);
    }

    const userOrgId = memberRows[0].organization_id;
    console.log(`  -> User verified: id=${verifiedUserId} | Active Member of Org A: ${userOrgId}`);
    console.log('  -> Real User Access Token (JWT) acquired successfully.\n');

    // 3. Verify that Target Org B exists and is active in root table portal_organizations
    console.log('[Setup 3] Verifying Target Org B exists in root table portal_organizations:');
    const { data: rootOrgB, error: rootBErr } = await adminClient
      .from('portal_organizations')
      .select('organization_id, status')
      .eq('organization_id', targetOrgBId)
      .single();

    if (rootBErr || !rootOrgB || rootOrgB.status !== 'active') {
      throw new Error(`T11b Setup FAILED: Target Org B (${targetOrgBId}) does NOT exist or is NOT active in root table portal_organizations! Please seed Org B in DB Clone.`);
    }
    console.log(`  -> PASS: Foreign Org B confirmed active in root table portal_organizations.\n`);

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
    const { error: anonErr } = await publicClient.rpc('match_documents', {
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
      auth: { persistSession: false },
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

    const restBody = await restRes.text();
    console.log('  HTTP Response Status:', restRes.status);
    console.log('  HTTP Response Body:', restBody);

    if (restRes.status === 401 || restRes.status === 403 || restBody.includes('42501') || restBody.includes('permission denied')) {
      console.log('  -> PASS: Direct PostgREST HTTP probe with Real Bearer JWT is HARD BLOCKED! (HTTP 401/403 Permission Denied)\n');
    } else {
      throw new Error(`T11b.4 FAILED: Expected 401/403 for direct PostgREST HTTP call with Bearer token, got status ${restRes.status}: ${restBody}`);
    }

    // =========================================================================
    // SECTION 2: Comprehensive Multi-Tenant RLS Policy Regression Test with Real Org B Data
    // =========================================================================
    console.log('--- SECTION 2: MULTI-TENANT RLS REGRESSION (REAL ORG B DATA PROBE) ---');

    // Ensure Real Foreign Org B Exists with Real Data in crm_knowledge_documents
    const { data: orgBDocs, error: orgBErr } = await adminClient
      .from('crm_knowledge_documents')
      .select('id, organization_id')
      .eq('organization_id', targetOrgBId);

    if (orgBErr) throw new Error(`T11b Setup FAILED: Could not check Org B documents: ${orgBErr.message}`);

    if (!orgBDocs || orgBDocs.length === 0) {
      console.log('  [Setup] Seeding Real Org B test document in DB Clone...');
      const { data: newOrgBDoc, error: seedDocErr } = await adminClient
        .from('crm_knowledge_documents')
        .insert({
          organization_id: targetOrgBId,
          title: 'Confidential Org B Test Document',
          knowledge_status: 'REVIEWED',
          ingestion_status: 'SUCCESS',
        })
        .select('id')
        .single();

      if (seedDocErr || !newOrgBDoc?.id) {
        throw new Error(`T11b Setup FAILED: Could not seed Org B document: ${seedDocErr?.message}`);
      }
      realOrgBDocId = newOrgBDoc.id;
      isSeededDoc = true;
    } else {
      realOrgBDocId = orgBDocs[0].id;
    }

    // Verify that Admin sees Real Org B document(s)
    const { count: adminOrgBCount } = await adminClient
      .from('crm_knowledge_documents')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', targetOrgBId);

    console.log(`  -> Admin Verified: Foreign Org B (${targetOrgBId}) has REAL data in DB Clone: ${adminOrgBCount} document(s).`);

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

    // 2.2 Table 1: crm_knowledge_documents RLS isolation against real Org B data
    console.log('[Test T11b.6] Verifying crm_knowledge_documents RLS isolation against REAL Org B data:');
    const { data: ownDocs, error: ownDocsErr } = await userClient.from('crm_knowledge_documents').select('id').eq('organization_id', userOrgId);
    if (ownDocsErr) throw new Error(`T11b.6 FAILED: User could not read own docs: ${ownDocsErr.message}`);

    const { data: foreignDocs, error: foreignDocsErr } = await userClient.from('crm_knowledge_documents').select('id').eq('organization_id', targetOrgBId);
    if (foreignDocsErr) throw new Error(`T11b.6 FAILED: Foreign doc query errored: ${foreignDocsErr.message}`);

    console.log(`  -> Own documents read: ${ownDocs?.length ?? 0} | Foreign (Org B) documents read: ${foreignDocs?.length ?? 0} (Expected: 0)`);
    if ((foreignDocs?.length ?? 0) > 0) {
      throw new Error(`T11b.6 CRITICAL FAIL: User of Org A was able to read ${foreignDocs?.length} documents from Org B!`);
    }
    console.log('  -> PASS: crm_knowledge_documents RLS blocked 100% of Org B documents.\n');

    // 2.3 Table 2: crm_knowledge_chunks RLS isolation
    console.log('[Test T11b.7] Verifying crm_knowledge_chunks RLS isolation:');
    const { data: foreignChunks, error: foreignChunksErr } = await userClient.from('crm_knowledge_chunks').select('id').eq('organization_id', targetOrgBId);
    if (foreignChunksErr) throw new Error(`T11b.7 FAILED: Foreign chunks query errored: ${foreignChunksErr.message}`);

    console.log(`  -> Foreign (Org B) chunks read: ${foreignChunks?.length ?? 0} (Expected: 0)`);
    if ((foreignChunks?.length ?? 0) > 0) {
      throw new Error(`T11b.7 CRITICAL FAIL: User of Org A was able to read ${foreignChunks?.length} chunks from Org B!`);
    }
    console.log('  -> PASS: crm_knowledge_chunks RLS blocked 100% of Org B chunks.\n');

    // 2.4 Table 3: crm_knowledge_audit_logs RLS isolation
    console.log('[Test T11b.8] Verifying crm_knowledge_audit_logs RLS isolation:');
    const { data: foreignAudits, error: foreignAuditsErr } = await userClient.from('crm_knowledge_audit_logs').select('id').eq('organization_id', targetOrgBId);
    if (foreignAuditsErr) throw new Error(`T11b.8 FAILED: Foreign audit logs query errored: ${foreignAuditsErr.message}`);

    console.log(`  -> Foreign (Org B) audit logs read: ${foreignAudits?.length ?? 0} (Expected: 0)`);
    if ((foreignAudits?.length ?? 0) > 0) {
      throw new Error(`T11b.8 CRITICAL FAIL: User of Org A was able to read ${foreignAudits?.length} audit logs from Org B!`);
    }
    console.log('  -> PASS: crm_knowledge_audit_logs RLS blocked 100% of Org B audit logs.\n');

    // =========================================================================
    // SECTION 3: Append-Only Audit Log Behavioral Mutation Test (Trigger Enforcement)
    // =========================================================================
    console.log('--- SECTION 3: APPEND-ONLY IMMUTABILITY BEHAVIORAL MUTATION TEST ---');

    // 3.1 Insert a test audit record via admin
    console.log('[Test T11b.9] Inserting test audit record to verify immutability:');
    const testCorrId = `immutability-probe-${Date.now()}`;
    const { data: newAudit, error: insertAuditErr } = await adminClient
      .from('crm_knowledge_audit_logs')
      .insert({
        document_id: realOrgBDocId,
        organization_id: targetOrgBId,
        action: 'INGESTION_SUCCESS',
        correlation_id: testCorrId,
        actor_type: 'service_role',
      })
      .select('id')
      .single();

    if (insertAuditErr || !newAudit?.id) {
      throw new Error(`T11b.9 FAILED: Could not insert test audit row: ${insertAuditErr?.message}`);
    }
    testAuditId = newAudit.id;
    console.log(`  -> Test audit record inserted successfully: ${testAuditId}`);

    // 3.2 Attempt UPDATE on audit record (Must be blocked by trg_prevent_audit_mutation)
    console.log('[Test T11b.10] Attempting UPDATE on audit log (Must be HARD BLOCKED by trigger):');
    const { error: updateErr } = await adminClient
      .from('crm_knowledge_audit_logs')
      .update({ action: 'INGESTION_TAMPERED' })
      .eq('id', testAuditId);

    console.log('  Update Error returned:', updateErr?.message || 'None', `(Code: ${updateErr?.code})`);
    if (updateErr && (updateErr.message?.includes('immutable') || updateErr.code === 'P0001')) {
      console.log('  -> PASS: UPDATE on audit log was HARD BLOCKED by prevent_audit_mutation trigger!\n');
    } else {
      throw new Error(`T11b.10 FAILED: Expected trigger to block UPDATE on audit log, got: ${JSON.stringify(updateErr)}`);
    }

    // 3.3 Attempt DELETE on audit record (Must be blocked by trg_prevent_audit_mutation)
    console.log('[Test T11b.11] Attempting DELETE on audit log (Must be HARD BLOCKED by trigger):');
    const { error: deleteErr } = await adminClient
      .from('crm_knowledge_audit_logs')
      .delete()
      .eq('id', testAuditId);

    console.log('  Delete Error returned:', deleteErr?.message || 'None', `(Code: ${deleteErr?.code})`);
    if (deleteErr && (deleteErr.message?.includes('immutable') || deleteErr.code === 'P0001')) {
      console.log('  -> PASS: DELETE on audit log was HARD BLOCKED by prevent_audit_mutation trigger!\n');
    } else {
      throw new Error(`T11b.11 FAILED: Expected trigger to block DELETE on audit log, got: ${JSON.stringify(deleteErr)}`);
    }

    console.log('================================================================');
    console.log('T11b COMPLETE ZERO-TRUST VERIFICATION PASSED 100%:');
    console.log('  1. RPC Execution Access Boundary: Protected (42501)');
    console.log('  2. Multi-Tenant Helper get_auth_user_organizations: Isolated');
    console.log('  3. crm_knowledge_documents RLS: Zero-Leakage against real Org B data');
    console.log('  4. crm_knowledge_chunks RLS: Zero-Leakage against real Org B data');
    console.log('  5. crm_knowledge_audit_logs RLS: Zero-Leakage against real Org B data');
    console.log('  6. Append-Only Trigger: UPDATE and DELETE HARD BLOCKED (P0001)');
    console.log('================================================================');
  } finally {
    // -----------------------------------------------------------------------
    // STRICT CLEANUP IN FINALLY BLOCK WITH ERROR VALIDATION
    // -----------------------------------------------------------------------
    console.log('\n--- SECTION 4: TEST FIXTURE CLEANUP & AUDIT IMMUTABILITY ACCOUNTING ---');
    if (testAuditId) {
      console.log(`  [Audit Immutability Note] Test audit record (${testAuditId}) is permanently preserved as append-only immutable proof on DB Clone.`);
    }

    if (isSeededDoc && realOrgBDocId) {
      console.log(`  [Cleanup] Transitioning seeded test document ${realOrgBDocId} to ARCHIVED via state machine...`);
      const { data: updatedDoc, error: cleanErr } = await adminClient
        .from('crm_knowledge_documents')
        .update({ knowledge_status: 'ARCHIVED' })
        .eq('id', realOrgBDocId)
        .select('id, knowledge_status');

      if (cleanErr) {
        throw new Error(`[Cleanup Failure] Could not transition seeded document to ARCHIVED: ${cleanErr.message}`);
      }
      if (!updatedDoc || updatedDoc.length === 0 || updatedDoc[0].knowledge_status !== 'ARCHIVED') {
        throw new Error(`[Cleanup Failure] Seeded document was not updated to ARCHIVED: ${JSON.stringify(updatedDoc)}`);
      }
      console.log(`  -> PASS: Seeded test document ${realOrgBDocId} safely transitioned to ARCHIVED state.`);
    }
  }
}

testT11bJwtIsolation().catch((err) => {
  console.error('T11b Test Failed:', err);
  process.exit(1);
});
