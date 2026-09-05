import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { POST as uploadPackageRoute } from '../src/app/api/crm/knowledge/package/upload/route';
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

const dynamicSecret = crypto.randomBytes(32).toString('hex');

interface TestResult {
  passed: boolean;
  name: string;
  detail?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail?: any) {
  results.push({ passed: condition, name, detail: detail ? String(detail) : undefined });
  if (condition) {
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${typeof detail === 'object' ? JSON.stringify(detail) : detail}` : ''}`);
    process.exit(1);
  }
}

async function runPhase3VerticalSlice() {
  console.log('================================================================');
  console.log('PHASE 3 VERTICAL SLICE EXECUTION & UI ACCEPTANCE (DB CLONE)');
  console.log('Target DB:', supabaseUrl);
  console.log('Production Boundary: STRICTLY_FORBIDDEN (0 mutations to Prod)');
  console.log('================================================================\n');

  const fixtureDocIds: string[] = [];
  const testStoragePaths: string[] = [];

  try {
    // -------------------------------------------------------------
    // SETUP 1: Dynamic HMAC Secret Injection into private vault
    // -------------------------------------------------------------
    console.log('[Setup 1] Injecting dynamic secret into private.knowledge_auth_secrets...');
    const { error: secretErr } = await adminClient.rpc('set_knowledge_auth_secret', {
      p_key: 'PACKAGE_APPROVAL_HMAC_SECRET',
      p_val: dynamicSecret
    });
    if (secretErr) throw new Error(`Failed to inject secret: ${secretErr.message}`);
    process.env.KNOWLEDGE_APPROVAL_SECRET = dynamicSecret;
    console.log('  -> Dynamic secret seeded in vault and process.env.');

    // -------------------------------------------------------------
    // SETUP 2: Authenticate genuine Founder session
    // -------------------------------------------------------------
    console.log('[Setup 2] Authenticating genuine Founder user session (pnmediaplus@gmail.com)...');
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
      throw new Error('Founder user has no active organization membership');
    }

    const targetOrgId = memberRows[0].organization_id;
    console.log(`  -> Founder authenticated: id=${founderUserId} | Org=${targetOrgId} | Role=${memberRows[0].role}\n`);

    // -------------------------------------------------------------
    // STAGE 1: Package Preparation & Disk Checksum Verification
    // -------------------------------------------------------------
    console.log('--- STAGE 1: Package Manifest & Canonical Document Verification ---');
    const marketingDir = path.resolve(process.cwd(), 'knowledge/marketing');
    const manifestPath = path.join(marketingDir, 'MARKETING_FRAMEWORK_MANIFEST.json');
    assert(fs.existsSync(manifestPath), 'Stage 1.1: MARKETING_FRAMEWORK_MANIFEST.json exists on disk');
    const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    assert(manifestJson.canonical_documents.length === 10, 'Stage 1.2: Manifest declares exactly 10 canonical documents');

    // Verify each canonical file exists and compute hash
    const filesToUpload: { name: string; content: string; koIndex: string; title: string }[] = [];
    for (const doc of manifestJson.canonical_documents) {
      const filePath = path.join(marketingDir, doc.relative_path);
      assert(fs.existsSync(filePath), `Stage 1.3: Document file exists: ${doc.relative_path}`);
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
      assert(hash === doc.sha256, `Stage 1.4: Document ${doc.ko_index} checksum matches manifest exactly`);
      filesToUpload.push({
        name: path.basename(doc.relative_path),
        content,
        koIndex: doc.ko_index,
        title: doc.title
      });
    }

    // Pre-cleanup: retire any active rows for this package from prior runs
    const { data: preExisting } = await adminClient
      .from('crm_knowledge_documents')
      .select('id')
      .eq('organization_id', targetOrgId)
      .eq('knowledge_metadata->>package_id', manifestJson.package_id)
      .neq('knowledge_status', 'ARCHIVED');

    if (preExisting && preExisting.length > 0) {
      await adminClient.rpc('retire_knowledge_fixtures', {
        p_fixture_ids: preExisting.map((r: any) => r.id)
      });
    }

    // -------------------------------------------------------------
    // STAGE 2: Batch Package Upload via HTTP Route
    // -------------------------------------------------------------
    console.log('\n--- STAGE 2: Batch Upload via /api/crm/knowledge/package/upload ---');
    const form = new FormData();
    form.append('package_id', manifestJson.package_id);
    form.append('package_version', manifestJson.package_version);
    form.append('expected_count', '10');
    form.append('namespace', 'marketing');

    // Include is_org_wide: true in manifest for framework package
    const uploadManifest = {
      ...manifestJson,
      is_org_wide: true,
      canonical_documents: manifestJson.canonical_documents.map((d: any) => ({
        ...d,
        document_name: path.basename(d.relative_path),
        is_org_wide: true
      }))
    };
    form.append('manifest', JSON.stringify(uploadManifest));

    for (const f of filesToUpload) {
      form.append('files[]', new File([f.content], f.name, { type: 'text/markdown' }));
    }

    const uploadReq = new Request('http://localhost/api/crm/knowledge/package/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${founderToken}`
      },
      body: form
    });

    const uploadRes = await uploadPackageRoute(uploadReq);
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 201, 'Stage 2.1: Batch upload route returns HTTP 201', uploadData);
    assert(uploadData.success === true, 'Stage 2.2: Response success is true');
    assert(uploadData.documents_count === 10, 'Stage 2.3: Documents count is 10');
    assert(uploadData.disposition === 'READY_FOR_HUMAN_REVIEW', 'Stage 2.4: Disposition is READY_FOR_HUMAN_REVIEW');

    const uploadedDocIds: string[] = uploadData.documents.map((d: any) => d.id);
    assert(uploadedDocIds.length === 10, 'Stage 2.5: Exactly 10 documents created in response');
    fixtureDocIds.push(...uploadedDocIds);

    // -------------------------------------------------------------
    // STAGE 3: UI Dashboard State & Pre-Approval Gatekeeper Invariant
    // -------------------------------------------------------------
    console.log('\n--- STAGE 3: UI Presentation & Pre-Approval Gate Invariant ---');
    const { data: dbDocs, error: dbFetchErr } = await adminClient
      .from('crm_knowledge_documents')
      .select('id, title, file_url, knowledge_status, ingestion_status, knowledge_metadata')
      .in('id', uploadedDocIds);

    assert(!dbFetchErr && dbDocs?.length === 10, 'Stage 3.1: All 10 documents queried from DB', { error: dbFetchErr?.message, found: dbDocs?.length, uploadedDocIds });

    for (const doc of dbDocs!) {
      testStoragePaths.push(doc.file_url);
      assert(doc.knowledge_status === 'REVIEWED', `Stage 3.2: Doc ${doc.title} status is REVIEWED`);
      assert(doc.ingestion_status === 'PENDING', `Stage 3.3: Doc ${doc.title} ingestion_status is PENDING`);
      assert(doc.knowledge_metadata?.is_framework === 'true', `Stage 3.4: Doc ${doc.title} is_framework is true in metadata`);
      assert(doc.knowledge_metadata?.is_org_wide === 'true', `Stage 3.5: Doc ${doc.title} is_org_wide is true in metadata`);
      assert(doc.knowledge_metadata?.ready_for_human_review === true, `Stage 3.6: Doc ${doc.title} ready_for_human_review is true`);
      assert(doc.knowledge_metadata?.qa_inspection_report?.verdict === 'REVIEW_RECOMMENDED', `Stage 3.7: Doc ${doc.title} QA verdict is REVIEW_RECOMMENDED`);
      assert(doc.knowledge_metadata?.qa_inspection_report?.p0_violations?.length === 0, `Stage 3.8: Doc ${doc.title} has 0 P0 violations`);
      assert(JSON.stringify(doc.knowledge_metadata?.allowed_purposes) === JSON.stringify(['internal_reasoning', 'planning']), `Stage 3.8b: Doc ${doc.title} allowed_purposes matches canonical Marketing contract`);
      assert(JSON.stringify(doc.knowledge_metadata?.evidence_basis) === JSON.stringify(['reviewed_framework_baseline']), `Stage 3.8c: Doc ${doc.title} evidence_basis matches canonical Marketing contract`);
      assert(doc.knowledge_metadata?.usage_authority === 'internal_reasoning_only', `Stage 3.8d: Doc ${doc.title} usage_authority is internal_reasoning_only`);
    }

    // CRITICAL GATEKEEPER INVARIANT: Zero chunks in DB before approval!
    const { data: preApprovalChunks, error: chunkPreErr } = await adminClient
      .from('crm_knowledge_chunks')
      .select('id')
      .in('document_id', uploadedDocIds);

    assert(!chunkPreErr && (preApprovalChunks?.length || 0) === 0, 'Stage 3.9: INVARIANT: Zero chunks exist before Founder Approval');

    // -------------------------------------------------------------
    // STAGE 4: Founder/Owner Approval via HTTP Route
    // -------------------------------------------------------------
    console.log('\n--- STAGE 4: Founder/Owner Cryptographic Approval via Route ---');
    const approveReq = new Request('http://localhost/api/crm/knowledge/package/approve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${founderToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        packageId: manifestJson.package_id,
        packageVersion: manifestJson.package_version,
        expectedParts: 10,
        expectedManifestSha256: manifestJson.package_manifest_sha256
      })
    });

    const approveRes = await approvePackageRoute(approveReq);
    const approveData = await approveRes.json();
    assert(approveRes.status === 200, 'Stage 4.1: Founder approval route returns HTTP 200', approveData);
    assert(approveData.success === true, 'Stage 4.2: Approval success is true');
    assert(approveData.result?.status === 'PACKAGE_APPROVED', 'Stage 4.3: Package status is PACKAGE_APPROVED');
    assert(approveData.result?.transitioned_now === true, 'Stage 4.4: Result records transitioned_now = true');
    assert(approveData.result?.transitioned_doc_ids?.length === 10, 'Stage 4.5: Result records 10 transitioned_doc_ids');

    // Verify DB state after approval
    const { data: approvedDocs, error: appFetchErr } = await adminClient
      .from('crm_knowledge_documents')
      .select('id, knowledge_status')
      .in('id', uploadedDocIds);

    assert(!appFetchErr && approvedDocs?.length === 10, 'Stage 4.6: Queried approved docs from DB');
    for (const doc of approvedDocs!) {
      assert(doc.knowledge_status === 'APPROVED', `Stage 4.7: Doc ${doc.id} atomically transitioned to APPROVED`);
    }

    // Verify Authoritative Audit Log
    const { data: auditLogs, error: auditErr } = await adminClient
      .from('phase1_audit_logs')
      .select('*')
      .eq('action', 'KNOWLEDGE_PACKAGE_APPROVED')
      .order('createdAt', { ascending: false })
      .limit(1);

    assert(!auditErr && Boolean(auditLogs && auditLogs.length > 0 && auditLogs[0].details?.includes(manifestJson.package_id)), 'Stage 4.8: Authoritative audit log verified in phase1_audit_logs', { auditLogs, auditErr });

    // -------------------------------------------------------------
    // STAGE 5: Post-Approval Ingestion & Activation
    // -------------------------------------------------------------
    console.log('\n--- STAGE 5: Post-Approval Content Chunking & Ingestion Activation ---');
    // For vertical slice demonstration, activate KO-01
    const ko01Doc = uploadData.documents.find((d: any) => d.ko_index === 'KO-01' || d.title.includes('01'));
    assert(!!ko01Doc, 'Stage 5.1: Found KO-01 document');

    // Insert genuine chunk for KO-01 with is_framework = true
    const sampleEmbedding = new Array(1536).fill(0.0123);
    const { data: insertedChunk, error: chunkInsErr } = await adminClient
      .from('crm_knowledge_chunks')
      .insert({
        document_id: ko01Doc.id,
        organization_id: targetOrgId,
        content: 'Bản Hiến Pháp Nhận Thức Marketing PN Media Plus: Mọi chiến dịch và quyết định phải có cơ sở bằng chứng xác thực (Ground Truth). Cấm tuyệt đối tuyên bố doanh thu định lượng hoặc chạy ads tự động 100%.',
        metadata: {
          ko_id: 'KO-01',
          namespace: 'marketing',
          object_class: 'governance',
          semantic_type: 'recommendation',
          is_framework: 'true',
          document_type: 'DECISION_FRAMEWORK'
        },
        embedding: sampleEmbedding
      })
      .select()
      .single();

    assert(!chunkInsErr && !!insertedChunk, 'Stage 5.2: Framework content chunk inserted into crm_knowledge_chunks', chunkInsErr);

    // 1. Ingestion worker starts: PENDING -> PROCESSING
    const { data: startIngestRes, error: procErr } = await adminClient.rpc('start_knowledge_ingestion', {
      p_organization_id: targetOrgId,
      p_document_id: ko01Doc.id,
      p_correlation_id: `vs-start-${Date.now()}`
    });
    assert(!procErr && startIngestRes?.success === true, 'Stage 5.2b: Ingestion status moved to PROCESSING', procErr || startIngestRes);

    // 2. Call apply_knowledge_ingestion_callback with SUCCESS (activates document)
    const correlationId = `vs-ingest-${Date.now()}`;
    const payloadHash = crypto.createHash('sha256').update(correlationId).digest('hex');

    const { data: callbackRes, error: callbackErr } = await adminClient.rpc('apply_knowledge_ingestion_callback', {
      p_document_id: ko01Doc.id,
      p_organization_id: targetOrgId,
      p_status: 'SUCCESS',
      p_correlation_id: correlationId,
      p_payload_hash: payloadHash,
      p_retry_attempt: 0
    });

    assert(!callbackErr && callbackRes?.success === true, 'Stage 5.3: Ingestion callback executed with SUCCESS', callbackErr || callbackRes);

    // 3. Activate full package for retrieval by setting package_status = PACKAGE_ACTIVE in metadata
    const { data: currentApprovedDocs } = await adminClient
      .from('crm_knowledge_documents')
      .select('id, knowledge_metadata')
      .in('id', uploadedDocIds);

    let activateAllOk = true;
    for (const doc of currentApprovedDocs || []) {
      const { error: actErr } = await adminClient
        .from('crm_knowledge_documents')
        .update({
          knowledge_metadata: {
            ...doc.knowledge_metadata,
            package_status: 'PACKAGE_ACTIVE'
          }
        })
        .eq('id', doc.id);
      if (actErr) {
        console.error('Activation error for doc', doc.id, actErr);
        activateAllOk = false;
      }
    }

    assert(activateAllOk, 'Stage 5.4: Package documents transitioned to PACKAGE_ACTIVE');

    // -------------------------------------------------------------
    // STAGE 6: Dual-RAG Retrieval & Absolute Isolation Verification
    // -------------------------------------------------------------
    console.log('\n--- STAGE 6: Dual-RAG Retrieval & Absolute Isolation Verification ---');

    // 6.1 Marketing Framework RAG query using authenticated Founder JWT
    const founderUserClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${founderToken}` } },
      auth: { persistSession: false }
    });

    const { data: mktChunks, error: mktErr } = await founderUserClient.rpc('match_marketing_framework', {
      query_embedding: sampleEmbedding,
      match_count: 5,
      p_package_id: manifestJson.package_id,
      p_organization_id: targetOrgId
    });

    assert(!mktErr, 'Stage 6.1: match_marketing_framework executes without error', mktErr?.message);
    assert(mktChunks && mktChunks.length > 0, 'Stage 6.2: Marketing query returns the activated framework chunk');

    // 6.2 CSKH Dedicated RAG query: Must return ZERO framework chunks
    const { data: cskhChunks, error: cskhErr } = await founderUserClient.rpc('match_cskh_knowledge', {
      query_embedding: sampleEmbedding,
      match_count: 5,
      p_organization_id: targetOrgId
    });

    assert(!cskhErr, 'Stage 6.3: match_cskh_knowledge executes without error', cskhErr?.message);
    assert(!cskhChunks || cskhChunks.length === 0, 'Stage 6.4: CSKH query returns STRICTLY ZERO framework chunks (Total Isolation)');

    // 6.3 Legacy match_documents: Must return ZERO framework chunks (Backdoor Sealed)
    const { data: legacyChunks, error: legacyErr } = await founderUserClient.rpc('match_documents', {
      query_embedding: sampleEmbedding,
      match_count: 5,
      filter: { organization_id: targetOrgId }
    });

    assert(!legacyErr, 'Stage 6.5: legacy match_documents executes without error', legacyErr?.message);
    assert(!legacyChunks || legacyChunks.length === 0, 'Stage 6.6: Legacy match_documents returns STRICTLY ZERO framework chunks (Backdoor Sealed)');

    // 6.4 Alien Tenant query: Must return ZERO chunks (Cross-Tenant Fail-Closed)
    const alienOrgId = 'aaaaaaaa-cccc-cccc-cccc-000000000001';
    const { data: alienMktChunks, error: alienMktErr } = await founderUserClient.rpc('match_marketing_framework', {
      query_embedding: sampleEmbedding,
      match_count: 5,
      p_package_id: manifestJson.package_id,
      p_organization_id: alienOrgId
    });

    assert(Boolean(alienMktErr || !alienMktChunks || alienMktChunks.length === 0), 'Stage 6.7: Alien tenant query returns STRICTLY ZERO chunks');

    console.log('\n================================================================');
    console.log(`VERTICAL SLICE COMPLETED SUCCESSFULLY: ${results.filter(r => r.passed).length}/${results.length} PASS`);
    console.log('================================================================\n');

  } finally {
    // -------------------------------------------------------------
    // STAGE 7: Append-Only Fixture Archival & Cleanup
    // -------------------------------------------------------------
    console.log('--- APPEND-ONLY AUDIT RETENTION & FIXTURE ARCHIVAL ---');
    if (fixtureDocIds.length > 0) {
      const { error: retireErr } = await adminClient.rpc('retire_knowledge_fixtures', {
        p_fixture_ids: fixtureDocIds
      });
      if (retireErr) {
        console.warn('Retire RPC warning:', retireErr.message);
      } else {
        console.log(`  -> Vertical slice fixtures safely retired to ARCHIVED (Append-Only preserved).`);
      }
    }

    if (testStoragePaths.length > 0) {
      console.log(`[Cleanup] Removing ${testStoragePaths.length} temporary storage blobs...`);
      await adminClient.storage.from('crm_knowledge_files').remove(testStoragePaths);
      console.log(`  -> Storage blobs cleared.`);
    }

    // Wipe dynamic test secret
    await adminClient.rpc('set_knowledge_auth_secret', {
      p_key: 'PACKAGE_APPROVAL_HMAC_SECRET',
      p_val: ''
    });
    console.log('  -> Dynamic secret wiped from vault.');
  }
}

runPhase3VerticalSlice().catch(err => {
  console.error('Fatal error during vertical slice:', err);
  process.exit(1);
});
