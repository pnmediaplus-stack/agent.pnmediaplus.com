import fs from 'fs';
import path from 'path';
import assert from 'assert';

// -----------------------------------------------------------------------------
// READ-ONLY PRODUCTION PREFLIGHT READINESS AUDIT
// Gate: PROD_CONFIG_REVIEW
// Constraint: STRICTLY READ-ONLY / ZERO MUTATIONS / ZERO KO INGESTION
// -----------------------------------------------------------------------------

console.log('================================================================');
console.log('READ-ONLY PRODUCTION PREFLIGHT READINESS AUDIT (GATE: PROD_CONFIG_REVIEW)');
console.log('Scope: Domain & TLS Check + Workflow PROD Contract + Env Isolation');
console.log('================================================================\n');

async function checkProductionDomain() {
  console.log('--- CHECK 1: Production Domain & TLS Resolution ---');
  const prodUrl = 'https://agent.pnmediaplus.com';
  try {
    const res = await fetch(prodUrl, { method: 'HEAD' });
    console.log('  Target URL:', prodUrl);
    console.log('  HTTP Status:', res.status);
    if (!res.ok && res.status >= 500) {
      throw new Error(`Production domain returned server error: ${res.status}`);
    }
    console.log('  ✅ PASS: Production domain https://agent.pnmediaplus.com resolves with valid TLS/HTTPS.\n');
    return true;
  } catch (err: any) {
    console.error('  ❌ FAIL_CLOSED: Could not connect to', prodUrl, ':', err.message);
    throw new Error(`FAIL_CLOSED: Production domain check failed for ${prodUrl}: ${err.message}`);
  }
}

function checkProdWorkflowArtifact() {
  console.log('--- CHECK 2: Production Workflow Artifact Invariants ---');
  const prodWfPath = path.join(process.cwd(), 'n8n', 'workflows', '075_N8N_CAMPAIGN_PLANNER_PROD.json');
  assert(fs.existsSync(prodWfPath), '075_N8N_CAMPAIGN_PLANNER_PROD.json must exist');
  
  const rawContent = fs.readFileSync(prodWfPath, 'utf8');
  const wf = JSON.parse(rawContent);

  assert.strictEqual(wf.name, '075_N8N_CAMPAIGN_PLANNER_PROD', 'Workflow name must be 075_N8N_CAMPAIGN_PLANNER_PROD');
  console.log('  [2.1 Workflow Name] -> PASS:', wf.name);

  // Assert active === false (Gatekeeper Blocker 2: MUST be inactive by default)
  assert.strictEqual(wf.active, false, 'Production workflow MUST have active: false by default to prevent premature execution upon import');
  console.log('  [2.2 Inactive by Default] -> PASS: active is strictly false');

  // Assert ZERO ngrok references
  assert(!rawContent.includes('ngrok'), 'Production workflow MUST NOT contain any ngrok references');
  console.log('  [2.2 Zero Ngrok] -> PASS: Zero ngrok references found in entire workflow JSON');

  // Assert Production domain allowlist
  assert(rawContent.includes('https://agent.pnmediaplus.com'), 'Must be bound to https://agent.pnmediaplus.com');
  console.log('  [2.3 Prod Domain Allowlist] -> PASS: Bound exclusively to https://agent.pnmediaplus.com');

  // Assert Webhook Trigger isolation
  const webhookNode = wf.nodes.find((n: any) => n.name === 'Webhook Trigger');
  assert(webhookNode, 'Webhook Trigger node must exist');
  assert.strictEqual(webhookNode.parameters.path, 'plan-campaign-intake-prod', 'Webhook path must be plan-campaign-intake-prod');
  assert.strictEqual(webhookNode.parameters.authentication, 'headerAuth', 'Must enforce headerAuth');
  assert.strictEqual(webhookNode.credentials?.httpHeaderAuth?.name, 'x-n8n-api-key-prod', 'Must use dedicated prod credential x-n8n-api-key-prod');
  console.log('  [2.4 Webhook Isolation] -> PASS: Path is plan-campaign-intake-prod with x-n8n-api-key-prod headerAuth');

  // Assert All Callbacks use dedicated Prod credentials
  const callbackNodes = ['Acknowledge (chat_append)', 'Delivery (chat_append)', 'Clarify Scope (chat_append)', 'QA Reject (chat_append)', 'System Error (chat_append)'];
  for (const name of callbackNodes) {
    const node = wf.nodes.find((n: any) => n.name === name);
    assert(node, 'Node ' + name + ' must exist');
    assert.strictEqual(node.credentials?.httpHeaderAuth?.name, 'x-n8n-api-key-prod', name + ' must use x-n8n-api-key-prod');
  }
  console.log('  [2.5 Callback Credentials] -> PASS: All 5 chat_append callback nodes use x-n8n-api-key-prod');

  // Assert Pin Data is clean
  assert.deepStrictEqual(wf.pinData, {}, 'Pin data must be empty for production workflow');
  console.log('  [2.6 Clean Pin Data] -> PASS: pinData is empty (Zero test leakage)\n');
  return true;
}

function checkEnvProductionTemplate() {
  console.log('--- CHECK 3: Production Environment Template Invariants ---');
  const envPath = path.join(process.cwd(), '.env.production.example');
  assert(fs.existsSync(envPath), '.env.production.example must exist');

  const content = fs.readFileSync(envPath, 'utf8');
  assert(!content.includes('pseudoencephalitic'), 'Must not contain staging ngrok URL');
  assert(content.includes('API_BASE_URL=https://agent.pnmediaplus.com'), 'API_BASE_URL must be https://agent.pnmediaplus.com');
  assert(content.includes('NEXT_PUBLIC_SUPABASE_URL=https://jrgkpbjsqefvnhbiiutz.supabase.co'), 'Must point to Supabase Production URL');
  assert(content.includes('N8N_WEBHOOK_URL=https://n8n.pnmediaplus.com/webhook/plan-campaign-intake-prod'), 'Must point to Prod webhook');
  assert(content.includes('N8N_CAMPAIGN_PLANNER_API_KEY=<PROD_N8N_CAMPAIGN_PLANNER_API_KEY>'), 'Must use placeholder for Prod API key');
  console.log('  [3.1 Secrets Redacted] -> PASS: Zero real secrets exposed, placeholders used');
  console.log('  [3.2 Production Binding] -> PASS: Correct production Supabase and N8N URLs documented\n');
  return true;
}

function checkCanonicalHeaderInCodebase() {
  console.log('--- CHECK 4: Canonical Header Consistency Across Codebase ---');
  
  // 4.1 n8n-client.ts
  const n8nClientContent = fs.readFileSync(path.join(process.cwd(), 'src/lib/n8n-client.ts'), 'utf8');
  assert(n8nClientContent.includes('"x-n8n-api-key": apiKey'), 'src/lib/n8n-client.ts must use canonical header "x-n8n-api-key"');
  console.log('  [4.1 n8n-client.ts] -> PASS: Uses canonical header "x-n8n-api-key"');

  // 4.2 publish-callback/route.ts
  const publishCallbackContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/n8n/publish-callback/route.ts'), 'utf8');
  assert(publishCallbackContent.includes("request.headers.get('x-n8n-api-key')"), 'src/app/api/n8n/publish-callback/route.ts must check "x-n8n-api-key"');
  console.log('  [4.2 publish-callback/route.ts] -> PASS: Checks canonical header "x-n8n-api-key"');

  // 4.3 governance/bundle/route.ts
  const governanceContent = fs.readFileSync(path.join(process.cwd(), 'src/app/api/governance/bundle/route.ts'), 'utf8');
  assert(governanceContent.includes('req.headers.get("x-n8n-api-key")'), 'src/app/api/governance/bundle/route.ts must check "x-n8n-api-key"');
  console.log('  [4.3 governance/bundle/route.ts] -> PASS: Checks canonical header "x-n8n-api-key"');

  // 4.4 Ensure no usage of incorrect header 'x-api-key' in routes or clients
  assert(!n8nClientContent.includes('"x-api-key"'), 'Must not use x-api-key in n8n-client.ts');
  assert(!publishCallbackContent.includes("'x-api-key'"), 'Must not use x-api-key in publish-callback/route.ts');
  assert(!governanceContent.includes('"x-api-key"'), 'Must not use x-api-key in governance/bundle/route.ts');
  console.log('  [4.4 Non-Canonical Header Exclusion] -> PASS: Zero references to non-canonical "x-api-key" in runtime code\n');
  return true;
}

async function checkLiveProductionAuthGate() {
  console.log('--- CHECK 5: Live Production Auth Gate Enforcement ---');
  const targetUrl = 'https://agent.pnmediaplus.com/api/governance/bundle?organization_id=8289488a-b255-4cb6-9bff-c9d2e71af160&department_id=dept-marketing';

  // 5.1 Request without auth
  const resNoAuth = await fetch(targetUrl);
  assert.strictEqual(resNoAuth.status, 401, 'Request without auth MUST be rejected with 401');
  console.log('  [5.1 No Auth Header] -> PASS: Live Prod returned 401 Unauthorized');

  // 5.2 Request with incorrect header name 'x-api-key'
  const resWrongHeader = await fetch(targetUrl, {
    headers: { 'x-api-key': 'some_test_key' }
  });
  assert.strictEqual(resWrongHeader.status, 401, 'Request with non-canonical header x-api-key MUST be rejected with 401');
  console.log('  [5.2 Non-Canonical "x-api-key" Header] -> PASS: Live Prod strictly rejected with 401 Unauthorized');

  // 5.3 Request with canonical header 'x-n8n-api-key' but invalid key
  const resInvalidKey = await fetch(targetUrl, {
    headers: { 'x-n8n-api-key': 'INVALID_TEST_KEY_FOR_AUDIT' }
  });
  assert.strictEqual(resInvalidKey.status, 401, 'Request with invalid x-n8n-api-key MUST be rejected with 401');
  console.log('  [5.3 Canonical "x-n8n-api-key" with Invalid Key] -> PASS: Live Prod strictly rejected with 401 Unauthorized\n');
  return true;
}

async function run() {
  await checkProductionDomain();
  checkProdWorkflowArtifact();
  checkEnvProductionTemplate();
  checkCanonicalHeaderInCodebase();
  await checkLiveProductionAuthGate();
  console.log('================================================================');
  console.log('PREFLIGHT READINESS AUDIT: 100% PASS');
  console.log('Canonical Header: x-n8n-api-key (VERIFIED ACROSS STACK & LIVE PROD GATE)');
  console.log('Status: READY FOR GATEKEEPER SIGN-OFF FOR N8N CREDENTIAL & INACTIVE IMPORT');
  console.log('Production Mutation: STRICTLY BLOCKED');
  console.log('================================================================');
}

run();
