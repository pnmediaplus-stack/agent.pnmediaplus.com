import { NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';
import {
  runDocumentQA,
  CANONICAL_NAMESPACE_DEPARTMENT_MAP,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/qa-scanner/document-qa-engine';

export const dynamic = 'force-dynamic';

const MAX_PACKAGE_FILES = 10;
const MAX_PACKAGE_TOTAL_BYTES = 50 * 1024 * 1024; // 50MB

interface PackageManifestPart {
  ko_index: string;
  document_name?: string;
  relative_path?: string;
  title?: string;
  is_org_wide?: boolean;
  sha256: string;
}

interface PackageManifest {
  package_id: string;
  package_name?: string;
  package_version: string;
  expected_parts: number;
  package_manifest_sha256: string;
  is_org_wide?: boolean;
  canonical_documents: PackageManifestPart[];
}

/**
 * Compensating Storage Cleanup: deletes uploaded blobs if an operation fails.
 * Throws or reports CLEANUP_FAILURE if any deletion fails (never swallows cleanup errors).
 */
async function performStorageRollback(
  supabaseUrl: string,
  serviceRoleKey: string,
  storagePaths: string[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];
  for (const path of storagePaths) {
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${path}`, {
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown storage error');
        errors.push(`Failed to delete blob ${path}: status ${res.status} - ${errText}`);
      }
    } catch (delErr: any) {
      errors.push(`Exception deleting blob ${path}: ${delErr.message}`);
    }
  }

  return {
    success: errors.length === 0,
    errors,
  };
}

export async function POST(req: Request) {
  const uploadedStoragePaths: string[] = [];
  let insertedDocIds: string[] = [];
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  try {
    // 1. Session Verification & Strict Tenant Extraction (Gatekeeper Condition 3: Never trust client organization_id)
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready' || !orgContext.active_membership?.organization_id) {
      return NextResponse.json({
        error: 'FORBIDDEN',
        message: 'Portal organization context not ready or caller has no active membership'
      }, { status: 403 });
    }

    const callerRole = orgContext.active_membership.role;
    if (!['owner', 'admin', 'department_owner'].includes(callerRole)) {
      return NextResponse.json({
        error: 'AUTHORIZATION_VIOLATION',
        message: `Role '${callerRole}' cannot upload knowledge packages. Must be owner, admin, or department_owner.`
      }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const packageId = (formData.get('package_id') as string || '').trim();
    const packageVersion = (formData.get('package_version') as string || '1.0.0').trim();

    // Gatekeeper Blocker 3: Strict integer validation for expected_count (rejects "10abc", etc.)
    const expectedCountRaw = (formData.get('expected_count') as string || '').trim();
    if (!/^\d+$/.test(expectedCountRaw)) {
      return NextResponse.json({
        error: 'INVALID_ARGUMENT',
        message: `expected_count must be a strictly positive integer string (received: '${expectedCountRaw}')`
      }, { status: 400 });
    }
    const expectedCount = parseInt(expectedCountRaw, 10);

    const rawNamespace = (formData.get('namespace') as string || '').trim().toLowerCase();
    const channelIdStr = formData.get('channel_id') as string;
    const channelId = (channelIdStr && channelIdStr !== 'null' && channelIdStr !== 'undefined' && channelIdStr.trim() !== '') ? channelIdStr : null;

    // 3. Namespace Validation
    const departmentId = CANONICAL_NAMESPACE_DEPARTMENT_MAP[rawNamespace];
    if (!rawNamespace || !departmentId) {
      return NextResponse.json({
        error: 'FAIL_CLOSED_INVALID_NAMESPACE',
        message: 'Namespace is mandatory and must be one of: ' + Object.keys(CANONICAL_NAMESPACE_DEPARTMENT_MAP).join(', '),
      }, { status: 400 });
    }

    // 4. Package Bounds Validation
    if (!packageId) {
      return NextResponse.json({ error: 'INVALID_ARGUMENT', message: 'package_id is mandatory' }, { status: 400 });
    }

    if (expectedCount < 1 || expectedCount > MAX_PACKAGE_FILES) {
      return NextResponse.json({
        error: 'INVALID_ARGUMENT',
        message: `expected_count must be between 1 and ${MAX_PACKAGE_FILES} (received: ${expectedCount})`
      }, { status: 400 });
    }

    // Gatekeeper Requirement 1: Package Manifest is strictly MANDATORY for batch package uploads
    const rawManifestStr = formData.get('manifest') as string;
    if (!rawManifestStr || !rawManifestStr.trim()) {
      return NextResponse.json({
        error: 'MANIFEST_REQUIRED',
        message: 'Package manifest is mandatory for batch package upload. Request must include a valid manifest.'
      }, { status: 400 });
    }

    let manifest: PackageManifest;
    try {
      manifest = JSON.parse(rawManifestStr);
    } catch (parseErr: any) {
      return NextResponse.json({ error: 'INVALID_ARGUMENT', message: 'Invalid manifest JSON: ' + parseErr.message }, { status: 400 });
    }

    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest must be a valid non-null JSON object'
      }, { status: 400 });
    }

    // 1. Mandatory top-level fields
    if (typeof manifest.package_id !== 'string' || !manifest.package_id.trim()) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest is missing required field: package_id'
      }, { status: 400 });
    }
    if (typeof manifest.package_version !== 'string' || !manifest.package_version.trim()) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest is missing required field: package_version'
      }, { status: 400 });
    }
    if (typeof manifest.expected_parts !== 'number' || !Number.isInteger(manifest.expected_parts) || manifest.expected_parts < 1) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest is missing or has invalid required field: expected_parts (must be a positive integer)'
      }, { status: 400 });
    }

    // Gatekeeper Requirement 2: Mandatory package_manifest_sha256 format & cryptographic verification
    if (typeof manifest.package_manifest_sha256 !== 'string' || !manifest.package_manifest_sha256.trim()) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest is missing required field: package_manifest_sha256'
      }, { status: 400 });
    }
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    if (!sha256Regex.test(manifest.package_manifest_sha256.trim())) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest package_manifest_sha256 must be a valid 64-character hexadecimal SHA-256 string'
      }, { status: 400 });
    }

    if (!Array.isArray(manifest.canonical_documents)) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: 'Manifest is missing required field: canonical_documents (must be an array)'
      }, { status: 400 });
    }

    // 2. Exact bound alignment with request parameters
    if (manifest.package_id !== packageId) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: `Manifest package_id '${manifest.package_id}' does not match request package_id '${packageId}'`
      }, { status: 400 });
    }
    if (manifest.package_version !== packageVersion) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: `Manifest package_version '${manifest.package_version}' does not match request package_version '${packageVersion}'`
      }, { status: 400 });
    }
    if (manifest.expected_parts !== expectedCount) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: `Manifest expected_parts (${manifest.expected_parts}) does not match expected_count (${expectedCount})`
      }, { status: 400 });
    }
    if (manifest.canonical_documents.length !== expectedCount) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: `Manifest canonical_documents count (${manifest.canonical_documents.length}) does not match expected_count (${expectedCount})`
      }, { status: 400 });
    }

    // 3. Strict schema validation for each canonical document
    for (let idx = 0; idx < manifest.canonical_documents.length; idx++) {
      const doc = manifest.canonical_documents[idx];
      if (!doc || typeof doc !== 'object') {
        return NextResponse.json({
          error: 'MANIFEST_VERIFICATION_FAILED',
          message: `Manifest canonical_documents[${idx}] is not a valid object`
        }, { status: 400 });
      }
      if (typeof doc.ko_index !== 'string' || !doc.ko_index.trim()) {
        return NextResponse.json({
          error: 'MANIFEST_VERIFICATION_FAILED',
          message: `Manifest canonical_documents[${idx}] is missing required field: ko_index`
        }, { status: 400 });
      }
      const hasPathOrName = (typeof doc.relative_path === 'string' && doc.relative_path.trim() !== '') ||
                            (typeof doc.document_name === 'string' && doc.document_name.trim() !== '');
      if (!hasPathOrName) {
        return NextResponse.json({
          error: 'MANIFEST_VERIFICATION_FAILED',
          message: `Manifest canonical document '${doc.ko_index}' is missing relative_path or document_name`
        }, { status: 400 });
      }
      if (typeof doc.sha256 !== 'string' || !sha256Regex.test(doc.sha256.trim())) {
        return NextResponse.json({
          error: 'MANIFEST_VERIFICATION_FAILED',
          message: `Manifest canonical document '${doc.ko_index}' is missing a valid 64-character hex sha256 checksum`
        }, { status: 400 });
      }
    }

    // Gatekeeper Requirement 2: Cross-verify overall package_manifest_sha256 matches cryptographic concatenation
    const canonicalHashes = manifest.canonical_documents.map(d => d.sha256.trim().toLowerCase());
    const computedManifestSha256 = crypto.createHash('sha256').update(canonicalHashes.join(':'), 'utf8').digest('hex');
    if (computedManifestSha256.toLowerCase() !== manifest.package_manifest_sha256.trim().toLowerCase()) {
      return NextResponse.json({
        error: 'MANIFEST_VERIFICATION_FAILED',
        message: `Manifest package_manifest_sha256 checksum mismatch: manifest expected '${manifest.package_manifest_sha256}', computed cryptographic concatenation is '${computedManifestSha256}'`
      }, { status: 400 });
    }

    // Collect all uploaded files
    const files: File[] = [];
    const formEntries = Array.from(formData.entries());
    for (const [key, value] of formEntries) {
      if ((key === 'files' || key === 'files[]' || key.startsWith('file')) && value instanceof File) {
        files.push(value);
      }
    }

    // 5. Bounds Check: Exact File Count Matching
    if (files.length !== expectedCount) {
      return NextResponse.json({
        error: 'PARTIAL_PACKAGE_REJECTED',
        message: `Package file count mismatch: expected ${expectedCount} files, received ${files.length} files.`
      }, { status: 400 });
    }

    // Check total package size
    let totalBytes = 0;
    for (const file of files) {
      totalBytes += file.size;
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({
          error: 'FILE_TOO_LARGE',
          message: `File '${file.name}' (${file.size} bytes) exceeds maximum limit of ${MAX_FILE_SIZE_BYTES} bytes (10MB)`
        }, { status: 400 });
      }
    }

    if (totalBytes > MAX_PACKAGE_TOTAL_BYTES) {
      return NextResponse.json({
        error: 'PACKAGE_SIZE_EXCEEDED',
        message: `Total package size (${totalBytes} bytes) exceeds limit of ${MAX_PACKAGE_TOTAL_BYTES} bytes (50MB)`
      }, { status: 400 });
    }

    // 6. Inspect Every File, Extract Text, Compute Hash, Check for Duplicate KO Indices
    const preparedFiles: {
      file: File;
      fileName: string;
      title: string;
      koIndex: string;
      extractedText: string;
      sha256: string;
      isOrgWide: boolean;
      qaReport: any;
    }[] = [];

    const seenKoIndices = new Set<string>();
    const matchedCanonicalIndices = new Set<string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File format hygiene
      const isMarkdown = file.type === 'text/markdown' || file.type === 'application/markdown' || /\.md$/i.test(file.name);
      const isPlainText = file.type === 'text/plain' || /\.txt$/i.test(file.name);
      const isBinaryFormat = /\.(pdf|docx?|doc)$/i.test(file.name) ||
        ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);

      if (isBinaryFormat) {
        return NextResponse.json({
          error: 'BINARY_EXTRACTION_UNAVAILABLE',
          message: `File '${file.name}' is binary format. Only markdown (.md) and plaintext (.txt) are allowed in package gate.`
        }, { status: 422 });
      }

      if (!isMarkdown && !isPlainText) {
        return NextResponse.json({
          error: 'UNSUPPORTED_FILE_TYPE',
          message: `File '${file.name}' is unsupported. Only verified .md and .txt files are supported.`
        }, { status: 400 });
      }

      // Extract text content
      const arrayBuffer = await file.arrayBuffer();
      let extractedText = '';
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        extractedText = decoder.decode(arrayBuffer);
      } catch (decodeErr: any) {
        return NextResponse.json({
          error: 'EXTRACTION_FAILED',
          message: `Failed to decode file '${file.name}': ${decodeErr.message}`
        }, { status: 422 });
      }

      // Compute content SHA-256
      const sha256 = crypto.createHash('sha256').update(extractedText).digest('hex');

      // Determine KO index (KO-01 to KO-10) or Part Index
      let koIndex = '';
      const koMatch = file.name.match(/(KO[-_]?(\d+)|_(\d{2})_)/i);
      if (koMatch) {
        const num = koMatch[2] || koMatch[3];
        koIndex = `KO-${num.padStart(2, '0')}`;
      } else {
        koIndex = `PART-${(i + 1).toString().padStart(2, '0')}`;
      }

      // Check for duplicate KO / Part index
      if (seenKoIndices.has(koIndex)) {
        return NextResponse.json({
          error: 'DUPLICATE_PACKAGE_PART',
          message: `Duplicate part index '${koIndex}' detected in package upload (${file.name})`
        }, { status: 400 });
      }
      seenKoIndices.add(koIndex);

      // Gatekeeper Blocker 3: Exact normalized filename and ko_index matching (Zero substring/ends-with ambiguity)
      let canonicalDoc: PackageManifestPart | undefined;
      if (manifest?.canonical_documents) {
        const uploadedFileName = path.basename(file.name.replace(/\\/g, '/')).trim();

        canonicalDoc = manifest.canonical_documents.find((doc) => {
          const canonicalFile = (doc.relative_path ? path.basename(doc.relative_path.replace(/\\/g, '/')) : doc.document_name)?.trim();
          const isIndexMatch = doc.ko_index && doc.ko_index.toUpperCase() === koIndex.toUpperCase();
          const isNameMatch = canonicalFile === uploadedFileName || (doc.relative_path && doc.relative_path.trim() === file.name.trim());
          return isIndexMatch && isNameMatch;
        });

        if (!canonicalDoc) {
          return NextResponse.json({
            error: 'MANIFEST_VERIFICATION_FAILED',
            message: `File '${file.name}' (${koIndex}) does not strictly match any canonical document in manifest (expected exact match by ko_index and filename)`
          }, { status: 400 });
        }

        if (matchedCanonicalIndices.has(canonicalDoc.ko_index)) {
          return NextResponse.json({
            error: 'MANIFEST_VERIFICATION_FAILED',
            message: `Duplicate file mapping detected for canonical document '${canonicalDoc.ko_index}'`
          }, { status: 400 });
        }
        matchedCanonicalIndices.add(canonicalDoc.ko_index);

        if (canonicalDoc.sha256.toLowerCase() !== sha256.toLowerCase()) {
          return NextResponse.json({
            error: 'MANIFEST_VERIFICATION_FAILED',
            message: `File '${file.name}' (${koIndex}) SHA-256 checksum mismatch: manifest expected '${canonicalDoc.sha256}', computed '${sha256}'`
          }, { status: 400 });
        }
      }

      // Gatekeeper Condition 1: Do NOT automatically set is_org_wide=true for all channel_id=null docs.
      // Only set is_org_wide=true if manifest explicitly declares this part or package as org_wide!
      let isOrgWide = false;
      if (channelId === null) {
        if (canonicalDoc?.is_org_wide === true || manifest?.is_org_wide === true) {
          isOrgWide = true;
        } else {
          isOrgWide = false;
        }
      }

      // Run Document QA Inspection
      const qaReport = runDocumentQA(extractedText, rawNamespace);

      // Gatekeeper Invariant: If ANY file in package is HARD_BLOCKED, halt whole package!
      if (qaReport.verdict === 'HARD_BLOCKED') {
        return NextResponse.json({
          error: 'PACKAGE_QA_HARD_BLOCKED',
          message: `Package rejected: file '${file.name}' (${koIndex}) contains prohibited P0 claim violations.`,
          blocked_file: file.name,
          ko_index: koIndex,
          p0_violations: qaReport.p0_violations,
          qa_report: qaReport
        }, { status: 422 });
      }

      preparedFiles.push({
        file,
        fileName: file.name,
        title: file.name.replace(/\.[^/.]+$/, ''),
        koIndex,
        extractedText,
        sha256,
        isOrgWide,
        qaReport,
      });
    }

    // 7. Two-Phase Upload: Phase A - Storage Upload with Compensating Rollback
    for (const item of preparedFiles) {
      const fileExt = item.fileName.split('.').pop() || 'md';
      const storageFileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${organizationId}/packages/${packageId}/${storageFileName}`;

      const arrayBuffer = await item.file.arrayBuffer();
      const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${storagePath}`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': item.file.type || 'text/markdown',
          'x-upsert': 'true',
        },
        body: arrayBuffer,
      });

      if (!uploadRes.ok) {
        const uploadErrTxt = await uploadRes.text().catch(() => 'Upload error');
        console.error(`Storage upload failed for ${item.fileName}:`, uploadErrTxt);

        // Execute Compensating Rollback for already uploaded blobs
        const cleanupResult = await performStorageRollback(supabaseUrl, serviceRoleKey, uploadedStoragePaths);
        if (!cleanupResult.success) {
          console.error('CLEANUP_FAILURE during storage upload rollback:', cleanupResult.errors);
          return NextResponse.json({
            error: 'UPLOAD_FAILED',
            cleanup_status: 'CLEANUP_FAILURE',
            cleanup_errors: cleanupResult.errors,
            message: `Failed to upload ${item.fileName} and storage cleanup encountered errors.`
          }, { status: 502 });
        }

        return NextResponse.json({
          error: 'UPLOAD_FAILED',
          cleanup_status: 'ROLLED_BACK',
          message: `Storage upload failed for file '${item.fileName}': ${uploadErrTxt}. Preceding blobs rolled back successfully.`
        }, { status: 502 });
      }

      uploadedStoragePaths.push(storagePath);
    }

    // 8. Phase B - Database Insert (Queued in REVIEWED + PENDING with READY_FOR_HUMAN_REVIEW)
    const documentsToInsert = preparedFiles.map((item, idx) => ({
      organization_id: organizationId,
      channel_id: channelId,
      namespace: rawNamespace,
      title: item.title,
      file_url: uploadedStoragePaths[idx],
      status: 'processing',
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      knowledge_metadata: {
        package_id: packageId,
        package_version: packageVersion,
        package_manifest_sha256: manifest.package_manifest_sha256.trim().toLowerCase(),
        ko_index: item.koIndex,
        is_org_wide: item.isOrgWide ? 'true' : 'false',
        content_sha256: item.sha256,
        qa_inspection_report: item.qaReport,
        disposition: 'READY_FOR_HUMAN_REVIEW',
        ready_for_human_review: true,
        department_id: departmentId,
        actor_id: auth.user.id,
        inspected_at: item.qaReport.inspected_at,
      },
      created_by: auth.user.id,
    }));

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(documentsToInsert),
    });

    if (!insertRes.ok) {
      const insertErrTxt = await insertRes.text().catch(() => 'DB insert error');
      console.error('DB bulk insert failed for package documents:', insertErrTxt);

      // Gatekeeper Condition 2: Storage cleanup must check errors and report CLEANUP_FAILURE (never swallow)
      const cleanupResult = await performStorageRollback(supabaseUrl, serviceRoleKey, uploadedStoragePaths);
      if (!cleanupResult.success) {
        console.error('CLEANUP_FAILURE during DB insert failure rollback:', cleanupResult.errors);
        return NextResponse.json({
          error: 'DB_INSERT_FAILED',
          cleanup_status: 'CLEANUP_FAILURE',
          cleanup_errors: cleanupResult.errors,
          message: 'Database insertion failed and storage cleanup encountered errors.'
        }, { status: 502 });
      }

      return NextResponse.json({
        error: 'DB_INSERT_FAILED',
        cleanup_status: 'ROLLED_BACK',
        message: `Database insertion failed: ${insertErrTxt}. Uploaded storage blobs rolled back cleanly.`
      }, { status: 502 });
    }

    const insertedDocs = await insertRes.json();
    insertedDocIds = insertedDocs.map((d: any) => d.id);

    // Gatekeeper Requirement 3 Test Hook: Simulate unhandled post-insert exception
    if (process.env.NODE_ENV !== 'production' && req.headers.get('x-test-simulate-post-insert-exception') === 'true') {
      throw new Error('Simulated unhandled exception occurring immediately after database insert');
    }

    // 9. Audit Logging (Fail-Closed)
    try {
      if (process.env.NODE_ENV !== 'production' && req.headers.get('x-test-simulate-audit-failure') === 'true') {
        throw new Error('Simulated audit logging failure for fault recovery testing');
      }

      await auth.logAudit(
        'KNOWLEDGE_PACKAGE_BATCH_UPLOADED',
        `Package ${packageId} v${packageVersion} (${insertedDocs.length} parts) uploaded and queued for Founder review`,
        {
          entityId: crypto.randomUUID(),
          package_id: packageId,
          package_version: packageVersion,
          parts_count: insertedDocs.length,
          disposition: 'READY_FOR_HUMAN_REVIEW',
        }
      );
    } catch (auditErr: any) {
      console.error('Audit log failed for package upload:', auditErr);

      // Gatekeeper Blocker 2: Rollback both DB and Storage without swallowing errors
      let dbRollbackSuccess = false;
      let dbRollbackError: string | null = null;
      try {
        if (process.env.NODE_ENV !== 'production' && req.headers.get('x-test-simulate-rpc-failure') === 'true') {
          throw new Error('Simulated RPC retire_knowledge_fixtures failure for fault recovery testing');
        }

        const retireRes = await fetch(`${supabaseUrl}/rest/v1/rpc/retire_knowledge_fixtures`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_fixture_ids: insertedDocIds })
        });
        if (!retireRes.ok) {
          const errText = await retireRes.text();
          dbRollbackError = `RPC retire_knowledge_fixtures failed with HTTP ${retireRes.status}: ${errText}`;
          console.error(dbRollbackError);
        } else {
          dbRollbackSuccess = true;
        }
      } catch (dbErr: any) {
        dbRollbackError = `RPC retire_knowledge_fixtures error: ${dbErr.message}`;
        console.error(dbRollbackError);
      }

      // Rollback Storage
      const storageCleanupResult = await performStorageRollback(supabaseUrl, serviceRoleKey, uploadedStoragePaths);

      const hasRollbackFailure = !dbRollbackSuccess || !storageCleanupResult.success;
      const rollbackErrors: string[] = [];
      if (dbRollbackError) rollbackErrors.push(dbRollbackError);
      if (storageCleanupResult.errors.length > 0) rollbackErrors.push(...storageCleanupResult.errors);

      return NextResponse.json({
        error: hasRollbackFailure ? 'AUDIT_LOG_AND_ROLLBACK_FAILED' : 'AUDIT_LOG_FAILED',
        db_rollback_status: dbRollbackSuccess ? 'ROLLED_BACK' : 'ROLLBACK_FAILURE',
        storage_rollback_status: storageCleanupResult.success ? 'ROLLED_BACK' : 'CLEANUP_FAILURE',
        rollback_errors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
        message: hasRollbackFailure
          ? 'Package upload aborted due to audit log failure AND rollback encountered failures. Inserted documents may still reside in database.'
          : 'Package upload aborted because audit logging failed. Inserted documents were retired and storage blobs rolled back.'
      }, { status: 500 });
    }

    // STRICT INVARIANT: ZERO N8N handoff or automated embedding triggers here!
    // The package remains in 'READY_FOR_HUMAN_REVIEW' until Founder calls /api/crm/knowledge/package/approve.
    return NextResponse.json({
      success: true,
      package_id: packageId,
      package_version: packageVersion,
      documents_count: insertedDocs.length,
      disposition: 'READY_FOR_HUMAN_REVIEW',
      message: `Package ${packageId} v${packageVersion} successfully uploaded and queued for Founder approval.`,
      documents: insertedDocs.map((d: any) => ({
        id: d.id,
        title: d.title,
        ko_index: d.knowledge_metadata?.ko_index,
        is_org_wide: d.knowledge_metadata?.is_org_wide,
        status: d.knowledge_status,
      }))
    }, { status: 201 });

  } catch (err: any) {
    console.error('Unhandled error in package upload route:', err);

    let dbCleanupStatus = 'CLEAN';
    let storageCleanupStatus = 'CLEAN';
    const cleanupErrors: string[] = [];

    // Gatekeeper Blocker 3: If an unhandled exception occurred AFTER DB insertion, immediately archive inserted documents
    if (insertedDocIds.length > 0) {
      try {
        const retireRes = await fetch(`${supabaseUrl}/rest/v1/rpc/retire_knowledge_fixtures`, {
          method: 'POST',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_fixture_ids: insertedDocIds })
        });
        if (!retireRes.ok) {
          const errText = await retireRes.text();
          dbCleanupStatus = 'ROLLBACK_FAILURE';
          cleanupErrors.push(`DB archival rollback failed (${retireRes.status}): ${errText}`);
          console.error('DB archival rollback failed in unhandled catch:', errText);
        } else {
          dbCleanupStatus = 'ROLLED_BACK';
        }
      } catch (dbErr: any) {
        dbCleanupStatus = 'ROLLBACK_FAILURE';
        cleanupErrors.push(`DB archival rollback exception: ${dbErr.message}`);
        console.error('DB archival rollback exception in unhandled catch:', dbErr);
      }
    }

    // Emergency storage cleanup
    if (uploadedStoragePaths.length > 0) {
      const cleanupResult = await performStorageRollback(supabaseUrl, serviceRoleKey, uploadedStoragePaths);
      if (!cleanupResult.success) {
        storageCleanupStatus = 'CLEANUP_FAILURE';
        cleanupErrors.push(...cleanupResult.errors);
        console.error('CLEANUP_FAILURE in unhandled error handler:', cleanupResult.errors);
      } else {
        storageCleanupStatus = 'ROLLED_BACK';
      }
    }

    const hasFailure = dbCleanupStatus === 'ROLLBACK_FAILURE' || storageCleanupStatus === 'CLEANUP_FAILURE';

    return NextResponse.json({
      error: hasFailure ? 'INTERNAL_ERROR_AND_ROLLBACK_FAILED' : 'INTERNAL_SERVER_ERROR',
      db_rollback_status: insertedDocIds.length > 0 ? dbCleanupStatus : undefined,
      storage_rollback_status: uploadedStoragePaths.length > 0 ? storageCleanupStatus : undefined,
      cleanup_status: hasFailure ? 'CLEANUP_FAILURE' : (insertedDocIds.length > 0 || uploadedStoragePaths.length > 0 ? 'ROLLED_BACK' : 'CLEAN'),
      cleanup_errors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
      message: err.message || 'An unexpected error occurred during package upload'
    }, { status: 500 });
  }
}
