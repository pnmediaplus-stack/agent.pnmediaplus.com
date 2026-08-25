import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCrmRouteContext } from '@/lib/crm-api';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, z.any());
    if (!guard.ok) return guard.response;
    const { organizationId } = guard.context;

    const formData = await req.formData();
    const threadId = formData.get('threadId') as string;
    const file = formData.get('file') as File;

    if (!threadId || !file) {
      return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${organizationId}/${threadId}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('phase1_chat_attachments')
      .upload(fileName, file);

    if (error) {
      console.error('UPLOAD_FAILED', error);
      return NextResponse.json({ error: 'UPLOAD_FAILED', message: error.message }, { status: 500 });
    }

    const { data: signedData } = await supabase.storage
      .from('phase1_chat_attachments')
      .createSignedUrl(fileName, 315360000); // 10 years
      
    const url = signedData?.signedUrl || '';

    const cpUrl = (process.env.NEXTJS_CONTROL_PLANE_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
    const dispatchUrl = `${cpUrl}/api/internal/crm/messages/dispatch`;
    const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();

    const dispatchRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expectedSecret}`
      },
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: threadId,
        content: `[File đính kèm]: ${url}\n(Tên file: ${file.name})`,
        sender_type: 'human'
      })
    });

    const dispatchData = await dispatchRes.json().catch(() => ({}));
    if (!dispatchRes.ok) {
      return NextResponse.json(dispatchData, { status: dispatchRes.status });
    }

    return NextResponse.json({ success: true, url, message: dispatchData.message });
  } catch (err) {
    console.error('Error handling attachment:', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
