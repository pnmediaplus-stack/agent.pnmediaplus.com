import fs from 'fs';
import path from 'path';
import assert from 'assert';

const fixturePath = 'D:/Projects/CRM_PRODUCT_PACKAGING_OUTPUT_run_quick_1/TAI LIEU TRI THUC/TAI LIEU MARKETING/SYSTEM/MARKETING_DEPARTMENT_PACK_FIXTURE_v1.0.json';
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

console.log('================================================================');
console.log('N8N_BOT: TEST MARKETING DEPARTMENT PACK ADAPTER');
console.log('Fixture loaded:', fixturePath);
console.log('================================================================\n');

// Adapter function simulating N8N Code Node
function marketingDepartmentPackAdapter(inputItem: any) {
  const threadId = inputItem.thread_id;
  const organizationId = inputItem.organization_id;
  const attempt = inputItem.attempt;

  // 1. Strict Fail-Closed Context Validation
  if (!threadId || !organizationId) {
    throw new Error('FAIL_CLOSED_SYSTEM_ERROR: Missing thread_id or organization_id in Department Pack Adapter');
  }

  const rawPack = inputItem.department_pack || {};
  const knowledgeContext = rawPack.knowledge_context || {};

  // 2. Separate 3 distinct layers per Gatekeeper specification:
  // Layer 1: Frameworks
  const frameworks = Array.isArray(knowledgeContext.frameworks)
    ? knowledgeContext.frameworks.map((item: any) => ({
        ko_id: item.ko_id,
        namespace: item.namespace || 'marketing_runtime_reasoning',
        semantic_type: item.semantic_type || 'pattern',
        content_hash: item.content_hash,
        decision_schema: item.decision_schema,
        payload: item.payload,
      }))
    : [];

  // Layer 2: Evidence
  const evidence = Array.isArray(knowledgeContext.evidence)
    ? knowledgeContext.evidence.map((item: any) => ({
        ko_id: item.ko_id,
        namespace: item.namespace || 'marketing_evidence',
        semantic_type: item.semantic_type || 'hypothesis',
        content_hash: item.content_hash,
        decision_schema: item.decision_schema,
        payload: item.payload,
      }))
    : [];

  // Layer 3: Governance
  const governance = Array.isArray(knowledgeContext.governance)
    ? knowledgeContext.governance.map((item: any) => ({
        ko_id: item.ko_id,
        namespace: item.namespace || 'marketing_runtime_reasoning',
        governance_type: item.governance_type || 'rule',
        rule_name: item.rule_name,
        payload: item.payload,
      }))
    : [];

  // 3. Map context into structured department_pack for Agent 1
  const adaptedDepartmentPack = {
    version: rawPack.version || '1.0',
    department_id: inputItem.department_id || 'dept-marketing',
    department_name: inputItem.department_name || 'Marketing',
    organization_id: organizationId,
    frameworks,
    evidence,
    governance,
    summary: {
      frameworks_count: frameworks.length,
      evidence_count: evidence.length,
      governance_rules_count: governance.length,
    },
  };

  return {
    json: {
      ...inputItem,
      thread_id: threadId,
      organization_id: organizationId,
      attempt: attempt !== undefined ? attempt : 1,
      department_pack: adaptedDepartmentPack,
    },
  };
}

// TEST 1: Happy path with MINIMAL_ADAPTER_FIXTURE
console.log('[Test 1] Parsing MINIMAL_ADAPTER_FIXTURE...');
const mockInput = {
  thread_id: '55555555-5555-5555-5555-555555555555',
  organization_id: '8289488a-b255-4cb6-9bff-c9d2e71af160',
  attempt: 1,
  department_id: 'dept-marketing',
  department_name: 'Marketing',
  department_pack: fixture.department_pack,
};

const result = marketingDepartmentPackAdapter(mockInput);
const outputPack = result.json.department_pack;

console.log('Output Contract Summary:');
console.log('  - Frameworks count:', outputPack.frameworks.length);
console.log('  - Evidence count:', outputPack.evidence.length);
console.log('  - Governance rules count:', outputPack.governance.length);

assert.strictEqual(outputPack.frameworks.length, 1);
assert.strictEqual(outputPack.frameworks[0].ko_id, 'KO-06');
assert.strictEqual(outputPack.evidence.length, 1);
assert.strictEqual(outputPack.evidence[0].ko_id, 'KO-04');
assert.strictEqual(outputPack.governance.length, 1);
assert.strictEqual(outputPack.governance[0].ko_id, 'KO-01');
assert.strictEqual(outputPack.governance[0].rule_name, 'GATE_04_CLAIM_SAFETY');

// Assert context preserved
assert.strictEqual(result.json.thread_id, '55555555-5555-5555-5555-555555555555');
assert.strictEqual(result.json.organization_id, '8289488a-b255-4cb6-9bff-c9d2e71af160');
assert.strictEqual(result.json.attempt, 1);
console.log('  -> PASS: All 3 layers successfully separated and context preserved.');

// TEST 2: Fail-closed on missing context
console.log('\n[Test 2] Fail-closed assertion on missing thread_id/organization_id:');
assert.throws(() => {
  marketingDepartmentPackAdapter({ ...mockInput, thread_id: null });
}, /FAIL_CLOSED_SYSTEM_ERROR/);
console.log('  -> PASS: Fail-closed on missing thread_id.');

assert.throws(() => {
  marketingDepartmentPackAdapter({ ...mockInput, organization_id: '' });
}, /FAIL_CLOSED_SYSTEM_ERROR/);
console.log('  -> PASS: Fail-closed on missing organization_id.');

// TEST 3: Output Contract Structure Verification
console.log('\n[Test 3] Verifying complete output contract structure:');
const contractKeys = Object.keys(outputPack);
console.log('  Contract keys:', contractKeys.join(', '));
assert(contractKeys.includes('frameworks'));
assert(contractKeys.includes('evidence'));
assert(contractKeys.includes('governance'));
assert(contractKeys.includes('summary'));
console.log('  -> PASS: Output contract strictly adheres to requirements.');

console.log('\n================================================================');
console.log('ALL TESTS PASSED (3/3) - N8N_BOT ADAPTER CONTRACT VERIFIED');
console.log('================================================================');
