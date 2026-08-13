import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organization_id');
  if (!organizationId) {
     return NextResponse.json({ state: 'blocked', reason: 'MISSING_ORGANIZATION_ID' }, { status: 400 });
  }
  
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  
  if (!supabaseUrl || !supabaseKey) {
     return NextResponse.json({ state: 'blocked', reason: 'SERVER_CONFIGURATION_ERROR' }, { status: 500 });
  }

  // Fetch active integrations for the tenant
  const res = await fetch(`${supabaseUrl}/rest/v1/phase070_tenant_integration_status?organization_id=eq.${organizationId}&select=provider_code,public_metadata`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Accept-Profile': 'public'
    }
  });

  if (!res.ok) {
     const body = await res.text().catch(() => '');
     return NextResponse.json({
       state: 'blocked',
       reason: body ? `DATABASE_ERROR: ${body}` : `DATABASE_ERROR: ${res.status} ${res.statusText}`
     }, { status: 500 });
  }

  const integrations = await res.json();
  
  let textConfig = null;
  let imageConfig = null;

  for (const intg of integrations) {
    const meta = intg.public_metadata || {};
    if (meta.preferred_text_model) {
      textConfig = { provider: intg.provider_code, model: meta.preferred_text_model };
    }
    if (meta.preferred_image_model) {
      imageConfig = { provider: intg.provider_code, model: meta.preferred_image_model };
    }
  }

  if (!imageConfig) {
     return NextResponse.json({ 
       state: 'blocked', 
       reason: `FAIL_CLOSED: Missing preferred image model in tenant metadata (text=${!!textConfig}, image=${!!imageConfig}). Please configure an image model in Tenant Integrations.` 
     }, { status: 200 }); // Status 200 so N8N can parse the 'blocked' state gracefully if using simple HTTP nodes
  }

  if (!textConfig) {
    textConfig = imageConfig;
  }

  return NextResponse.json({
    state: "ready",
    text: textConfig,
    image: imageConfig
  }, { status: 200 });
}
