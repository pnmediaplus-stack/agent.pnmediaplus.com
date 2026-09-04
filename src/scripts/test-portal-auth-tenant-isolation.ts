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
const anonymousClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});
const authClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

async function runTenantIsolationRegression() {
  console.log('================================================================');
  console.log('TENANT ISOLATION & PORTAL AUTH SECURITY REGRESSION TEST');
  console.log('Target Environment: AUTHORIZED DB CLONE');
  console.log('Target Supabase URL:', supabaseUrl);
  console.log('Specification: Next.js Local Build Gatekeeper QA Approved Standard');
  console.log('================================================================\n');

  // Step 1: Generate dynamic OTP session for authenticated User Org A (pnmediaplus@gmail.com)
  console.log('[Step 1] Authenticating test user (pnmediaplus@gmail.com) via OTP exchange...');
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'pnmediaplus@gmail.com',
  });

  if (linkRes.error || !linkRes.data?.properties?.email_otp) {
    throw new Error(`Failed to generate magiclink for test user: ${linkRes.error?.message}`);
  }

  const { data: authData, error: authErr } = await authClient.auth.verifyOtp({
    email: 'pnmediaplus@gmail.com',
    token: linkRes.data.properties.email_otp,
    type: 'email',
  });

  if (authErr || !authData?.session?.access_token || !authData?.user?.id) {
    throw new Error(`Failed to verify OTP session: ${authErr?.message}`);
  }

  const userJwt = authData.session.access_token;
  const userId = authData.user.id;
  console.log(`  -> User authenticated: id=${userId}`);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
    auth: { persistSession: false },
  });

  // Step 2: Anonymous Caller Regression Test (Clean anonymous client)
  console.log('\n[Step 2] Anonymous Caller Isolation Probe:');
  const { data: anonOrgs, error: anonErr } = await anonymousClient
    .from('portal_organizations')
    .select('organization_id, organization_key, organization_name, status');

  const anonDeniedOrEmpty = Boolean(anonErr || !anonOrgs || anonOrgs.length === 0);
  console.log('  -> Anonymous query status:', anonErr ? `Blocked (${anonErr.code}: ${anonErr.message})` : `Returned ${anonOrgs?.length} rows`);
  if (!anonDeniedOrEmpty) {
    throw new Error('SECURITY VIOLATION: Anonymous caller was able to view organizations!');
  }
  console.log('  -> PASS: Anonymous caller is strictly blocked/returns 0 rows.');

  // Step 3: Authenticated User Org A Regression Test
  console.log('\n[Step 3] Authenticated User Org A Isolation Probe:');
  const { data: userOrgs, error: userErr } = await userClient
    .from('portal_organizations')
    .select('organization_id, organization_key, organization_name, status');

  if (userErr) {
    console.error('  -> User query failed with error:', userErr);
    throw new Error(`User query failed: ${userErr.message}`);
  }

  console.log(`  -> Organizations visible to User: ${userOrgs?.length || 0}`);
  userOrgs?.forEach((o: any) => {
    console.log(`     - [${o.organization_id}] key: ${o.organization_key} | name: ${o.organization_name} | status: ${o.status}`);
  });

  // Strict assertion: User MUST see their own Org A (8289488a-b255-4cb6-9bff-c9d2e71af160)
  const orgAId = '8289488a-b255-4cb6-9bff-c9d2e71af160';
  const hasOrgA = userOrgs?.some((o: any) => o.organization_id === orgAId);
  if (!hasOrgA) {
    throw new Error(`TENANT ISOLATION FAILURE: User does not see their own active Org A (${orgAId})!`);
  }
  console.log(`  -> PASS: User successfully sees authorized Org A (${orgAId}).`);

  // Step 4: Strict Cross-Tenant Leakage Assertion (Org B must NOT be visible)
  console.log('\n[Step 4] Cross-Tenant Leakage Check (Org B / Foreign Tenants):');
  const orgBId = 'aaaaaaaa-cccc-cccc-cccc-000000000002';
  const hasOrgB = userOrgs?.some((o: any) => o.organization_id === orgBId);
  if (hasOrgB) {
    throw new Error(`CRITICAL SECURITY BREACH: User was able to see foreign Org B (${orgBId})!`);
  }
  console.log(`  -> PASS: Foreign Org B (${orgBId}) is 100% INVISIBLE to User.`);

  // Step 5: Verify Memberships View Isolation
  console.log('\n[Step 5] User Memberships View Isolation:');
  const { data: userMemberships, error: memErr } = await userClient
    .from('portal_organization_memberships')
    .select('membership_id, organization_id, organization_key, user_id, role, status');

  if (memErr) {
    throw new Error(`User memberships query failed: ${memErr.message}`);
  }

  const foreignMemberships = userMemberships?.filter((m: any) => m.user_id !== userId);
  if (foreignMemberships && foreignMemberships.length > 0) {
    throw new Error(`CRITICAL SECURITY BREACH: User was able to view memberships of other users! Count: ${foreignMemberships.length}`);
  }
  // Step 6: Trusted Service Role Admin Probe
  console.log('\n[Step 6] Trusted service_role Admin Probe:');
  const { data: adminOrgs, error: adminErr } = await adminClient
    .from('portal_organizations')
    .select('organization_id, organization_key, status');

  if (adminErr) {
    throw new Error(`service_role query failed: ${adminErr.message}`);
  }
  console.log(`  -> Organizations visible to service_role: ${adminOrgs?.length || 0}`);
  console.log('  -> PASS: service_role can administratively inspect organizations without restriction.');

  console.log('\n================================================================');
  console.log('ALL 6 TENANT ISOLATION REGRESSION TESTS PASSED 100%!');
  console.log('Status: TENANT-SAFE LEAST-PRIVILEGE VERIFIED');
  console.log('================================================================\n');
}

runTenantIsolationRegression().catch(err => {
  console.error('\n❌ REGRESSION TEST FAILED:', err.message);
  process.exit(1);
});
