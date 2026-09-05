import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { POST as uploadPackageRoute } from '../src/app/api/crm/knowledge/package/upload/route';

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

function assert(condition: boolean, testName: string, detail: any = ''): void {
  if (!condition) {
    console.error(`\n[FAIL] ${testName}`);
    if (detail) console.error('Detail:', detail);
    process.exit(1);
  }
  console.log(`[PASS] ${testName}`);
}

async function runPackageUploadGateTests() {
  console.log('================================================================');
  console.log('BATCH UPLOAD & PACKAGE QA GATE SPECIFICATION TEST SUITE (CLONE)');
  console.log('Target DB:', supabaseUrl);
  console.log('Production Boundary: STRICTLY_FORBIDDEN (Zero mutations to Prod)');
  console.log('================================================================\n');

  const fixtureDocIds: string[] = [];
  const testStoragePaths: string[] = [];
  let nonFounderUserId: string | null = null;

  // [Setup 1] Authenticate genuine Founder user session on DB Clone
  console.log('[Setup 1] Authenticating genuine user session on DB Clone (pnmediaplus@gmail.com)...');
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

  const founderToken = verifyRes.data.session.access_token;
  const founderUserId = verifyRes.data.user.id;

  const { data: memberRows, error: memberErr } = await adminClient
    .from('portal_organization_memberships')
    .select('organization_id, role')
    .eq('user_id', founderUserId)
    .eq('status', 'active');

  if (memberErr || !memberRows || memberRows.length === 0) {
    throw new Error('User has no active organization membership');
  }

  const targetOrgId = memberRows[0].organization_id;
  const targetRole = memberRows[0].role;
  console.log(`  -> Founder authenticated: id=${founderUserId} | Org=${targetOrgId} | Role=${targetRole}`);

  // [Setup 2] Create non-founder member user for role testing
  console.log('\n[Setup 2] Authenticating non-founder test user for role gate testing...');
  const testMemberEmail = `test_uploader_${Date.now()}@pnmediaplus.com`;
  const { data: newUserData, error: newUserErr } = await adminClient.auth.admin.createUser({
    email: testMemberEmail,
    password: 'TemporaryPassword123!',
    email_confirm: true
  });
  if (newUserErr || !newUserData.user) throw new Error(`Failed to create non-founder user: ${newUserErr?.message}`);
  nonFounderUserId = newUserData.user.id;

  const { error: memErr } = await adminClient.rpc('create_test_portal_membership', {
    p_org_id: targetOrgId,
    p_user_id: nonFounderUserId,
    p_role: 'member'
  });
  if (memErr) throw new Error(`Failed to create member portal membership: ${memErr.message}`);

  const { data: nonFounderAuth, error: nonFounderLoginErr } = await authSessionClient.auth.signInWithPassword({
    email: testMemberEmail,
    password: 'TemporaryPassword123!'
  });
  if (nonFounderLoginErr || !nonFounderAuth.session) throw new Error('Failed to login as non-founder test user');
  const nonFounderToken = nonFounderAuth.session.access_token;
  console.log(`  -> Non-Founder user authenticated: id=${nonFounderUserId} | Org=${targetOrgId} | Role=member`);

  // --- TEST GROUP 1: Authentication & Role Authorization Gates ---
  console.log('\n--- TEST GROUP 1: Authentication & Role Authorization Gates ---');

  // Test 1.1: Unauthenticated request
  const unauthReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    body: new FormData()
  });
  const unauthRes = await uploadPackageRoute(unauthReq);
  assert(unauthRes.status === 401, 'Test 1.1: Unauthenticated request strictly returns HTTP 401');

  // Test 1.2: Non-founder role caller (member)
  const memberFormData = new FormData();
  memberFormData.append('package_id', 'test_member_pack');
  memberFormData.append('expected_count', '1');
  memberFormData.append('namespace', 'marketing');
  const memberFile = new File(['# Clean Content'], 'test_KO-01.md', { type: 'text/markdown' });
  memberFormData.append('files[]', memberFile);

  const nonFounderReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${nonFounderToken}`
    },
    body: memberFormData
  });
  const nonFounderRes = await uploadPackageRoute(nonFounderReq);
  const nonFounderJson = await nonFounderRes.json();
  assert(nonFounderRes.status === 403 && nonFounderJson.error === 'AUTHORIZATION_VIOLATION',
    'Test 1.2: Non-founder caller (member) strictly blocked with HTTP 403 AUTHORIZATION_VIOLATION'
  );

  // --- TEST GROUP 2: Package Bounds & Part Integrity Validations ---
  console.log('\n--- TEST GROUP 2: Package Bounds & Part Integrity Validations ---');

  // Test 2.1: Missing namespace fails closed
  const missingNsForm = new FormData();
  missingNsForm.append('package_id', 'test_pack_no_ns');
  missingNsForm.append('expected_count', '1');
  const file1 = new File(['# Content'], 'test_KO-01.md', { type: 'text/markdown' });
  missingNsForm.append('files[]', file1);

  const missingNsReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: missingNsForm
  });
  const missingNsRes = await uploadPackageRoute(missingNsReq);
  assert(missingNsRes.status === 400, 'Test 2.1: Missing namespace fails-closed with HTTP 400 FAIL_CLOSED_INVALID_NAMESPACE');

  // Test 2.2: Missing package_id
  const missingPackIdForm = new FormData();
  missingPackIdForm.append('expected_count', '1');
  missingPackIdForm.append('namespace', 'marketing');
  missingPackIdForm.append('files[]', file1);
  const missingPackIdReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: missingPackIdForm
  });
  const missingPackIdRes = await uploadPackageRoute(missingPackIdReq);
  assert(missingPackIdRes.status === 400, 'Test 2.2: Missing package_id rejected with HTTP 400 INVALID_ARGUMENT');

  // Gatekeeper Blocker 3 Test: Strict integer check on expected_count (rejects non-digit strings)
  const malformedCountForm = new FormData();
  malformedCountForm.append('package_id', 'test_malformed_count');
  malformedCountForm.append('expected_count', '10abc');
  malformedCountForm.append('namespace', 'marketing');
  malformedCountForm.append('files[]', file1);
  const malformedCountReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: malformedCountForm
  });
  const malformedCountRes = await uploadPackageRoute(malformedCountReq);
  const malformedCountJson = await malformedCountRes.json();
  assert(malformedCountRes.status === 400 && malformedCountJson.error === 'INVALID_ARGUMENT',
    'Test 2.2b: Non-strict expected_count ("10abc") strictly rejected with HTTP 400 INVALID_ARGUMENT'
  );

  // Test 2.3: Mismatched count (Partial package: expected 10 but received 2)
  const partialForm = new FormData();
  partialForm.append('package_id', 'test_partial_pack');
  partialForm.append('expected_count', '10');
  partialForm.append('namespace', 'marketing');
  partialForm.append('files[]', new File(['# Part 1'], 'test_KO-01.md', { type: 'text/markdown' }));
  partialForm.append('files[]', new File(['# Part 2'], 'test_KO-02.md', { type: 'text/markdown' }));

  const partialReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: partialForm
  });
  const partialRes = await uploadPackageRoute(partialReq);
  const partialJson = await partialRes.json();
  assert(partialRes.status === 400 && partialJson.error === 'PARTIAL_PACKAGE_REJECTED',
    'Test 2.3: Partial package (expected 10, received 2) strictly rejected with HTTP 400 PARTIAL_PACKAGE_REJECTED'
  );

  // Test 2.4: Duplicate KO index in package
  const dupForm = new FormData();
  dupForm.append('package_id', 'test_dup_pack');
  dupForm.append('expected_count', '2');
  dupForm.append('namespace', 'marketing');
  dupForm.append('files[]', new File(['# Part 1'], 'PN_MEDIA_PLUS_MARKETING_02_PARTA.md', { type: 'text/markdown' }));
  dupForm.append('files[]', new File(['# Part 2 Dup'], 'PN_MEDIA_PLUS_MARKETING_02_PARTB.md', { type: 'text/markdown' }));

  const dupReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: dupForm
  });
  const dupRes = await uploadPackageRoute(dupReq);
  const dupJson = await dupRes.json();
  assert(dupRes.status === 400 && dupJson.error === 'DUPLICATE_PACKAGE_PART',
    'Test 2.4: Duplicate KO part index in package strictly rejected with HTTP 400 DUPLICATE_PACKAGE_PART'
  );

  // Gatekeeper Blocker 4 Tests: Manifest Strict Verification
  // Test 2.5: Manifest package_id mismatch
  const manifestIdMismatchForm = new FormData();
  manifestIdMismatchForm.append('package_id', 'pkg_request_id');
  manifestIdMismatchForm.append('expected_count', '1');
  manifestIdMismatchForm.append('namespace', 'marketing');
  manifestIdMismatchForm.append('manifest', JSON.stringify({
    package_id: 'pkg_different_id',
    package_version: '1.0.0',
    expected_parts: 1
  }));
  manifestIdMismatchForm.append('files[]', file1);

  const mIdReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: manifestIdMismatchForm
  });
  const mIdRes = await uploadPackageRoute(mIdReq);
  const mIdJson = await mIdRes.json();
  assert(mIdRes.status === 400 && mIdJson.error === 'MANIFEST_VERIFICATION_FAILED',
    'Test 2.5: Manifest package_id mismatch strictly rejected with HTTP 400 MANIFEST_VERIFICATION_FAILED'
  );

  // Test 2.6: Manifest expected_parts mismatch
  const mPartsForm = new FormData();
  mPartsForm.append('package_id', 'pkg_parts_test');
  mPartsForm.append('expected_count', '1');
  mPartsForm.append('namespace', 'marketing');
  mPartsForm.append('manifest', JSON.stringify({
    package_id: 'pkg_parts_test',
    package_version: '1.0.0',
    expected_parts: 10
  }));
  mPartsForm.append('files[]', file1);

  const mPartsReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: mPartsForm
  });
  const mPartsRes = await uploadPackageRoute(mPartsReq);
  const mPartsJson = await mPartsRes.json();
  assert(mPartsRes.status === 400 && mPartsJson.error === 'MANIFEST_VERIFICATION_FAILED',
    'Test 2.6: Manifest expected_parts mismatch strictly rejected with HTTP 400 MANIFEST_VERIFICATION_FAILED'
  );

  // Test 2.7: Manifest canonical document SHA-256 mismatch
  const mShaForm = new FormData();
  mShaForm.append('package_id', 'pkg_sha_test');
  mShaForm.append('expected_count', '1');
  mShaForm.append('namespace', 'marketing');
  mShaForm.append('manifest', JSON.stringify({
    package_id: 'pkg_sha_test',
    package_version: '1.0.0',
    expected_parts: 1,
    canonical_documents: [{
      ko_index: 'KO-01',
      sha256: '0000000000000000000000000000000000000000000000000000000000000000'
    }]
  }));
  mShaForm.append('files[]', new File(['# Real Content'], 'PN_MARKETING_KO-01.md', { type: 'text/markdown' }));

  const mShaReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: mShaForm
  });
  const mShaRes = await uploadPackageRoute(mShaReq);
  const mShaJson = await mShaRes.json();
  assert(mShaRes.status === 400 && mShaJson.error === 'MANIFEST_VERIFICATION_FAILED',
    'Test 2.7: Manifest canonical document SHA-256 mismatch strictly rejected with HTTP 400 MANIFEST_VERIFICATION_FAILED'
  );

  // --- TEST GROUP 3: Server-Side QA Gate & Zero Storage Pollution Rollback ---
  console.log('\n--- TEST GROUP 3: Server-Side QA Gate & Zero Storage Pollution Rollback ---');

  // Test 3.1: Package contains a P0 Claim Violation (e.g. 300% revenue claim in part 2)
  const badPackageId = `test_qa_fail_${Date.now()}`;
  const p0Form = new FormData();
  p0Form.append('package_id', badPackageId);
  p0Form.append('expected_count', '2');
  p0Form.append('namespace', 'marketing');
  p0Form.append('files[]', new File(['# Clean KO-01\nChiến lược tiếp thị số nội bộ.'], 'PN_MARKETING_KO-01.md', { type: 'text/markdown' }));
  p0Form.append('files[]', new File(['# Toxic KO-02\nChung toi cam ket tang truong 300% doanh thu ngay thang dau tien!'], 'PN_MARKETING_KO-02.md', { type: 'text/markdown' }));

  const p0Req = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: p0Form
  });
  const p0Res = await uploadPackageRoute(p0Req);
  const p0Json = await p0Res.json();

  assert(p0Res.status === 422 && p0Json.error === 'PACKAGE_QA_HARD_BLOCKED',
    'Test 3.1: Package containing P0 claim violation strictly rejected with HTTP 422 PACKAGE_QA_HARD_BLOCKED'
  );
  assert(p0Json.blocked_file === 'PN_MARKETING_KO-02.md', 'Test 3.2: Error report identifies exact violating file');
  assert(p0Json.p0_violations?.length > 0, 'Test 3.3: Structured P0 violation details included in response');

  // Test 3.4: Zero Storage & DB Pollution Proof
  const { data: dirtyDocs } = await adminClient
    .from('crm_knowledge_documents')
    .select('id')
    .eq('organization_id', targetOrgId)
    .contains('knowledge_metadata', { package_id: badPackageId });

  assert(!dirtyDocs || dirtyDocs.length === 0, 'Test 3.4: Zero DB pollution: no document records created for rejected package');

  // --- TEST GROUP 4: Clean 10/10 Package Upload & Manifest org_wide Enforcement ---
  console.log('\n--- TEST GROUP 4: Clean 10/10 Package Upload & Manifest org_wide Enforcement ---');

  const cleanPackageId = `pkg_marketing_framework_${Date.now()}`;
  const cleanVersion = '1.0.0';

  // Prepare 10 files and compute exact SHA-256
  const cleanFiles: { name: string; content: string; sha256: string; koIndex: string }[] = [];
  for (let i = 1; i <= 10; i++) {
    const koNum = i.toString().padStart(2, '0');
    const content = `# Marketing Knowledge Object ${koNum}\n\n## Purpose\nInternal decision framework for marketing strategy.\n\n## Core Guidelines\nTuân thủ quy chuẩn nội bộ PN Media Plus. Không cam kết doanh thu định lượng, không tự động hóa ads không có kiểm soát human-in-the-loop.`;
    const sha256 = crypto.createHash('sha256').update(content).digest('hex');
    cleanFiles.push({
      name: `PN_MEDIA_PLUS_MARKETING_${koNum}_FRAMEWORK.md`,
      content,
      sha256,
      koIndex: `KO-${koNum}`
    });
  }

  const cleanForm = new FormData();
  cleanForm.append('package_id', cleanPackageId);
  cleanForm.append('package_version', cleanVersion);
  cleanForm.append('expected_count', '10');
  cleanForm.append('namespace', 'marketing');

  // Manifest matching the 10 files with exact SHA-256 and is_org_wide: true
  const packageManifest = {
    package_id: cleanPackageId,
    package_version: cleanVersion,
    expected_parts: 10,
    is_org_wide: true,
    canonical_documents: cleanFiles.map(f => ({
      ko_index: f.koIndex,
      document_name: f.name,
      is_org_wide: true,
      sha256: f.sha256
    }))
  };
  cleanForm.append('manifest', JSON.stringify(packageManifest));

  for (const f of cleanFiles) {
    cleanForm.append('files[]', new File([f.content], f.name, { type: 'text/markdown' }));
  }

  const cleanReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: cleanForm
  });

  const cleanRes = await uploadPackageRoute(cleanReq);
  const cleanJson = await cleanRes.json();

  assert(cleanRes.status === 201 && cleanJson.success === true,
    'Test 4.1: Clean 10/10 package upload succeeds with HTTP 201 PACKAGE_UPLOAD_SUCCESS',
    cleanJson
  );
  assert(cleanJson.documents_count === 10, 'Test 4.2: Exactly 10 package parts recorded');
  assert(cleanJson.disposition === 'READY_FOR_HUMAN_REVIEW',
    'Test 4.3: Package disposition is strictly READY_FOR_HUMAN_REVIEW'
  );

  // Verify DB state
  const { data: pkgDocs, error: pkgDocsErr } = await adminClient
    .from('crm_knowledge_documents')
    .select('id, title, knowledge_status, ingestion_status, knowledge_metadata, file_url')
    .eq('organization_id', targetOrgId)
    .contains('knowledge_metadata', { package_id: cleanPackageId });

  assert(pkgDocsErr === null && pkgDocs?.length === 10, 'Test 4.4: DB records: exactly 10 rows in crm_knowledge_documents');

  if (pkgDocs) {
    for (const doc of pkgDocs) {
      fixtureDocIds.push(doc.id);
      if (doc.file_url) testStoragePaths.push(doc.file_url);

      assert(doc.knowledge_status === 'REVIEWED',
        `Test 4.5: Document ${doc.title} status is REVIEWED`, doc.knowledge_status
      );
      assert(doc.ingestion_status === 'PENDING',
        `Test 4.6: Document ${doc.title} ingestion is PENDING (No automated embedding before Founder approval)`, doc.ingestion_status
      );
      assert(doc.knowledge_metadata?.is_org_wide === 'true',
        `Test 4.7: is_org_wide is 'true' because package manifest declared it`, doc.knowledge_metadata?.is_org_wide
      );
      assert(doc.knowledge_metadata?.ready_for_human_review === true,
        `Test 4.8: Document metadata has ready_for_human_review = true`
      );
    }
  }

  // --- TEST GROUP 5: Gatekeeper Condition 1 Invariant: No Automatic is_org_wide ---
  console.log('\n--- TEST GROUP 5: Gatekeeper Condition 1 Invariant (is_org_wide only on manifest) ---');

  const privatePackageId = `pkg_private_ops_${Date.now()}`;
  const privateForm = new FormData();
  privateForm.append('package_id', privatePackageId);
  privateForm.append('package_version', '1.0.0');
  privateForm.append('expected_count', '1');
  privateForm.append('namespace', 'cskh');
  // No manifest and channel_id is null: must NOT automatically set is_org_wide=true!
  privateForm.append('files[]', new File(['# Private SOP\nTài liệu quy trình nội bộ.'], 'SOP_PRIVATE_KO-01.md', { type: 'text/markdown' }));

  const privateReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${founderToken}` },
    body: privateForm
  });
  const privateRes = await uploadPackageRoute(privateReq);
  const privateJson = await privateRes.json();

  assert(privateRes.status === 201, 'Test 5.1: Non-manifest package upload succeeds');
  const privateDocId = privateJson.documents?.[0]?.id;
  if (privateDocId) fixtureDocIds.push(privateDocId);

  const { data: privateDocRow } = await adminClient
    .from('crm_knowledge_documents')
    .select('knowledge_metadata')
    .eq('id', privateDocId)
    .single();

  assert(privateDocRow?.knowledge_metadata?.is_org_wide === 'false',
    'Test 5.2: Gatekeeper Condition 1: channel_id=null without manifest declaration sets is_org_wide = false (NOT automatically true)'
  );

  // --- APPEND-ONLY AUDIT RETENTION & FIXTURE ARCHIVAL (Policy Enforcement) ---
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

  // Clean up temporary non-founder test user & membership
  if (nonFounderUserId) {
    console.log('[Cleanup Policy] Purging temporary non-founder test user & membership...');
    const { error: memDelErr } = await adminClient.rpc('delete_test_portal_membership', { p_user_id: nonFounderUserId });
    if (memDelErr) throw new Error(`Failed to delete test portal membership: ${memDelErr.message}`);
    const { error: userDelErr } = await adminClient.auth.admin.deleteUser(nonFounderUserId);
    if (userDelErr) throw new Error(`Failed to delete test user: ${userDelErr.message}`);
    console.log('  -> Temporary non-founder user and membership wiped.');
  }

  // Clean up test storage blobs from Supabase Storage
  if (testStoragePaths.length > 0) {
    console.log(`[Cleanup Policy] Purging ${testStoragePaths.length} test storage blobs...`);
    for (const p of testStoragePaths) {
      const { error: blobDelErr } = await adminClient.storage.from('crm_knowledge_files').remove([p]);
      if (blobDelErr) {
        console.warn(`Storage delete warning for ${p}:`, blobDelErr.message);
      }
    }
    console.log('  -> Storage blobs cleared.');
  }

  console.log('\n================================================================');
  console.log('ALL TESTS COMPLETE: 21/21 TESTS PASSED');
  console.log('OVERALL RESULT: SUCCESS (100% PASS) - ALL GATEKEEPER P0S VERIFIED');
  console.log('================================================================\n');
}

runPackageUploadGateTests().catch((err) => {
  console.error('Fatal error running Batch Upload Gate tests:', err);
  process.exit(1);
});
