import { NextRequest, NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { uploadBufferToR2, deleteObjectFromR2 } from '@/lib/r2-client';
import { createServiceRoleClient } from '@/lib/supabase-server';

const ALLOWED_KEYS = ['chat_dashboard_banner', 'finance_dashboard_banner'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyUiAuth<any>(req);
    if (!authResult.ok) return authResult.response;
    const { user } = authResult;

    const supabase = createServiceRoleClient();
    
    // Get user's membership to check role and org
    const { data: memberships } = await supabase
      .from('portal_organization_memberships')
      .select('organization_id, role')
      .eq('user_id', user.id);
      
    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 });
    }
    
    // Pick the first membership for now (or expect org in form data if multi-org)
    const formData = await req.formData();
    const orgIdFromForm = formData.get('organization_id') as string;
    
    const membership = orgIdFromForm 
      ? memberships.find((m: any) => m.organization_id === orgIdFromForm)
      : memberships[0];

    if (!membership) {
      return NextResponse.json({ error: 'Invalid organization' }, { status: 403 });
    }

    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden: Admin or Owner only' }, { status: 403 });
    }

    const file = formData.get('file') as File | null;
    const setting_key = formData.get('setting_key') as string;
    const opacity = formData.get('opacity') as string || '100';

    if (!file || !setting_key) {
      return NextResponse.json({ error: 'Missing file or setting_key' }, { status: 400 });
    }

    if (!ALLOWED_KEYS.includes(setting_key)) {
      return NextResponse.json({ error: 'Invalid setting_key' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (Max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const header = buffer.toString('hex', 0, 4);
    let mime = '';
    let ext = '';
    if (header === '89504e47') { mime = 'image/png'; ext = 'png'; }
    else if (header.startsWith('ffd8ff')) { mime = 'image/jpeg'; ext = 'jpg'; }
    else if (header === '52494646') { mime = 'image/webp'; ext = 'webp'; }
    
    if (!mime) {
      return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, WEBP allowed.' }, { status: 400 });
    }

    const organization_id = membership.organization_id;
    const timestamp = Date.now();
    const newObjectKey = `banners/${organization_id}/${setting_key}_${timestamp}.${ext}`;

    await uploadBufferToR2(newObjectKey, buffer, mime);
    const newUrl = `/api/assets/public/${newObjectKey}`;

    const { data: oldSetting } = await supabase
      .from('app_settings')
      .select('object_key')
      .eq('organization_id', organization_id)
      .eq('setting_key', setting_key)
      .single();

    const { error: upsertError } = await supabase.from('app_settings').upsert({
        organization_id,
        setting_key,
        setting_value: JSON.stringify({ url: newUrl, opacity: Number(opacity) }),
        object_key: newObjectKey,
        updated_by: user.id
      }, { onConflict: 'organization_id,setting_key' });

    if (upsertError) {
      console.error("Failed to upsert app_settings:", upsertError);
      return NextResponse.json({ error: "Failed to save settings to database" }, { status: 500 });
    }

    if (oldSetting?.object_key && oldSetting.object_key !== newObjectKey) {
      try {
        await deleteObjectFromR2(oldSetting.object_key);
      } catch (delErr) {
        console.error("Failed to delete old banner from R2:", delErr);
      }
    }

    return NextResponse.json({ url: newUrl });
  } catch (err: any) {
    console.error("Banner upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyUiAuth<any>(req);
    if (!authResult.ok) return authResult.response;
    const { user } = authResult;
    
    const url = new URL(req.url);
    const setting_key = url.searchParams.get('setting_key');
    const org_id = url.searchParams.get('organization_id');
    
    if (!setting_key) return NextResponse.json({ error: 'Missing setting_key' }, { status: 400 });

    const supabase = createServiceRoleClient();
    
    // Check all memberships for this user
    const { data: mems } = await supabase
      .from('portal_organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id);
      
    if (!mems || mems.length === 0) {
      return NextResponse.json({ error: 'No organization found for user' }, { status: 403 });
    }

    let organization_id = org_id;
    if (organization_id) {
      // Validate that the user actually belongs to the requested organization
      const belongs = mems.some((m: any) => m.organization_id === organization_id);
      if (!belongs) {
        return NextResponse.json({ error: 'Forbidden: You do not belong to this organization' }, { status: 403 });
      }
    } else {
      // Fallback to the first organization if none provided
      organization_id = mems[0].organization_id;
    }

    const { data, error: dbError } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('organization_id', organization_id)
      .eq('setting_key', setting_key)
      .single();
      
    if (dbError || !data) {
      return NextResponse.json({ url: null });
    }
    
    try {
      const parsed = JSON.parse(data.setting_value);
      return NextResponse.json(parsed);
    } catch (e) {
      // Fallback for old data where setting_value was just a string
      return NextResponse.json({ url: data.setting_value });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
