import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Phase 2 Comprehensive Validation Suite:
 * 1. Acceptance Test Pack Isolation from Runtime Knowledge Documents
 * 2. Framework Package Manifest Completeness & Cryptographic Checksums
 * 3. Exclusion Guard Enforcement (Zero Test Packs in Ingestion Candidate List)
 * 4. Dependency Graph Integrity (DAG - No Cycles)
 * 5. Structured Behavioral Scenarios (Input, Decision, Forbidden)
 * 6. Domain-Specific Guardrails Alignment
 */

const BASE_DIR = path.resolve(process.cwd(), 'knowledge/marketing');
const DOCS_DIR = path.join(BASE_DIR, 'documents');
const TESTS_DIR = path.join(BASE_DIR, 'acceptance_tests');
const MANIFEST_PATH = path.join(BASE_DIR, 'MARKETING_FRAMEWORK_MANIFEST.json');

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
console.log('PHASE 2 VALIDATION: MARKETING ACCEPTANCE PACKS & MANIFEST ISOLATION');
console.log('Docs Directory:', DOCS_DIR);
console.log('Tests Directory:', TESTS_DIR);
console.log('================================================================\n');

// 1. Check isolation: Documents directory must contain ONLY runtime framework files, ZERO test packs
console.log('--- TEST GROUP 1: Physical File Isolation Invariant ---');
const docsFiles = fs.readdirSync(DOCS_DIR);
const testPackInDocs = docsFiles.filter(f => f.includes('AGENT_ACCEPTANCE_TEST_PACK') || f.includes('DECISION_SCHEMA'));
assert(testPackInDocs.length === 0, 'Test 1.1: Runtime documents directory contains ZERO test packs (Physical Isolation)', `Violations found: ${testPackInDocs.join(', ')}`);

for (let i = 1; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const files = docsFiles.filter(f => f.startsWith(`PN_MEDIA_PLUS_MARKETING_${pad}`));
  assert(files.length === 1, `Test 1.2.${i}: Canonical framework document KO-${pad} exists exclusively in documents/`);
}

// 2. Check acceptance_tests directory
console.log('\n--- TEST GROUP 2: Acceptance Test Packs in Dedicated Directory ---');
const testFiles = fs.readdirSync(TESTS_DIR);
for (let i = 2; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const fileName = `KO-${pad}_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md`;
  const exists = testFiles.includes(fileName);
  assert(exists, `Test 2.${i}A: Acceptance Test Pack KO-${pad} exists in acceptance_tests/`);

  if (exists) {
    const content = fs.readFileSync(path.join(TESTS_DIR, fileName), 'utf8');
    const isTemplate = content.includes('PASS requires observable Agent behavior, not merely a well-written document.') && content.split('\n').length < 25;
    assert(!isTemplate, `Test 2.${i}B: KO-${pad} is NOT a 20-line copy-paste placeholder template`);
    assert(content.length > 1500, `Test 2.${i}C: KO-${pad} contains substantive behavioral specification (>1500 bytes)`, `Actual: ${content.length} bytes`);
  }
}

// 3. Structured Behavioral Scenarios (Input, Decision, Forbidden)
console.log('\n--- TEST GROUP 3: Structured Behavioral Scenarios (Input, Decision, Forbidden) ---');
for (let i = 2; i <= 10; i++) {
  const pad = String(i).padStart(2, '0');
  const fileName = `KO-${pad}_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md`;
  const content = fs.readFileSync(path.join(TESTS_DIR, fileName), 'utf8');

  const scenarioMatches = content.match(/##\s+AT-\d{2}-\d{2}/g) || [];
  assert(scenarioMatches.length >= 3, `Test 3.${i}A: KO-${pad} has at least 3 concrete scenarios (Found: ${scenarioMatches.length})`);

  const inputMatches = content.match(/-\s+\*\*Input Scenario:\*\*/g) || [];
  const decisionMatches = content.match(/-\s+\*\*Required Decision:\*\*/g) || [];
  const forbiddenMatches = content.match(/-\s+\*\*Forbidden Behavior:\*\*/g) || [];

  assert(inputMatches.length >= scenarioMatches.length, `Test 3.${i}B: KO-${pad} defines 'Input Scenario' for all scenarios`);
  assert(decisionMatches.length >= scenarioMatches.length, `Test 3.${i}C: KO-${pad} defines 'Required Decision' for all scenarios`);
  assert(forbiddenMatches.length >= scenarioMatches.length, `Test 3.${i}D: KO-${pad} defines 'Forbidden Behavior' for all scenarios`);
}

// 4. Manifest Completeness & Cryptographic Checksums
console.log('\n--- TEST GROUP 4: Framework Manifest Completeness & Checksums ---');
assert(fs.existsSync(MANIFEST_PATH), 'Test 4.1: MARKETING_FRAMEWORK_MANIFEST.json exists');
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

assert(manifest.package_id === 'PN_MARKETING_KO_SYSTEM_v1.0', 'Test 4.2: Manifest has canonical package_id');
assert(manifest.package_version === '1.0.0', 'Test 4.3: Manifest has canonical package_version');
assert(manifest.expected_parts === 10, 'Test 4.4: Manifest expected_parts is exactly 10');
assert(manifest.canonical_documents.length === 10, 'Test 4.5: Manifest contains exactly 10 canonical documents');

const hashConcat: string[] = [];
for (const doc of manifest.canonical_documents) {
  const fullPath = path.join(BASE_DIR, doc.relative_path);
  assert(fs.existsSync(fullPath), `Test 4.6: Canonical file on disk exists: ${doc.relative_path}`);
  const diskContent = fs.readFileSync(fullPath, 'utf8');
  const diskSha256 = crypto.createHash('sha256').update(diskContent, 'utf8').digest('hex');
  assert(diskSha256 === doc.sha256, `Test 4.7: SHA-256 for ${doc.ko_index} matches disk exactly`, `Expected: ${doc.sha256}, Got: ${diskSha256}`);
  hashConcat.push(diskSha256);
}

const computedPackageHash = crypto.createHash('sha256').update(hashConcat.join(':'), 'utf8').digest('hex');
assert(computedPackageHash === manifest.package_manifest_sha256, 'Test 4.8: Overall package_manifest_sha256 matches cryptographic concatenation');

// 5. Ingestion Exclusion Guard
console.log('\n--- TEST GROUP 5: Ingestion Exclusion Guard ---');
const excludedInManifest = manifest.canonical_documents.some((d: any) =>
  d.relative_path.includes('acceptance_tests') ||
  d.relative_path.includes('AGENT_ACCEPTANCE_TEST_PACK') ||
  d.relative_path.includes('DECISION_SCHEMA')
);
assert(!excludedInManifest, 'Test 5.1: Zero acceptance test files in manifest canonical_documents (Ingestion Exclusion Guard)');
assert(manifest.ingest_exclusion_patterns.length >= 3, 'Test 5.2: Manifest defines explicit ingest_exclusion_patterns');

// 6. Dependency Graph Integrity (DAG - No Cycles)
console.log('\n--- TEST GROUP 6: Dependency Graph Integrity ---');
const koMap = new Map<string, string[]>();
for (const doc of manifest.canonical_documents) {
  koMap.set(doc.ko_index, doc.dependencies);
}

// Ensure all dependencies reference valid KOs
let allDepsValid = true;
for (const [ko, deps] of koMap.entries()) {
  for (const dep of deps) {
    if (!koMap.has(dep)) {
      allDepsValid = false;
      console.error(`Invalid dependency: ${ko} depends on non-existent ${dep}`);
    }
  }
}
assert(allDepsValid, 'Test 6.1: All declared dependencies reference valid Knowledge Objects');

// Topological check: dependencies must be strictly upstream (index < current)
let isStrictlyUpstream = true;
for (const doc of manifest.canonical_documents) {
  const currentIdx = parseInt(doc.ko_index.replace('KO-', ''), 10);
  for (const dep of doc.dependencies) {
    const depIdx = parseInt(dep.replace('KO-', ''), 10);
    if (depIdx >= currentIdx) {
      isStrictlyUpstream = false;
      console.error(`Upstream violation: ${doc.ko_index} depends on ${dep} which is not strictly upstream`);
    }
  }
}
assert(isStrictlyUpstream, 'Test 6.2: Dependency graph is strictly acyclic (DAG: all dependencies are strictly upstream)');

// 7. Domain-Specific Guardrails Alignment
console.log('\n--- TEST GROUP 7: Domain-Specific Guardrails Alignment ---');
const ko02 = fs.readFileSync(path.join(TESTS_DIR, 'KO-02_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko02.includes('F&B') && ko02.includes('Shopee') && ko02.includes('OUT_OF_SCOPE_DOMAIN'), 'Test 7.1: KO-02 enforces Out-of-Scope industry rejection (F&B / Retail)');
assert(ko02.includes('EVIDENCE_EXPIRED'), 'Test 7.2: KO-02 enforces Stale Evidence expiration');

const ko03 = fs.readFileSync(path.join(TESTS_DIR, 'KO-03_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko03.includes('10-30') && ko03.includes('PRIORITY'), 'Test 7.3: KO-03 targets Media/Performance Agency 10-30 staff as PRIORITY');
assert(ko03.includes('False Decimal Precision') || ko03.includes('Hypothesis Laundering'), 'Test 7.4: KO-03 enforces Gate 01 false precision prohibition');

const ko04 = fs.readFileSync(path.join(TESTS_DIR, 'KO-04_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko04.includes('verbatim_customer_language'), 'Test 7.5: KO-04 preserves authentic customer voice verbatim');
assert(ko04.includes('CONFLICTING_EVIDENCE'), 'Test 7.6: KO-04 handles conflicting evidence with escalation');

const ko05 = fs.readFileSync(path.join(TESTS_DIR, 'KO-05_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko05.includes('bàn giao giữa Sales và Account/Production'), 'Test 7.7: KO-05 selects handover breakdown as primary pain wedge');
assert(ko05.includes('PAIN_HYPOTHESIS'), 'Test 7.8: KO-05 downgrades weak evidence to hypothesis');

const ko06 = fs.readFileSync(path.join(TESTS_DIR, 'KO-06_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko06.includes('OUT_OF_SCOPE') && ko06.includes('VIO-P0-02A'), 'Test 7.9: KO-06 strictly blocks Billing/Red invoices (P0-02A)');
assert(ko06.includes('DEFERRED') && ko06.includes('VIO-P0-02B'), 'Test 7.10: KO-06 strictly blocks HRM/Payroll (P0-02B)');
assert(ko06.includes('NOT_CONFIRMED') && ko06.includes('VIO-P0-02C'), 'Test 7.11: KO-06 strictly blocks 100% Autopilot AI Ads (P0-02C)');
assert(ko06.includes('Lead → Deal → Campaign / Job → Task → Deliverable'), 'Test 7.12: KO-06 confirms core 5-stage workflow');

const ko07 = fs.readFileSync(path.join(TESTS_DIR, 'KO-07_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko07.includes('Deal → Campaign / Job'), 'Test 7.13: KO-07 aligns value mechanism to Deal-to-Job mapping');
assert(ko07.includes('Capacity & Staff Schedule'), 'Test 7.14: KO-07 maps workload transparency to Capacity Dashboard');

const ko08 = fs.readFileSync(path.join(TESTS_DIR, 'KO-08_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko08.includes('12.000.000đ – 18.000.000đ') && ko08.includes('VIO-P0-03'), 'Test 7.15: KO-08 enforces locked commercial authority (P0-03)');
assert(ko08.includes('300% doanh thu') && ko08.includes('VIO-P0-01'), 'Test 7.16: KO-08 enforces quantitative revenue guarantee hard block (P0-01)');

const ko09 = fs.readFileSync(path.join(TESTS_DIR, 'KO-09_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko09.includes('Traceability'), 'Test 7.17: KO-09 enforces upstream hypothesis traceability');

const ko10 = fs.readFileSync(path.join(TESTS_DIR, 'KO-10_AGENT_ACCEPTANCE_TEST_PACK_v1.0.md'), 'utf8');
assert(ko10.includes('Gate 05') && ko10.includes('PRELIMINARY_LEARNING'), 'Test 7.18: KO-10 enforces Gate 05 against single campaign generalization');
assert(ko10.includes('Confounder') || ko10.includes('Tết'), 'Test 7.19: KO-10 recognizes confounders and isolates seasonal distortions');
assert(ko10.includes('VALIDATED_NEGATIVE_LEARNING'), 'Test 7.20: KO-10 preserves failed experiment learning records');

// Summary
const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = results.filter(r => !r.passed).length;

console.log('\n================================================================');
console.log(`ALL TESTS COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
if (failedTests === 0) {
  console.log('OVERALL RESULT: SUCCESS (100% PASS) - EXCLUSION GUARD & MANIFEST VERIFIED');
  process.exit(0);
} else {
  console.error(`OVERALL RESULT: FAILED (${failedTests} tests failed)`);
  process.exit(1);
}
