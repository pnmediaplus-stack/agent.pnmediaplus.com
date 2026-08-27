import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const internalSecretHeader = req.headers.get('x-internal-secret') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();

    if (!expectedSecret || (bearerToken !== expectedSecret && internalSecretHeader !== expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Claim pending jobs
    const claimRes = await fetchSupabaseRest('rpc/crm_claim_debounce_jobs', {
      method: 'POST',
      body: JSON.stringify({ p_limit: 50 })
    });

    if (!claimRes.ok) {
      const errorText = await claimRes.text();
      console.error('Failed to claim debounce jobs:', errorText);
      return NextResponse.json({ error: 'Failed to claim jobs', details: errorText }, { status: 500 });
    }

    const jobs = await claimRes.json();
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const n8nWebhookUrl = process.env.N8N_CSKH_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: 'Missing N8N_CSKH_WEBHOOK_URL' }, { status: 500 });
    }

    let processedCount = 0;

    // 2. Process each job
    for (const job of jobs) {
      try {
        // Fetch the messages that correspond to this job
        const messagesRes = await fetchSupabaseRest('crm_messages', {
          searchParams: {
            thread_id: `eq.${job.thread_id}`,
            sender_type: `eq.customer`,
            select: 'id, content, created_at',
            order: 'created_at.desc',
            limit: job.message_count.toString()
          }
        });

        if (!messagesRes.ok) {
          throw new Error('Failed to fetch messages for thread: ' + job.thread_id);
        }

        const rawMessages = await messagesRes.json();
        // Reverse to chronological order (oldest first)
        rawMessages.reverse();

        const combinedMessage = rawMessages.map((m: any) => m.content).join('\n');
        const sourceMessageIds = rawMessages.map((m: any) => m.id);

        const threadRes = await fetchSupabaseRest('crm_threads', {
          searchParams: {
            id: `eq.${job.thread_id}`,
            select: 'customer_id'
          }
        });
        const threadData = await threadRes.json();
        const customer_id = threadData[0]?.customer_id;

        const finalPayload = {
          organization_id: job.organization_id,
          channel_id: job.channel_id,
          customer_id,
          thread_id: job.thread_id,
          message: combinedMessage, // The grouped messages separated by newline
          sender_id: 'debounced_customer', // Fallback
          source_message_ids: sourceMessageIds,
          is_debounced: true,
          message_count: job.message_count
        };

        // 3. Trigger N8N (with strict 10s timeout to prevent hanging)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const n8nRes = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalPayload),
            signal: controller.signal
          });
          
          if (!n8nRes.ok) {
            throw new Error(`N8N returned ${n8nRes.status}: ${await n8nRes.text()}`);
          }
        } finally {
          clearTimeout(timeoutId);
        }

        // 4. Mark job as processed ONLY IF fetch succeeds
        await fetchSupabaseRest('crm_thread_debounce_jobs', {
          method: 'PATCH',
          searchParams: { id: `eq.${job.id}` },
          body: JSON.stringify({
            status: 'processed',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });

        processedCount++;
      } catch (err) {
        console.error(`Error processing debounce job ${job.id}:`, err);
        // Do not mark as processed, it will remain locked.
        // In a full queue system, a reaper or unlocker could reset locked jobs.
      }
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (err: any) {
    console.error('Debounce process error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
