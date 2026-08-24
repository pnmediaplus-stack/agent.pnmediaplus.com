import { NextResponse } from 'next/server';
import { invokeLlm } from '@/lib/llm-client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const organizationId = authHeader.replace('Bearer ', '').trim();
    
    if (!organizationId || organizationId.length < 10) {
      return NextResponse.json({ error: 'Unauthorized: Missing or invalid organization_id in Bearer token' }, { status: 401 });
    }

    const payload = await req.json();
    const pathJoined = params.path.join('/');
    
    // 1. Strict Endpoint Filtering (Least Privilege)
    if (!pathJoined.includes('chat/completions') && !pathJoined.includes('embeddings')) {
      return NextResponse.json({ error: 'Forbidden: Unsupported endpoint. Only chat/completions and embeddings are allowed.' }, { status: 403 });
    }

    // Force provider
    payload.provider = 'openai';

    // 2. Invoke LLM with Atomic Ledger & Idempotency
    const requestId = req.headers.get('x-request-id') || req.headers.get('x-amzn-trace-id') || crypto.randomUUID();
    
    const result = await invokeLlm(
      payload,
      {
        tenantId: organizationId,
        actorId: '00000000-0000-0000-0000-000000000000', // System service actor
        requestId: requestId,
        endpointUrl: `https://api.openai.com/${pathJoined}` // Removed hardcoded v1 to prevent duplicate
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('LLM Gateway Error:', error);
    return NextResponse.json(
      { error: { message: error.message, type: 'gateway_error' } }, 
      { status: error.message.includes('LLM_QUOTA_EXCEEDED') ? 402 : 502 }
    );
  }
}
