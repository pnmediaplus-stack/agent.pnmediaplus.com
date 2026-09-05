import fs from 'fs';
import path from 'path';

/**
 * Phase 2 Validation Test Suite: Marketing Behavioral Acceptance Test Packs (KO-01 to KO-10)
 * Verifies that all 10 KO documents have domain-specific, concrete, non-templated test packs.
 */

const DOCS_DIR = path.resolve(process.cwd(), 'knowledge/marketing/documents');

interface TestResult {
  passed: boolean;
  name: string;
  detail?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, detail?: string) {
  results.push({ passed: condition, name, detail });
  if (condition) {
    console.log(`[PASS] ${name}`);
  } else {
    console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

console.log('================================================================');
console.log('PHASE 2 VALIDATION: MARKETING BEHAVIORAL ACCEPTANCE TEST PACKS');
console.log('Target Directory:', DOCS_DIR);
console.log('================================================================\n');

// 1. Check existence of all 10 canonical framework documents
console.log('--- TEST GROUP 1: Canonical Framework Documents in Repository ---');
for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const files = fs.readdirSync(DOCS_DIR).filter(f => f.startsWith(`PN_MEDIA_PLUS_MARKETING_${pad}`));
  assert(files.length > 0, `Test 1.${i}: Canonical framework document KO-${pad} exists in repository`, `Found: ${files.join(', ')}`);
}

// 2. Check existence of all 10 Acceptance Test Packs
console.log('\n--- TEST GROUP 2: Acceptance Test Packs Existence & Zero-Template Invariant ---');
const TEMPLATE_SIGNATURE = 'PASS requires observable Agent behavior, not merely a well-written document.';

for (let i = 2; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const fileName = `KO-${pad}_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md`;
  const filePath = path.join(DOCS_DIR, fileName);
  const exists = fs.existsSync(filePath);
  
  assert(exists, `Test 2.${i}A: Acceptance Test Pack KO-${pad} exists in repository`);

  if (exists) {
    const content = fs.readFileSync(filePath, 'utf8');
    const isTemplate = content.includes(TEMPLATE_SIGNATURE) && content.split('\n').length < 25;
    assert(!isTemplate, `Test 2.${i}B: KO-${pad} is NOT a 20-line copy-paste placeholder template`);
    assert(content.length > 1500, `Test 2.${i}C: KO-${pad} contains substantive behavioral specification (>1500 bytes)`, `Actual: ${content.length} bytes`);
  }
}

// 3. Check scenario structure and requirements per pack (>= 3 scenarios per pack)
console.log('\n--- TEST GROUP 3: Structured Behavioral Scenarios (Input, Decision, Forbidden) ---');
for (let i = 2; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const fileName = `KO-${pad}_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md`;
  const filePath = path.join(DOCS_DIR, fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  const scenarioMatches = content.match(/##\s+AT-\d{2}-\d{2}/g) || [];
  assert(scenarioMatches.length >= 3, `Test 3.${i}A: KO-${pad} has at least 3 concrete scenarios (Found: ${scenarioMatches.length})`);

  const inputMatches = content.match(/-\s+\*\*Input Scenario:\*\*/g) || [];
  const decisionMatches = content.match(/-\s+\*\*Required Decision:\*\*/g) || [];
  const forbiddenMatches = content.match(/-\s+\*\*Forbidden Behavior:\*\*/g) || [];

  assert(inputMatches.length >= scenarioMatches.length, `Test 3.${i}B: KO-${pad} defines 'Input Scenario' for all scenarios`);
  assert(decisionMatches.length >= scenarioMatches.length, `Test 3.${i}C: KO-${pad} defines 'Required Decision' for all scenarios`);
  assert(forbiddenMatches.length >= scenarioMatches.length, `Test 3.${i}D: KO-${pad} defines 'Forbidden Behavior' for all scenarios`);
}

// 4. Check domain-specific alignment with KO-01 Hard Gates
console.log('\n--- TEST GROUP 4: Domain-Specific Guardrails Alignment ---');
const ko02 = fs.readFileSync(path.join(DOCS_DIR, 'KO-02_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko02.includes('F&B') && ko02.includes('Shopee') && ko02.includes('OUT_OF_SCOPE_DOMAIN'), 'Test 4.1: KO-02 enforces Out-of-Scope industry rejection (F&B / Retail)');
assert(ko02.includes('EVIDENCE_EXPIRED'), 'Test 4.2: KO-02 enforces Stale Evidence expiration');

const ko03 = fs.readFileSync(path.join(DOCS_DIR, 'KO-03_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko03.includes('10-30') && ko03.includes('PRIORITY'), 'Test 4.3: KO-03 targets Media/Performance Agency 10-30 staff as PRIORITY');
assert(ko03.includes('False Decimal Precision') || ko03.includes('Hypothesis Laundering'), 'Test 4.4: KO-03 enforces Gate 01 false precision prohibition');

const ko04 = fs.readFileSync(path.join(DOCS_DIR, 'KO-04_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko04.includes('verbatim_customer_language'), 'Test 4.5: KO-04 preserves authentic customer voice verbatim');
assert(ko04.includes('CONFLICTING_EVIDENCE'), 'Test 4.6: KO-04 handles conflicting evidence with escalation');

const ko05 = fs.readFileSync(path.join(DOCS_DIR, 'KO-05_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko05.includes('bàn giao giữa Sales và Account/Production'), 'Test 4.7: KO-05 selects handover breakdown as primary pain wedge');
assert(ko05.includes('PAIN_HYPOTHESIS'), 'Test 4.8: KO-05 downgrades weak evidence to hypothesis');

const ko06 = fs.readFileSync(path.join(DOCS_DIR, 'KO-06_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko06.includes('OUT_OF_SCOPE') && ko06.includes('VIO-P0-02A'), 'Test 4.9: KO-06 strictly blocks Billing/Red invoices (P0-02A)');
assert(ko06.includes('DEFERRED') && ko06.includes('VIO-P0-02B'), 'Test 4.10: KO-06 strictly blocks HRM/Payroll (P0-02B)');
assert(ko06.includes('NOT_CONFIRMED') && ko06.includes('VIO-P0-02C'), 'Test 4.11: KO-06 strictly blocks 100% Autopilot AI Ads (P0-02C)');
assert(ko06.includes('Lead → Deal → Campaign / Job → Task → Deliverable'), 'Test 4.12: KO-06 confirms core 5-stage workflow');

const ko07 = fs.readFileSync(path.join(DOCS_DIR, 'KO-07_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko07.includes('Deal → Campaign / Job'), 'Test 4.13: KO-07 aligns value mechanism to Deal-to-Job mapping');
assert(ko07.includes('Capacity & Staff Schedule'), 'Test 4.14: KO-07 maps workload transparency to Capacity Dashboard');

const ko08 = fs.readFileSync(path.join(DOCS_DIR, 'KO-08_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko08.includes('12.000.000đ – 18.000.000đ') && ko08.includes('VIO-P0-03'), 'Test 4.15: KO-08 enforces locked commercial authority (P0-03)');
assert(ko08.includes('300% doanh thu') && ko08.includes('VIO-P0-01'), 'Test 4.16: KO-08 enforces quantitative revenue guarantee hard block (P0-01)');

const ko09 = fs.readFileSync(path.join(DOCS_DIR, 'KO-09_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko09.includes('Traceability'), 'Test 4.17: KO-09 enforces upstream hypothesis traceability');

const ko10 = fs.readFileSync(path.join(DOCS_DIR, 'KO-10_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko10.includes('Gate 05') && ko10.includes('PRELIMINARY_LEARNING'), 'Test 4.18: KO-10 enforces Gate 05 against single campaign generalization');
assert(ko10.includes('Confounder') || ko10.includes('Tết'), 'Test 4.19: KO-10 recognizes confounders and isolates seasonal distortions');
assert(ko10.includes('VALIDATED_NEGATIVE_LEARNING'), 'Test 4.20: KO-10 preserves failed experiment learning records');

// Summary
const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = results.filter(r => !r.passed).length;

console.log('\n================================================================');
console.log(`ALL TESTS COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
if (failedTests === 0) {
  console.log('OVERALL RESULT: SUCCESS (100% PASS) - PHASE 2 ACCEPTANCE PACKS READY');
  process.exit(0);
} else {
  console.error(`OVERALL RESULT: FAILED (${failedTests} tests failed)`);
  process.exit(1);
}
