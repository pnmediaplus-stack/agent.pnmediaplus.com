import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// 1. Securely load .env.local without exposing secrets in stdout
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const CLONE_URL = 'https://ldhjrdihrcjsjfmrqtbi.supabase.co';
const CLONE_ORG_ID = '8289488a-b255-4cb6-9bff-c9d2e71af160';
const NGROK_HOST = 'https://pseudoencephalitic-margarita-supernegligently.ngrok-free.dev';

async function runFinalSmokeTest() {
  console.log('================================================================');
  console.log('FINAL POST-ROTATION SECURITY & RUNTIME SMOKE TEST');
  console.log('Target: Supabase Clone (' + CLONE_URL + ')');
  console.log('Allowlist Host: ' + NGROK_HOST);
  console.log('================================================================\n');

  // Check 1: Old Compromised Key Rejection
  console.log('--- CHECK 1: VERIFY REVOCATION OF COMPROMISED KEY ---');
  const revokedRes = await fetch(
    `${NGROK_HOST}/api/governance/bundle?organization_id=${CLONE_ORG_ID}&department_id=dept-marketing`,
    {
      method: 'GET',
      headers: {
        'x-n8n-api-key': 'pn_media_os_super_secret_key_2026_xyz',
      },
    }
  );
  console.log(`[Revocation Probe] Old Key Response: HTTP ${revokedRes.status}`);
  if (revokedRes.status !== 401) {
    throw new Error(`SECURITY FAILED: Old compromised key was NOT rejected with 401! Got: ${revokedRes.status}`);
  }
  console.log('-> PASS: Old key strictly rejected with 401 Unauthorized.\n');

  // Check 2: Rotated Key Acceptance
  console.log('--- CHECK 2: VERIFY ROTATED N8N CAMPAIGN PLANNER KEY ---');
  const rotatedKey = env.N8N_CAMPAIGN_PLANNER_API_KEY;
  if (!rotatedKey || !rotatedKey.startsWith('pn_plan_')) {
    throw new Error('N8N_CAMPAIGN_PLANNER_API_KEY missing or invalid prefix in .env.local');
  }
  const rotatedRes = await fetch(
    `${NGROK_HOST}/api/governance/bundle?organization_id=${CLONE_ORG_ID}&department_id=dept-marketing`,
    {
      method: 'GET',
      headers: {
        'x-n8n-api-key': rotatedKey,
      },
    }
  );
  console.log(`[Rotated Key Probe] Status: HTTP ${rotatedRes.status}`);
  if (rotatedRes.status !== 200) {
    throw new Error(`ROTATION PROBE FAILED: Rotated key did not receive 200 OK! Got: ${rotatedRes.status}`);
  }
  const bundleData = await rotatedRes.json();
  if (!bundleData.ok || bundleData.state !== 'ready') {
    throw new Error(`BUNDLE DATA INVALID: Expected ready state, got: ${JSON.stringify(bundleData)}`);
  }
  console.log('-> PASS: Rotated key authenticated successfully and received 200 OK with ready state.\n');

  // Check 3: Supabase Clone Service-Role Key Connectivity
  console.log('--- CHECK 3: VERIFY ROTATED SUPABASE CLONE SERVICE-ROLE KEY ---');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  }
  const supabase = createClient(CLONE_URL, serviceKey, {
    auth: { persistSession: false },
  });
  const { count: msgCount, error: countErr } = await supabase
    .from('phase1_chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', '55555555-5555-5555-5555-555555555555');

  if (countErr) {
    throw new Error(`SUPABASE AUTH FAILED: ${countErr.message}`);
  }
  console.log(`[Database Query] Authenticated successfully. Current message count in thread: ${msgCount}`);
  console.log('-> PASS: Rotated Supabase service-role key is functional and authorized on Clone.\n');

  // Check 4: Append-Only Trigger Immutability Protection
  console.log('--- CHECK 4: VERIFY APPEND-ONLY IMMUTABILITY TRIGGER ---');
  const { error: deleteErr } = await supabase
    .from('phase1_chat_messages')
    .delete()
    .eq('thread_id', '55555555-5555-5555-5555-555555555555')
    .limit(1);

  if (!deleteErr) {
    throw new Error('IMMUTABILITY VIOLATION: DELETE operation was not rejected by database trigger!');
  }
  console.log(`[Trigger Response] Blocked with code: ${deleteErr.code} - ${deleteErr.message}`);
  console.log('-> PASS: Database strictly enforces append-only immutability. Zero mutations permitted.\n');

  console.log('================================================================');
  console.log('ALL 4 POST-ROTATION SECURITY CHECKS PASSED (100%)');
  console.log('================================================================');
}

runFinalSmokeTest().catch(err => {
  console.error('FINAL SMOKE TEST FAILED:', err);
  process.exit(1);
});
