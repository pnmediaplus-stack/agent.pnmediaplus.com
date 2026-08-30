try { require('dotenv').config({ path: '.env.local' }); } catch(e) {}
try { require('dotenv').config({ path: '.env' }); } catch(e) {}
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or Service Key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

// Guardrails P1: 2 messages per second per page. We'll poll every 1 second.
const MAX_MESSAGES_PER_PAGE_PER_SECOND = 2;
let pollInFlight = false;

async function fetchByokToken(organization_id, channel_external_id) {
  const integrationKey = `facebook_page_${channel_external_id}`;
  
  // Get reference token
  const { data: refData, error: refError } = await supabase.rpc('phase075_get_tenant_vault_credential_ref', {
    p_organization_id: organization_id,
    p_integration_key: integrationKey
  });
  
  let referenceToken = refData;

  const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();
  const cpUrl = (process.env.NEXTJS_CONTROL_PLANE_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://agent_pnmedia:3000').replace(/\/$/, '');
  if (!cpUrl) throw new Error("Missing cpUrl");

  const redeemRes = await fetch(`${cpUrl}/api/byok/redeem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${expectedSecret}`,
      'x-broker-internal-secret': process.env.BROKER_INTERNAL_SECRET || expectedSecret
    },
    body: JSON.stringify({
      organization_id,
      integration_key: integrationKey,
      reference_token: referenceToken
    })
  });

  if (!redeemRes.ok) throw new Error(`BYOK Redeem Failed: ${redeemRes.status}`);
  const redeemJson = await redeemRes.json();
  if (!redeemJson?.data?.access_token) throw new Error("Empty access token");
  return redeemJson.data.access_token;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function processMessage(job) {
  const { id, organization_id, payload, retry_count } = job;
  const { channel_external_id, recipient_id, content, message_id } = payload;
  
  try {
    const accessToken = await fetchByokToken(organization_id, channel_external_id);
    
    // Simulate typing delay
    await fetch('https://graph.facebook.com/v19.0/me/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        recipient: { id: recipient_id },
        sender_action: "typing_on"
      })
    });
    
    // Calculate realistic human typing delay based on message length
    // Average reading/typing speed simulation: Base 2s + ~30ms per character
    const charCount = content ? content.length : 0;
    let delay = 2000 + (charCount * 30);
    
    // Add some random human variance (+/- 15%)
    const variance = delay * 0.15;
    delay = delay + (Math.random() * variance * 2 - variance);
    
    // Min 2.5s, Max 12s (so customer doesn't wait too long)
    delay = Math.max(2500, Math.min(delay, 12000));
    
    await sleep(delay);

    // Send actual message
    const fbRes = await fetch('https://graph.facebook.com/v19.0/me/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        recipient: { id: recipient_id },
        message: { text: content }
      })
    });

    if (!fbRes.ok) {
      const fbError = await fbRes.text();
      throw new Error(`FB Error: ${fbError}`);
    }

    // Mark completed
    await supabase.from('crm_outbound_queue').update({ status: 'completed' }).eq('id', id);
    
    // Update CRM message delivery status
    await supabase.from('crm_messages').update({ delivery_status: 'sent' }).eq('id', message_id);
    
  } catch (error) {
    console.error(`Job ${id} failed:`, error.message);
    const maxRetries = 3;
    if (retry_count >= maxRetries) {
      await supabase.from('crm_outbound_queue').update({ status: 'dead_letter' }).eq('id', id);
      await supabase.from('crm_messages').update({ delivery_status: 'failed' }).eq('id', message_id);
    } else {
      // Exponential backoff
      const nextRetrySecs = Math.pow(2, retry_count) * 10;
      const nextRetryAt = new Date(Date.now() + nextRetrySecs * 1000).toISOString();
      await supabase.from('crm_outbound_queue').update({ 
        status: 'pending',
        retry_count: retry_count + 1,
        next_retry_at: nextRetryAt,
        locked_until: null
      }).eq('id', id);
    }
  }
}

async function pollQueue() {
  if (pollInFlight) {
    return;
  }
  pollInFlight = true;
  // P0 - Atomic Claiming via RPC (handles both rate-limit grouping and stale locks)
  try {
    const { data: jobsToProcess, error } = await supabase.rpc('phase077_claim_crm_outbound_queue');

    if (error) {
      console.error("Queue poll error:", error);
      return;
    }
    if (!jobsToProcess || jobsToProcess.length === 0) return;

    // Process concurrently. The RPC already ensured max 2 jobs per page_id.
    await Promise.all(jobsToProcess.map(job => processMessage(job)));
  } finally {
    pollInFlight = false;
  }
}

console.log("Worker started...");
setInterval(() => {
  pollQueue().catch((error) => {
    console.error("Unhandled poll error:", error);
  });
}, 1000);
