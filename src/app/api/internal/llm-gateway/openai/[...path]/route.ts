import { NextResponse } from 'next/server';
import { invokeLlm } from '@/lib/llm-client';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    let pathSegments = resolvedParams.path;
    let pathOrgId = null;

    if (pathSegments.length >= 2 && pathSegments[0] === 'org') {
      pathOrgId = pathSegments[1];
      pathSegments = pathSegments.slice(2);
    }

    const pathJoined = pathSegments.join('/');

    const authHeader = req.headers.get('Authorization') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const expectedSecret = process.env.N8N_API_KEY || process.env.CONTROL_PLANE_SECRET;

    // Secure authentication using internal service token
    if (!expectedSecret || bearerToken !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid internal service token in Authorization header' }, { status: 401 });
    }

    const organizationId = pathOrgId;
    if (!organizationId || organizationId.length < 10) {
      return NextResponse.json({ error: 'Bad Request: Missing organization ID in URL path (/org/[id]/...)' }, { status: 400 });
    }
    
    // 1. Strict Endpoint Filtering (Least Privilege)
    if (!pathJoined.includes('chat/completions') && !pathJoined.includes('embeddings')) {
      return NextResponse.json({ error: 'Forbidden: Unsupported endpoint. Only chat/completions and embeddings are allowed.' }, { status: 403 });
    }

    const payload = await req.json();

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
      { status: error.message.includes('LLM_QUOTA_EXCEEDED') ? 402 : 400 }
    );
  }
}
