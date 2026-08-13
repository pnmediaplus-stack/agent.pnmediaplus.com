import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { invokeLlm } from '@/lib/llm-client';

const GenerateImagePayloadSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
  tenant_id: z.string(), // REQUIRED FOR BILLING
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'generate_image_call', GenerateImagePayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;
  const { prompt } = payload;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  
  const res = await fetch(`${supabaseUrl}/rest/v1/phase070_tenant_integration_status?organization_id=eq.${payload.tenant_id}&select=public_metadata`, {
    headers: {
      'apikey': supabaseKey!,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });

  let model: string | undefined;
  if (res.ok) {
     const json = await res.json();
     for (const row of json) {
       if (row.public_metadata?.preferred_image_model) {
         model = row.public_metadata.preferred_image_model;
         break;
       }
     }
  }
  
  if (!model) {
     return NextResponse.json({ error: 'CONFIG_MISSING', message: 'No preferred image model configured for tenant.' }, { status: 400 });
  }

  // 2. AI Prompt System (Optimize for DALL-E)
  const enhancedPrompt = `Professional high-quality promotional image for social media marketing. Style: Modern, vibrant, professional. Subject: ${prompt}. No text in the image.`;

  try {
    const responseData = await invokeLlm({
      model: model,
      prompt: enhancedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    }, {
      actorId: 'n8n_image_generator',
      tenantId: payload.tenant_id, // STRICT TENANT SCOPE
      requestId: req.headers.get('x-request-id') || 'unknown'
    });

    // Success
    await logCompletion('ACCEPTED', 'Image generation succeeded', { model });
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    const errorMsg = `Image Generator Error: ${error.message}`;
    await logCompletion('FAILED', errorMsg);
    
    if (error.message && error.message.includes('LLM_QUOTA_EXCEEDED')) {
       return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED', message: error.message }, { status: 429 });
    }
    
    return NextResponse.json({ error: 'LLM_ERROR', message: errorMsg }, { status: 502 });
  }
}
