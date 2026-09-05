import { NextResponse } from 'next/server';
import crypto from 'crypto';
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
  ko_index?: string;
  document_name?: string;
  title?: string;
  is_org_wide?: boolean;
  sha256?: string;
}

interface PackageManifest {
  package_id?: string;
  package_version?: string;
  expected_parts?: number;
  is_org_wide?: boolean;
  canonical_documents?: PackageManifestPart[];
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
    const expectedCountRaw = formData.get('expected_count');
    const expectedCount = expectedCountRaw ? parseInt(expectedCountRaw as string, 10) : 0;
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

    if (isNaN(expectedCount) || expectedCount < 1 || expectedCount > MAX_PACKAGE_FILES) {
      return NextResponse.json({
        error: 'INVALID_ARGUMENT',
        message: `expected_count must be between 1 and ${MAX_PACKAGE_FILES} (received: ${expectedCount})`
      }, { status: 400 });
    }

    // Parse optional manifest if provided
    let manifest: PackageManifest | null = null;
    const rawManifestStr = formData.get('manifest') as string;
    if (rawManifestStr) {
      try {
        manifest = JSON.parse(rawManifestStr);
      } catch (parseErr: any) {
        return NextResponse.json({ error: 'INVALID_ARGUMENT', message: 'Invalid manifest JSON: ' + parseErr.message }, { status: 400 });
      }
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

      // Gatekeeper Condition 1: Do NOT automatically set is_org_wide=true for all channel_id=null docs.
      // Only set is_org_wide=true if manifest explicitly declares this part or package as org_wide!
      let isOrgWide = false;
      if (channelId === null) {
        // Look up in manifest
        const manifestPart = manifest?.canonical_documents?.find(
          (doc) => doc.ko_index === koIndex || doc.document_name === file.name
        );
        if (manifestPart?.is_org_wide === true || manifest?.is_org_wide === true) {
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
        message: `Database insertion failed: ${insertErrTxt}. Uploaded storage blobs rolled back cleanly.`
      }, { status: 502 });
    }

    const insertedDocs = await insertRes.json();

    // 9. Audit Logging (Fail-Closed)
    try {
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
      return NextResponse.json({
        error: 'AUDIT_LOG_FAILED',
        message: 'Package was uploaded but audit logging failed.'
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

    // Emergency cleanup if files were uploaded before unhandled error
    if (uploadedStoragePaths.length > 0) {
      await performStorageRollback(supabaseUrl, serviceRoleKey, uploadedStoragePaths);
    }

    return NextResponse.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred during package upload'
    }, { status: 500 });
  }
}
