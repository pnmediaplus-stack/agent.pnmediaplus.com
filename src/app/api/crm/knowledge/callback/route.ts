import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_CLOCK_SKEW_MS = 300_000; // 5 minutes

const IngestionCallbackPayloadSchema = z.object({
  document_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  status: z.enum(['SUCCESS', 'FAILED']),
  correlation_id: z.string().min(1).max(255),
  ingestion_run_id: z.string().uuid().optional().nullable(),
  retry_attempt: z.number().int().min(0).default(0),
  error_message: z.string().max(1000).optional().nullable(),
});

function getWebhookSecrets(): string[] {
  const secretEnv = process.env.N8N_WEBHOOK_SECRET || '';
  return secretEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function verifyHmacSignature(
  rawBody: Buffer,
  timestampStr: string,
  receivedSignature: string,
  secrets: string[]
): boolean {
  if (!receivedSignature || secrets.length === 0) return false;

  const cleanSignature = receivedSignature.startsWith('sha256=')
    ? receivedSignature.slice(7)
    : receivedSignature;

  const stringToSign = `${timestampStr}.${rawBody.toString('utf8')}`;

  for (const secret of secrets) {
    const computedHex = crypto
      .createHmac('sha256', secret)
      .update(stringToSign)
      .digest('hex');

    if (computedHex.length === cleanSignature.length) {
      try {
        const computedBuf = Buffer.from(computedHex, 'hex');
        const receivedBuf = Buffer.from(cleanSignature, 'hex');
        if (
          computedBuf.length === receivedBuf.length &&
          crypto.timingSafeEqual(computedBuf, receivedBuf)
        ) {
          return true;
        }
      } catch {
        // Continue checking other secrets if format invalid
      }
    }
  }

  return false;
}

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') || req.headers.get('x-n8n-event-id') || 'unknown';

  // 1. Read Raw Body as Buffer (preserves exact bytes for HMAC)
  let rawBodyBuffer: Buffer;
  try {
    const arrayBuffer = await req.arrayBuffer();
    rawBodyBuffer = Buffer.from(arrayBuffer);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Unable to read raw body' },
      { status: 400 }
    );
  }

  // 2. Validate Timestamp (Anti-Replay Window)
  const timestampHeader = req.headers.get('x-n8n-timestamp') || req.headers.get('x-timestamp');
  if (!timestampHeader) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Missing timestamp header' },
      { status: 401 }
    );
  }

  const timestampNum = Number(timestampHeader);
  const timestampMs = isNaN(timestampNum) ? Date.parse(timestampHeader) : timestampNum;

  if (isNaN(timestampMs)) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', message: 'Invalid timestamp format' },
      { status: 400 }
    );
  }

  const nowMs = Date.now();
  if (Math.abs(nowMs - timestampMs) > MAX_CLOCK_SKEW_MS) {
    return NextResponse.json(
      {
        error: 'UNAUTHORIZED',
        code: 'STALE_TIMESTAMP',
        message: 'Timestamp clock skew exceeds allowable window (5 minutes)',
      },
      { status: 401 }
    );
  }

  // 3. Verify HMAC Signature
  const signatureHeader =
    req.headers.get('x-n8n-signature') ||
    req.headers.get('x-signature-256') ||
    req.headers.get('x-hub-signature-256');

  if (!signatureHeader) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', code: 'MISSING_SIGNATURE', message: 'Missing signature header' },
      { status: 401 }
    );
  }

  const secrets = getWebhookSecrets();
  if (secrets.length === 0) {
    console.error('[Knowledge Webhook Callback] N8N_WEBHOOK_SECRET is not configured on server.');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Webhook authentication not configured' },
      { status: 500 }
    );
  }

  const isHmacValid = verifyHmacSignature(rawBodyBuffer, timestampHeader, signatureHeader, secrets);
  if (!isHmacValid) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', code: 'INVALID_SIGNATURE', message: 'HMAC signature mismatch' },
      { status: 401 }
    );
  }

  // 4. Parse JSON & Validate Payload Schema
  let parsedJson: any;
  try {
    parsedJson = JSON.parse(rawBodyBuffer.toString('utf8'));
  } catch (err) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', code: 'MALFORMED_JSON', message: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  const parseResult = IngestionCallbackPayloadSchema.safeParse(parsedJson);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: 'BAD_REQUEST',
        code: 'MALFORMED_PAYLOAD',
        message: 'Payload validation failed',
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const payload = parseResult.data;

  // 5. Compute Canonical Payload Hash (SHA-256) over full payload fields
  const canonicalPayload = {
    document_id: payload.document_id,
    organization_id: payload.organization_id,
    status: payload.status,
    correlation_id: payload.correlation_id,
    ingestion_run_id: payload.ingestion_run_id || null,
    retry_attempt: payload.retry_attempt || 0,
    error_message: payload.error_message || null,
  };

  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload))
    .digest('hex');

  // 6. Execute Atomic Transaction via Supabase RPC (service_role)
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    .trim()
    .replace(/\/$/, '');
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Supabase credentials missing on server' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    'apply_knowledge_ingestion_callback',
    {
      p_document_id: payload.document_id,
      p_organization_id: payload.organization_id,
      p_status: payload.status,
      p_correlation_id: payload.correlation_id,
      p_payload_hash: payloadHash,
      p_ingestion_run_id: payload.ingestion_run_id || null,
      p_retry_attempt: payload.retry_attempt || 0,
      p_error_message: payload.error_message || null,
    }
  );

  if (rpcError) {
    console.error(`[Knowledge Callback] RPC execution error (requestId=${requestId}):`, rpcError.message);
    if (rpcError.message?.includes('SECURITY_VIOLATION')) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Security violation during callback execution' },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Database callback execution failed' },
      { status: 500 }
    );
  }

  // 7. Map Response Codes
  if (!rpcResult || typeof rpcResult !== 'object') {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Unexpected RPC result format' },
      { status: 500 }
    );
  }

  if (rpcResult.status === 'NOT_FOUND') {
    return NextResponse.json(
      { error: 'DOCUMENT_NOT_FOUND', message: rpcResult.message },
      { status: 404 }
    );
  }

  if (rpcResult.status === 'IDEMPOTENCY_CONFLICT') {
    return NextResponse.json(
      {
        error: 'IDEMPOTENCY_CONFLICT',
        message: rpcResult.message,
        correlation_id: payload.correlation_id,
      },
      { status: 409 }
    );
  }

  if (rpcResult.status === 'IDEMPOTENT_ACK' || rpcResult.is_duplicate === true) {
    return NextResponse.json(
      {
        success: true,
        duplicate: true,
        status: 'IDEMPOTENT_ACK',
        message: rpcResult.message || 'Idempotent retry acknowledged safely',
        document_id: rpcResult.document_id,
      },
      { status: 200 }
    );
  }

  if (rpcResult.status === 'PROCESSED' || rpcResult.success === true) {
    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        status: 'PROCESSED',
        data: {
          document_id: rpcResult.document_id,
          knowledge_status: rpcResult.knowledge_status,
          ingestion_status: rpcResult.ingestion_status,
        },
      },
      { status: 200 }
    );
  }

  return NextResponse.json(rpcResult, { status: 200 });
}
