import crypto from 'crypto';

export interface PackageApprovalPayload {
  organizationId: string;
  packageId: string;
  packageVersion: string;
  expectedParts: number;
  expectedManifestSha256: string;
  callerId: string;
}

export interface SignedPackageApproval {
  nonce: string;
  timestamp: string;
  signature: string;
}

/**
 * Production-grade Server-side HMAC-SHA256 Signer for Knowledge Package Approvals
 * Reads secret strictly from environment variable KNOWLEDGE_APPROVAL_SECRET
 * Formats canonical message strictly matching PostgreSQL approve_knowledge_package RPC
 */
export function createPackageApprovalSignature(
  payload: PackageApprovalPayload,
  secretOverride?: string
): SignedPackageApproval {
  const secret = secretOverride || process.env.KNOWLEDGE_APPROVAL_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error('KNOWLEDGE_APPROVAL_SECRET must be configured with at least 32 characters.');
  }

  const nonce = crypto.randomUUID();
  // Canonical ISO-8601 UTC timestamp format without milliseconds: YYYY-MM-DDTHH:MM:SSZ
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Canonical message string: org_id:package_id:version:manifest_hash:parts:nonce:timestamp:caller_id
  const canonicalMessage = `${payload.organizationId}:${payload.packageId}:${payload.packageVersion}:${payload.expectedManifestSha256}:${payload.expectedParts}:${nonce}:${timestamp}:${payload.callerId}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(canonicalMessage, 'utf8')
    .digest('hex');

  return {
    nonce,
    timestamp,
    signature,
  };
}
