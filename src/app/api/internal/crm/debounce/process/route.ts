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

    await fetchSupabaseRest('rpc/crm_reap_dead_debounce_jobs', { method: 'POST' }).catch(e => console.error('Reaper failed', e));

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
      return NextResponse.json({ success: true, processed: 0, retried: 0, failed: 0 });
    }

    const n8nWebhookUrl = process.env.N8N_CSKH_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: 'Missing N8N_CSKH_WEBHOOK_URL' }, { status: 500 });
    }

    let processedCount = 0;
    let retriedCount = 0;
    let failedCount = 0;

    for (const job of jobs) {
      try {
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
        rawMessages.reverse();
        const combinedMessage = rawMessages.map((m: any) => m.content).join('\n');
        const sourceMessageIds = rawMessages.map((m: any) => m.id);

        const threadRes = await fetchSupabaseRest('crm_threads', {
          searchParams: { id: `eq.${job.thread_id}`, select: 'customer_id' }
        });
        const threadData = await threadRes.json();
        const customer_id = threadData[0]?.customer_id;

        const finalPayload = {
          organization_id: job.organization_id,
          channel_id: job.channel_id,
          customer_id,
          thread_id: job.thread_id,
          message: combinedMessage,
          sender_id: 'debounced_customer',
          source_message_ids: sourceMessageIds,
          is_debounced: true,
          message_count: job.message_count
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let n8nStatus = 0;
        let n8nErrorMsg = '';

        try {
          const n8nRes = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-internal-secret': expectedSecret
            },
            body: JSON.stringify(finalPayload),
            signal: controller.signal
          });
          
          n8nStatus = n8nRes.status;
          if (!n8nRes.ok) {
            n8nErrorMsg = `N8N returned ${n8nRes.status}: ${await n8nRes.text()}`;
          }
        } catch (fetchErr: any) {
          n8nErrorMsg = fetchErr.message || 'Network/Timeout Error';
        } finally {
          clearTimeout(timeoutId);
        }

        const currentAttempt = job.attempt_count || 0;

        if (n8nStatus >= 200 && n8nStatus < 300) {
          // Success
          await fetchSupabaseRest('crm_thread_debounce_jobs', {
            method: 'PATCH',
            searchParams: { id: `eq.${job.id}`, lock_token: `eq.${job.lock_token}` },
            body: JSON.stringify({
              status: 'processed',
              processed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_error: null,
              locked_at: null,
              lock_expires_at: null,
              lock_token: null
            })
          });
          processedCount++;
        } else if ((n8nStatus >= 400 && n8nStatus < 500)) {
          // 4xx Error -> Fail immediately
          await fetchSupabaseRest('rpc/crm_fail_debounce_job', {
            method: 'POST',
            body: JSON.stringify({
               p_job_id: job.id,
               p_lock_token: job.lock_token,
               p_error: n8nErrorMsg,
               p_next_retry_at: new Date().toISOString(),
               p_is_final_fail: true
            })
          });
          failedCount++;
        } else {
          // 5xx or Network/Timeout Error -> Retry
          const maxAttempts = 3;
          if (currentAttempt >= maxAttempts) {
            await fetchSupabaseRest('rpc/crm_fail_debounce_job', {
              method: 'POST',
              body: JSON.stringify({
                 p_job_id: job.id,
                 p_lock_token: job.lock_token,
                 p_error: `Max attempts reached. Last error: ${n8nErrorMsg}`,
                 p_next_retry_at: new Date().toISOString(),
                 p_is_final_fail: true
              })
            });
            failedCount++;
          } else {
            const backoffMinutes = currentAttempt === 0 ? 0.5 : (currentAttempt === 1 ? 2 : 10);
            const nextRetry = new Date(Date.now() + backoffMinutes * 60000);
            
            await fetchSupabaseRest('rpc/crm_fail_debounce_job', {
              method: 'POST',
              body: JSON.stringify({
                 p_job_id: job.id,
                 p_lock_token: job.lock_token,
                 p_error: n8nErrorMsg,
                 p_next_retry_at: nextRetry.toISOString(),
                 p_is_final_fail: false
              })
            });
            retriedCount++;
          }
        }
      } catch (err: any) {
        console.error(`Error processing debounce job ${job.id}:`, err);
        const currentAttempt = job.attempt_count || 0;
        if (currentAttempt < 3) {
            await fetchSupabaseRest('rpc/crm_fail_debounce_job', {
              method: 'POST',
              body: JSON.stringify({
                 p_job_id: job.id,
                 p_lock_token: job.lock_token,
                 p_error: `Worker exception: ${err.message}`,
                 p_next_retry_at: new Date(Date.now() + 60000).toISOString(),
                 p_is_final_fail: false
              })
            }).catch(e => console.error("Failed to unlock after exception", e));
            retriedCount++;
        } else {
            await fetchSupabaseRest('rpc/crm_fail_debounce_job', {
              method: 'POST',
              body: JSON.stringify({
                 p_job_id: job.id,
                 p_lock_token: job.lock_token,
                 p_error: `Worker exception (max retries): ${err.message}`,
                 p_next_retry_at: new Date().toISOString(),
                 p_is_final_fail: true
              })
            }).catch(e => console.error("Failed to fail after exception", e));
            failedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, processed: processedCount, retried: retriedCount, failed: failedCount });
  } catch (err: any) {
    console.error('Debounce process error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
