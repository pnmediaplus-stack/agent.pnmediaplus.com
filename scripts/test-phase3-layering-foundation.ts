import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { createPackageApprovalSignature } from '../src/lib/knowledge/package-approval-signer';
import { POST as approvePackageRoute } from '../src/app/api/crm/knowledge/package/approve/route';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Invariant: Target must strictly be DB Clone Staging
if (!supabaseUrl.includes('ldhjrdihrcjsjfmrqtbi')) {
  console.error(`[BLOCKED] Target is not DB Clone Staging: ${supabaseUrl}`);
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
});

// Dynamic In-Memory Secret: strictly zero hardcoded secrets!
const dynamicSecret = crypto.randomBytes(32).toString('hex');

function getCanonicalTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function computeHmac(msg: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

function buildValidFrameworkMetadata(overrides: Record<string, any> = {}) {
  return {
    object_class: 'governance',
    semantic_type: 'recommendation',
    governance_type: 'policy',
    usage_authority: 'internal_reasoning_only',
    sensitivity: 'internal',
    allowed_purposes: ['marketing_strategy', 'campaign_planning'],
    evidence_basis: ['internal_audit'],
    applicability: {
      departments: ['marketing']
    },
    ...overrides
  };
}

function buildValidOperationalMetadata(overrides: Record<string, any> = {}) {
  return {
    object_class: 'knowledge',
    semantic_type: 'fact',
    governance_type: 'none',
    usage_authority: 'cross_department',
    sensitivity: 'internal',
    allowed_purposes: ['customer_support', 'operational_lookup'],
    evidence_basis: ['internal_audit'],
    is_org_wide: 'true',
    applicability: {
      departments: ['cskh']
    },
    ...overrides
  };
}


interface TestResult {
  passed: boolean;
  name: string;
  detail?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  results.push({ passed: condition, name, detail });
  if (condition) {
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

async function runPhase3FoundationTests() {
  console.log('================================================================');
  console.log('PHASE 3 FOUNDATION TEST SUITE: T1 - T6 (HARDENED SECURITY SPEC)');
  console.log('Target DB:', supabaseUrl);
  console.log('Secret Management: Dynamic In-Memory Injection (Zero Hardcoding)');
  console.log('================================================================\n');

  // 1. Dynamic Secret Injection into private.knowledge_auth_secrets via service_role RPC
  console.log('[Setup 1] Injecting dynamic secret into private.knowledge_auth_secrets via service_role RPC...');
  const { error: secretErr } = await adminClient.rpc('set_knowledge_auth_secret', {
    p_key: 'PACKAGE_APPROVAL_HMAC_SECRET',
    p_val: dynamicSecret
  });

  if (secretErr) {
    throw new Error(`Failed to inject dynamic secret into private schema: ${secretErr.message}`);
  }
  process.env.KNOWLEDGE_APPROVAL_SECRET = dynamicSecret;
  console.log('  -> Dynamic 64-char HMAC secret successfully seeded into private vault and process.env.\n');

  // 2. Authenticate real user session via OTP using isolated auth client (Preserving adminClient purity)
  console.log('[Setup 2] Authenticating genuine user session on DB Clone (pnmediaplus@gmail.com)...');
  const otpRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'pnmediaplus@gmail.com'
  });

  if (otpRes.error || !otpRes.data?.properties?.email_otp) {
    throw new Error(`Failed to generate magic link: ${otpRes.error?.message}`);
  }

  const authSessionClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const verifyRes = await authSessionClient.auth.verifyOtp({
    email: 'pnmediaplus@gmail.com',
    token: otpRes.data.properties.email_otp,
    type: 'email'
  });

  if (verifyRes.error || !verifyRes.data.session?.access_token || !verifyRes.data.user) {
    throw new Error(`Failed to verify OTP: ${verifyRes.error?.message}`);
  }

  const userToken = verifyRes.data.session.access_token;
  const realUserId = verifyRes.data.user.id;

  const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
    auth: { persistSession: false }
  });


  // Verify real user organization membership
  const { data: userMemberships } = await adminClient
    .from('portal_organization_memberships')
    .select('organization_id, role, status')
    .eq('user_id', realUserId)
    .eq('status', 'active');

  if (!userMemberships || userMemberships.length === 0) {
    throw new Error('User has no active organization membership');
  }

  const targetOrgId = userMemberships[0].organization_id;
  console.log(`  -> User authenticated: id=${realUserId} | Org=${targetOrgId} | Role=${userMemberships[0].role}\n`);

  // 3. Authenticate non-founder test user for HTTP route authorization testing
  console.log('[Setup 3] Authenticating non-founder test user for HTTP Route Role Testing...');
  const nonFounderEmail = `test.nonfounder.${crypto.randomUUID().slice(0, 8)}@pnmediaplus.com`;
  const { data: nfCreateRes, error: nfCreateErr } = await adminClient.auth.admin.createUser({
    email: nonFounderEmail,
    email_confirm: true,
    password: 'TempPassword123!'
  });

  if (nfCreateErr || !nfCreateRes.user) {
    throw new Error(`Failed to create non-founder test user: ${nfCreateErr?.message}`);
  }

  const nonFounderUserId = nfCreateRes.user.id;

  // Add non-founder membership (role: 'member') in portal_auth.organization_memberships
  const { error: nfMemErr } = await adminClient.rpc('create_test_portal_membership', {
    p_user_id: nonFounderUserId,
    p_org_id: targetOrgId,
    p_role: 'member'
  });

  if (nfMemErr) {
    throw new Error(`Failed to assign non-founder role: ${nfMemErr.message}`);
  }

  const nfOtpRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: nonFounderEmail
  });

  const nfVerifyRes = await authSessionClient.auth.verifyOtp({
    email: nonFounderEmail,
    token: nfOtpRes.data!.properties!.email_otp!,
    type: 'email'
  });

  const nonFounderToken = nfVerifyRes.data.session?.access_token;
  if (!nonFounderToken) {
    throw new Error('Failed to obtain access token for non-founder user');
  }
  console.log(`  -> Non-Founder user authenticated: id=${nonFounderUserId} | Org=${targetOrgId} | Role=member\n`);

  const fakeOrgId = '00000000-0000-0000-0000-000000000099';
  const testPackageId = `TEST_PACKAGE_${crypto.randomUUID().slice(0, 8)}`;
  const testVersion = '1.0.0';
  const testManifestHash = '60604cf7f31411bbb172ac990d7a61e1b204bb0ecb2515d3a55b141ba554acf8';
  const fixtureDocIds: string[] = [];

  // --- T0: DB Trigger: Metadata Framework Tamper Resistance ---
  console.log('--- TEST GROUP 0: Database Trigger Framework Tamper Resistance (T0) ---');
  const { data: tamperedDoc, error: tamperErr } = await userClient.from('crm_knowledge_documents').insert({
    organization_id: targetOrgId,
    namespace: 'marketing',
    title: 'Tamper Test Document',
    file_url: 'quarantine://tamper-test',
    knowledge_status: 'DRAFT',
    ingestion_status: 'NOT_REQUIRED',
    knowledge_metadata: {
      is_framework: 'true',
      document_type: 'DECISION_FRAMEWORK'
    }
  }).select('id, knowledge_metadata').single();

  assert(
    tamperErr !== null && tamperErr.message.includes('FRAMEWORK_TAMPER_BLOCKED'),
    'Test T0.1: Direct client attempt to set is_framework=true strictly blocked by trigger with FRAMEWORK_TAMPER_BLOCKED',
    tamperErr?.message
  );

  // Normal non-framework document insert succeeds
  const { data: validNormalDoc, error: normalErr } = await userClient.from('crm_knowledge_documents').insert({
    organization_id: targetOrgId,
    namespace: 'marketing',
    title: 'Normal Operational Document',
    file_url: 'quarantine://normal-test',
    knowledge_status: 'DRAFT',
    ingestion_status: 'NOT_REQUIRED',
    knowledge_metadata: {
      document_type: 'OPERATIONAL_KNOWLEDGE',
      is_framework: 'false',
      object_class: 'knowledge'
    }
  }).select('id').single();


  assert(normalErr === null && validNormalDoc !== null, 'Test T0.2: Normal non-framework operational document insert succeeds without blockage', normalErr?.message);
  if (validNormalDoc) {
    fixtureDocIds.push(validNormalDoc.id);
  }

  // --- T1: Tenant-Scoped Cross-Tenant Block ---
  console.log('\n--- TEST GROUP 1: Tenant-Scoped Cross-Tenant Block (T1) ---');
  const nonceT1 = crypto.randomUUID();
  const nowT1 = getCanonicalTimestamp();
  const msgT1 = `${fakeOrgId}:${testPackageId}:${testVersion}:${testManifestHash}:10:${nonceT1}:${nowT1}:${realUserId}`;
  const sigT1 = computeHmac(msgT1, dynamicSecret);

  // Calling via genuine user JWT
  const { error: errT1 } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: fakeOrgId,
    p_package_id: testPackageId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT1,
    p_timestamp: nowT1,
    p_signature: sigT1
  });

  assert(errT1 !== null && errT1.message.includes('AUTHORIZATION_VIOLATION'), 'Test T1.1: Cross-tenant approval strictly rejected with AUTHORIZATION_VIOLATION', errT1?.message);

  // --- T2: Cryptographic HMAC Check & Replay Prevention (T2) ---
  console.log('\n--- TEST GROUP 2: Cryptographic HMAC & Replay Prevention (T2) ---');
  // 2A: Invalid Signature
  const nonceT2A = crypto.randomUUID();
  const nowT2A = getCanonicalTimestamp();
  const { error: errT2A } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: testPackageId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT2A,
    p_timestamp: nowT2A,
    p_signature: 'invalid_tampered_hmac_signature_00000000000000000000000000000000'
  });
  assert(errT2A !== null && errT2A.message.includes('HMAC_SIGNATURE_INVALID'), 'Test T2.1: Tampered signature rejected with HMAC_SIGNATURE_INVALID', errT2A?.message);

  // 2A.2: Verify Nonce Burning Defense (Nonce was NOT consumed on invalid signature)
  const { data: nonceExists, error: errNonceCheck } = await adminClient.rpc('check_approval_nonce_exists', { p_nonce: nonceT2A });
  if (errNonceCheck) console.error('errNonceCheck T2.1b:', errNonceCheck);
  assert(errNonceCheck === null && nonceExists === false, 'Test T2.1b: Anti-DoS Nonce Burning Defense verified (Nonce not consumed on bad signature)', JSON.stringify({ nonceExists, errNonceCheck }));

  // 2B: Expired Timestamp (> 5 mins)
  const expiredTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonceT2B = crypto.randomUUID();
  const msgT2B = `${targetOrgId}:${testPackageId}:${testVersion}:${testManifestHash}:10:${nonceT2B}:${expiredTimestamp}:${realUserId}`;
  const sigT2B = computeHmac(msgT2B, dynamicSecret);

  const { error: errT2B } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: testPackageId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT2B,
    p_timestamp: expiredTimestamp,
    p_signature: sigT2B
  });
  assert(errT2B !== null && errT2B.message.includes('TIMESTAMP_EXPIRED'), 'Test T2.2: Stale signature rejected with TIMESTAMP_EXPIRED', errT2B?.message);

  // 2C: Replay Nonce Test (Using service_role RPC record_approval_nonce)
  const replayedNonce = crypto.randomUUID();
  const validTimestamp = getCanonicalTimestamp();
  const { error: errRecNonce } = await adminClient.rpc('record_approval_nonce', {
    p_nonce: replayedNonce,
    p_org_id: targetOrgId,
    p_user_id: realUserId
  });
  if (errRecNonce) console.error('errRecNonce T2.3:', errRecNonce);


  const msgT2C = `${targetOrgId}:${testPackageId}:${testVersion}:${testManifestHash}:10:${replayedNonce}:${validTimestamp}:${realUserId}`;
  const sigT2C = computeHmac(msgT2C, dynamicSecret);

  const { error: errT2C } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: testPackageId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: replayedNonce,
    p_timestamp: validTimestamp,
    p_signature: sigT2C
  });
  assert(errT2C !== null && errT2C.message.includes('NONCE_REPLAYED'), 'Test T2.3: Reused nonce rejected with NONCE_REPLAYED', errT2C?.message);


  // --- T3: Package Duplicate & Partial Part Block (T3) ---
  console.log('\n--- TEST GROUP 3: Package Bounds & Duplicate/Partial/Version Integrity Block (T3) ---');
  // 3A: Expected parts bounds checking
  const nonceT3A = crypto.randomUUID();
  const nowT3A = getCanonicalTimestamp();
  const msgT3A = `${targetOrgId}:${testPackageId}:${testVersion}:${testManifestHash}:15:${nonceT3A}:${nowT3A}:${realUserId}`;
  const sigT3A = computeHmac(msgT3A, dynamicSecret);

  const { error: errT3A } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: testPackageId,
    p_package_version: testVersion,
    p_expected_parts: 15,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT3A,
    p_timestamp: nowT3A,
    p_signature: sigT3A
  });
  assert(errT3A !== null && errT3A.message.includes('INVALID_ARGUMENT'), 'Test T3.1: p_expected_parts > 10 rejected with INVALID_ARGUMENT', errT3A?.message);

  // Seed an incomplete fixture package (Only 2 parts out of 10)
  const incompletePkgId = `INCOMPLETE_PKG_${crypto.randomUUID().slice(0, 8)}`;
  for (const koIdx of ['KO-01', 'KO-02']) {
    const { data: insDocs, error: insErr } = await adminClient.from('crm_knowledge_documents').insert({
      organization_id: targetOrgId,
      namespace: 'marketing',
      title: `${incompletePkgId} - ${koIdx}`,
      file_url: `quarantine://test-fixture/${koIdx}`,
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      knowledge_metadata: buildValidFrameworkMetadata({
        package_id: incompletePkgId,
        ko_index: koIdx,
        package_version: testVersion,
        is_framework: 'true',
        document_type: 'DECISION_FRAMEWORK',
        package_manifest_sha256: testManifestHash,
        fixture_disposition: 'ARCHIVED_TEST_FIXTURE'
      }),
      created_by: realUserId
    }).select('id');

    if (insErr) console.error(`[IncompletePkg Insert Err] ${koIdx}:`, insErr);
    if (insDocs?.[0]?.id) fixtureDocIds.push(insDocs[0].id);
  }

  const nonceT3B = crypto.randomUUID();
  const nowT3B = getCanonicalTimestamp();
  const msgT3B = `${targetOrgId}:${incompletePkgId}:${testVersion}:${testManifestHash}:10:${nonceT3B}:${nowT3B}:${realUserId}`;
  const sigT3B = computeHmac(msgT3B, dynamicSecret);

  const { error: errT3B } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: incompletePkgId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT3B,
    p_timestamp: nowT3B,
    p_signature: sigT3B
  });
  assert(errT3B !== null && errT3B.message.includes('PACKAGE_INTEGRITY_VIOLATION'), 'Test T3.2: Partial package (2/10 rows) rejected with PACKAGE_INTEGRITY_VIOLATION', errT3B?.message);

  // 3C: Package with Wrong Version Rejection
  const wrongVersionPkgId = `WRONG_VER_PKG_${crypto.randomUUID().slice(0, 8)}`;
  for (const koIdx of ['KO-01', 'KO-02', 'KO-03', 'KO-04', 'KO-05', 'KO-06', 'KO-07', 'KO-08', 'KO-09', 'KO-10']) {
    const { data: wvDocs, error: wvErr } = await adminClient.from('crm_knowledge_documents').insert({
      organization_id: targetOrgId,
      namespace: 'marketing',
      title: `${wrongVersionPkgId} - ${koIdx}`,
      file_url: `quarantine://test-wv/${koIdx}`,
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      knowledge_metadata: buildValidFrameworkMetadata({
        package_id: wrongVersionPkgId,
        ko_index: koIdx,
        package_version: '2.0.0-unauthorized', // Mismatched version
        is_framework: 'true',
        document_type: 'DECISION_FRAMEWORK',
        package_manifest_sha256: testManifestHash,
        fixture_disposition: 'ARCHIVED_TEST_FIXTURE'
      }),
      created_by: realUserId
    }).select('id');

    if (wvErr) console.error(`[WrongVer Insert Err] ${koIdx}:`, wvErr);
    if (wvDocs?.[0]?.id) fixtureDocIds.push(wvDocs[0].id);
  }

  const nonceT3C = crypto.randomUUID();
  const nowT3C = getCanonicalTimestamp();
  const msgT3C = `${targetOrgId}:${wrongVersionPkgId}:${testVersion}:${testManifestHash}:10:${nonceT3C}:${nowT3C}:${realUserId}`;
  const sigT3C = computeHmac(msgT3C, dynamicSecret);

  const { error: errT3C } = await userClient.rpc('approve_knowledge_package', {
    p_organization_id: targetOrgId,
    p_package_id: wrongVersionPkgId,
    p_package_version: testVersion,
    p_expected_parts: 10,
    p_expected_manifest_sha256: testManifestHash,
    p_nonce: nonceT3C,
    p_timestamp: nowT3C,
    p_signature: sigT3C
  });
  assert(errT3C !== null && errT3C.message.includes('PACKAGE_INTEGRITY_VIOLATION'), 'Test T3.3: Package with mismatched version rejected with PACKAGE_INTEGRITY_VIOLATION', errT3C?.message);

  // --- T4: Concurrency & Idempotency Proof (T4) ---
  console.log('\n--- TEST GROUP 4: Full Package Assembly, Approval & Idempotency (T4) ---');
  const fullPkgId = `FULL_VALID_PKG_${crypto.randomUUID().slice(0, 8)}`;
  const canonicalKOs = ['KO-01', 'KO-02', 'KO-03', 'KO-04', 'KO-05', 'KO-06', 'KO-07', 'KO-08', 'KO-09', 'KO-10'];

  for (const koIdx of canonicalKOs) {
    const { data: fullDocs, error: fullErr } = await adminClient.from('crm_knowledge_documents').insert({
      organization_id: targetOrgId,
      namespace: 'marketing',
      title: `${fullPkgId} - ${koIdx}`,
      file_url: `quarantine://test-fixture-full/${koIdx}`,
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      knowledge_metadata: buildValidFrameworkMetadata({
        package_id: fullPkgId,
        ko_index: koIdx,
        package_version: testVersion,
        is_framework: 'true',
        document_type: 'DECISION_FRAMEWORK',
        package_manifest_sha256: testManifestHash,
        fixture_disposition: 'ARCHIVED_TEST_FIXTURE'
      }),
      created_by: realUserId
    }).select('id');

    if (fullErr) console.error(`[FullDoc Insert Err] ${koIdx}:`, fullErr);
    if (fullDocs?.[0]?.id) fixtureDocIds.push(fullDocs[0].id);
  }


  // --- T4.0a: HTTP API Route - Unauthenticated Block ---
  const unauthReq = new Request('http://localhost:3000/api/crm/knowledge/package/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      packageId: fullPkgId,
      packageVersion: testVersion,
      expectedParts: 10,
      expectedManifestSha256: testManifestHash
    })
  });
  const unauthRes = await approvePackageRoute(unauthReq);
  assert(unauthRes.status === 401, 'Test T4.0a: HTTP API Route unauthenticated caller returns HTTP 401 Unauthorized');

  // --- T4.0b: HTTP API Route - Non-Founder Forbidden Guard ---
  const nfReq = new Request('http://localhost:3000/api/crm/knowledge/package/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${nonFounderToken}`
    },
    body: JSON.stringify({
      packageId: fullPkgId,
      packageVersion: testVersion,
      expectedParts: 10,
      expectedManifestSha256: testManifestHash
    })
  });
  const nfRes = await approvePackageRoute(nfReq);
  const nfBody = await nfRes.json();
  assert(
    nfRes.status === 403 && nfBody.error === 'FORBIDDEN',
    'Test T4.0b: HTTP API Route non-founder caller returns HTTP 403 FORBIDDEN',
    JSON.stringify(nfBody)
  );

  // --- T4.1: HTTP API Route - Genuine Founder Approval Execution ---
  const founderReq = new Request('http://localhost:3000/api/crm/knowledge/package/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      packageId: fullPkgId,
      packageVersion: testVersion,
      expectedParts: 10,
      expectedManifestSha256: testManifestHash
    })
  });
  const founderRes = await approvePackageRoute(founderReq);
  const founderBody = await founderRes.json();
  assert(
    founderRes.status === 200 && founderBody.success === true && founderBody.result?.status === 'PACKAGE_APPROVED' && founderBody.result?.idempotent === false,
    'Test T4.1: HTTP API Route Founder caller approves complete 10/10 package returning HTTP 200 with PACKAGE_APPROVED',
    JSON.stringify(founderBody)
  );

  // --- T4.1b: Authoritative Audit Log Verification ---
  const { data: auditRows, error: auditCheckErr } = await adminClient
    .from('phase1_audit_logs')
    .select('*')
    .eq('action', 'KNOWLEDGE_PACKAGE_APPROVED')
    .order('createdAt', { ascending: false })
    .limit(1);

  assert(
    auditCheckErr === null && Boolean(auditRows && auditRows.length > 0 && auditRows[0].details?.includes(fullPkgId)),
    'Test T4.1b: Authoritative audit log verified in phase1_audit_logs with COMPLETED action details',
    JSON.stringify({ auditRows, auditCheckErr })
  );

  // --- T4.2: HTTP API Route - Idempotent Repeated Approval ---
  const repeatReq = new Request('http://localhost:3000/api/crm/knowledge/package/approve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      packageId: fullPkgId,
      packageVersion: testVersion,
      expectedParts: 10,
      expectedManifestSha256: testManifestHash
    })
  });
  const repeatRes = await approvePackageRoute(repeatReq);
  const repeatBody = await repeatRes.json();
  assert(
    repeatRes.status === 200 && repeatBody.success === true && repeatBody.result?.idempotent === true && repeatBody.result?.status === 'PACKAGE_APPROVED',
    'Test T4.2: Repeated HTTP API Route approval returns HTTP 200 with idempotent: true without re-execution',
    JSON.stringify(repeatBody)
  );

  // --- T5: CSKH Dedicated RAG Isolation (T5) ---
  // --- T5: CSKH Dedicated RAG Isolation & Cross-Tenant Leakage Block (T5) ---
  console.log('\n--- TEST GROUP 5: CSKH Dedicated RAG Isolation & Cross-Tenant Operational Isolation (T5) ---');
  const dummyEmbedding = Array(1536).fill(0.01);

  // Calling via authenticated user client
  const { data: cskhResults, error: cskhErr } = await userClient.rpc('match_cskh_knowledge', {
    query_embedding: dummyEmbedding,
    match_count: 10,
    p_channel_id: null
  });

  assert(cskhErr === null, 'Test T5.1: match_cskh_knowledge executes via authenticated user JWT without error', cskhErr?.message);
  
  if (cskhResults) {
    const frameworkChunks = cskhResults.filter((r: any) => r.metadata?.is_framework === 'true' || r.metadata?.document_type === 'DECISION_FRAMEWORK');
    assert(frameworkChunks.length === 0, 'Test T5.2: CSKH query returns STRICTLY ZERO framework chunks (Total Isolation)');
  }

  // T5.3: Verify Legacy match_documents RPC also returns ZERO framework chunks (Backdoor Closed)
  const { data: legacyResults, error: legacyErr } = await userClient.rpc('match_documents', {
    query_embedding: dummyEmbedding,
    match_count: 10,
    filter: { organization_id: targetOrgId }
  });
  assert(legacyErr === null, 'Test T5.3: Legacy match_documents executes without error', legacyErr?.message);
  if (legacyResults) {
    const legacyFrameworkChunks = legacyResults.filter((r: any) => r.metadata?.is_framework === 'true' || r.metadata?.document_type === 'DECISION_FRAMEWORK');
    assert(legacyFrameworkChunks.length === 0, 'Test T5.4: Legacy match_documents returns STRICTLY ZERO framework chunks (Backdoor Sealed)');
  }

  // T5.5 & T5.6: Cross-Tenant Operational Leakage Test (Gatekeeper Blocker 2)
  console.log('\n[T5 Cross-Tenant] Seeding operational fixture for Alien Tenant Org B...');
  const { data: alienOrgRows } = await adminClient
    .from('portal_organizations')
    .select('organization_id')
    .neq('organization_id', targetOrgId)
    .limit(1);

  const alienOrgId = alienOrgRows?.[0]?.organization_id || 'aaaaaaaa-cccc-cccc-cccc-000000000002';
  console.log(`  -> Selected Alien Tenant Org B ID: ${alienOrgId}`);

  const { data: alienDoc, error: alienDocErr } = await adminClient.from('crm_knowledge_documents').insert({
    organization_id: alienOrgId,
    namespace: 'cskh',
    title: 'Alien Org Confidential Operational SOP',
    file_url: 'quarantine://test-alien/sop',
    knowledge_status: 'ACTIVE',
    ingestion_status: 'SUCCESS',
    knowledge_metadata: buildValidOperationalMetadata({
      document_type: 'OPERATIONAL_KNOWLEDGE',
      is_framework: 'false',
      fixture_disposition: 'ARCHIVED_TEST_FIXTURE'
    }),
    created_by: realUserId
  }).select('id').single();

  if (alienDocErr) {
    console.error('[AlienDoc Insert Err]:', alienDocErr);
  }

  assert(alienDocErr === null && alienDoc !== null, 'Test T5.4b: Alien tenant document inserted successfully', alienDocErr?.message);

  if (alienDoc) {
    fixtureDocIds.push(alienDoc.id);
    await adminClient.from('crm_knowledge_chunks').insert({
      document_id: alienDoc.id,
      chunk_index: 0,
      content: 'Confidential SOP data belonging exclusively to Alien Tenant B.',
      metadata: {
        document_type: 'OPERATIONAL_KNOWLEDGE',
        is_framework: 'false'
      },
      embedding: dummyEmbedding
    });

    // 1. Authenticated Org A user attempts to query Org B data via match_cskh_knowledge
    const { data: alienCskhData, error: alienCskhErr } = await userClient.rpc('match_cskh_knowledge', {
      query_embedding: dummyEmbedding,
      match_count: 10,
      p_organization_id: alienOrgId
    });
    assert(
      alienCskhErr === null && (alienCskhData?.length === 0 || !alienCskhData),
      'Test T5.5: User Org A querying Org B via match_cskh_knowledge returns STRICTLY ZERO rows (Cross-Tenant Fail-Closed)'
    );

    // 2. Authenticated Org A user attempts to query Org B data via legacy match_documents
    const { data: alienLegacyData, error: alienLegacyErr } = await userClient.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_count: 10,
      filter: { organization_id: alienOrgId }
    });
    assert(
      alienLegacyErr === null && (alienLegacyData?.length === 0 || !alienLegacyData),
      'Test T5.6: User Org A querying Org B via legacy match_documents returns STRICTLY ZERO rows (Cross-Tenant Fail-Closed)'
    );

    // 3. T5.7: Service role executing match_documents WITHOUT organization_id in filter fails closed (Gatekeeper Point 2)
    const { data: srNoOrgResults, error: srNoOrgErr } = await adminClient.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_count: 10,
      filter: {} // Missing organization_id!
    });
    assert(
      srNoOrgErr === null && (srNoOrgResults?.length === 0 || !srNoOrgResults),
      'Test T5.7: Service role calling match_documents without organization_id returns STRICTLY ZERO rows (Service Role Fail-Closed)'
    );

    // 4. T5.8: Channel Isolation: querying a specific channel does not leak other channels (Gatekeeper Point 1)
    const specificChannelId = crypto.randomUUID();
    const { data: channelResults, error: channelErr } = await userClient.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_count: 10,
      filter: { organization_id: targetOrgId, channel_id: specificChannelId }
    });
    if (channelResults) {
      const invalidChannelLeak = channelResults.filter((r: any) => r.metadata?.channel_id && r.metadata?.channel_id !== specificChannelId);
      assert(
        channelErr === null && invalidChannelLeak.length === 0,
        'Test T5.8: Query with specific channel does NOT leak documents of other channels (Airtight Channel Isolation)'
      );
    }
  }

  // --- T6: Marketing RAG & Partial Retrieval Hard Block (T6) ---
  console.log('\n--- TEST GROUP 6: Marketing Framework RAG & Partial Activation Block (T6) ---');
  // Package is currently only PACKAGE_APPROVED, not yet PACKAGE_ACTIVE
  const { data: mktApprovedResults, error: mktErr1 } = await userClient.rpc('match_marketing_framework', {
    query_embedding: dummyEmbedding,
    match_count: 10,
    p_package_id: fullPkgId
  });

  assert(mktErr1 === null, 'Test T6.1: match_marketing_framework executes via authenticated user JWT without error', mktErr1?.message);
  assert(mktApprovedResults?.length === 0, 'Test T6.2: Query on PACKAGE_APPROVED returns 0 chunks (partial_ko_retrieval: FORBIDDEN)');

  // --- APPEND-ONLY AUDIT RETENTION POLICY (Gatekeeper Point 3) ---
  console.log('\n--- APPEND-ONLY AUDIT RETENTION & FIXTURE ARCHIVAL (Policy Enforcement) ---');
  if (fixtureDocIds.length > 0) {
    console.log(`[Append-Only Lifecycle] Archiving ${fixtureDocIds.length} test fixtures with audit retention...`);
    const { data: retiredCount, error: archErr } = await adminClient.rpc('retire_knowledge_fixtures', {
      p_fixture_ids: fixtureDocIds
    });

    if (archErr) {
      throw new Error(`Failed to archive test fixtures: ${archErr.message}`);
    }
    console.log(`  -> ${retiredCount} test fixture documents successfully transitioned to ARCHIVED (Append-Only preserved).`);
  }

  // Clean up nonces created during test run
  console.log('[Cleanup Policy] Purging nonces created for testing...');
  const { error: noncePurgeErr } = await adminClient.rpc('purge_test_nonces', { p_org_id: targetOrgId });
  if (noncePurgeErr) throw new Error(`Failed to purge test nonces: ${noncePurgeErr.message}`);
  console.log('  -> Test nonces cleared.');

  // Clean up test secret from private vault
  console.log('[Cleanup Policy] Purging test secret from private vault...');
  const { error: secretPurgeErr } = await adminClient.rpc('purge_knowledge_auth_secret', { p_key: 'PACKAGE_APPROVAL_HMAC_SECRET' });
  if (secretPurgeErr) throw new Error(`Failed to purge test secret: ${secretPurgeErr.message}`);
  console.log('  -> Dynamic test secret wiped from vault.');

  // Clean up non-founder test user & membership
  if (nonFounderUserId) {
    console.log('[Cleanup Policy] Purging temporary non-founder test user & membership...');
    const { error: memDelErr } = await adminClient.rpc('delete_test_portal_membership', { p_user_id: nonFounderUserId });
    if (memDelErr) throw new Error(`Failed to delete test portal membership: ${memDelErr.message}`);
    const { error: userDelErr } = await adminClient.auth.admin.deleteUser(nonFounderUserId);
    if (userDelErr) throw new Error(`Failed to delete test user: ${userDelErr.message}`);
    console.log('  -> Temporary non-founder user and membership wiped.');
  }

  // Summary
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n================================================================');
  console.log(`ALL TESTS COMPLETE: ${passed}/${total} TESTS PASSED`);
  if (failed === 0) {
    console.log('OVERALL RESULT: SUCCESS (100% PASS) - PHASE 3 FOUNDATION VERIFIED');
    process.exit(0);
  } else {
    console.error(`OVERALL RESULT: FAILED (${failed} tests failed)`);
    process.exit(1);
  }
}

runPhase3FoundationTests().catch(e => {
  console.error('Fatal error running Phase 3 Foundation tests:', e);
  process.exit(1);
});
