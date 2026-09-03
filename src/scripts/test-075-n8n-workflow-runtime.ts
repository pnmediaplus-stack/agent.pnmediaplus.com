import fs from 'fs';
import path from 'path';

// -----------------------------------------------------------------------------
// RUNTIME SIMULATION TEST SUITE FOR 075_N8N_CAMPAIGN_PLANNER_STRICT.json
// Validates: Pure business state counter + 25-key schema lock + fail-closed error handling
// -----------------------------------------------------------------------------

const workflowPath = path.join(process.cwd(), 'n8n', 'workflows', '075_N8N_CAMPAIGN_PLANNER_STRICT.json');
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

console.log('================================================================');
console.log('N8N WORKFLOW 075 RUNTIME VERIFICATION SUITE');
console.log('Target: n8n/workflows/075_N8N_CAMPAIGN_PLANNER_STRICT.json');
console.log('Scope: Deterministic Attempt State + 25-Key Schema Lock + Hard Stop at 3');
console.log('================================================================\n');

// 1. Helper to extract node code
function getNode(name: string) {
  const node = workflow.nodes.find((n: any) => n.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  return node;
}

const scopeResolveCode = getNode('Scope Resolve').parameters.jsCode;
const validateCode = getNode('Validate Agent 1 Output').parameters.jsCode;
const qaParserCode = getNode('QA Verdict Parser').parameters.jsCode;
const checkAttemptCode = getNode('Check Attempt Limit').parameters.jsCode;

// 2. Dummy 25-key valid Agent 1 research packet generator
function generateValidAgent1Json(timelineDays = 10): any {
  const dailyTimeline = Array.from({ length: timelineDays }, (_, i) => ({
    day: i + 1,
    objective: `Mục tiêu ngày ${i + 1}`,
    channel: 'facebook',
    creative: `Creative concept ngày ${i + 1}`,
    budget_vnd: 200000,
    metric: 'CTR > 2%',
    gate: 'Tối thiểu 10 leads'
  }));

  return {
    executive_decision: 'Định vị giải pháp CRM tự động hóa cho agency',
    icp_and_pain_wedge: 'Chủ agency 5-30 nhân sự, đau đầu vì trễ deadline',
    offer: 'Gói thử nghiệm 10 ngày 2.000.000 VNĐ',
    funnel_architecture: 'Phễu 3 tầng: Nhận thức -> Trải nghiệm -> Chốt gói',
    crm_role: 'Điều phối task tự động và quản lý tiến độ',
    chatbot_role: 'Phản hồi khách hàng 24/7 trong 3 giây',
    creative_architecture: 'Concept: Hỗn loạn vs Trật tự',
    media_buying_structure: '70% ngân sách cho Angle chính, 30% cho Angle phụ',
    '10_day_operating_plan': { phase1: 'Khởi động', phase2: 'Tăng tốc', phase3: 'Chốt số' },
    lead_qualification: 'Doanh nghiệp dịch vụ từ 5 nhân sự trở lên',
    sales_handoff: 'Chuyển lead sang Telesales sau khi bot lấy đủ SĐT',
    organic_trust_layer: 'Cẩm nang tối ưu quy trình bàn giao cho agency',
    measurement_framework: 'Đo lường CPL, CTR, Tỷ lệ phản hồi',
    budget_allocation: 'Tổng ngân sách 2.000.000 VNĐ chia 10 ngày',
    risks_policy: 'Không cam kết doanh số ảo, tuân thủ brand safety',
    day_3_gate: { metric: 'CTR > 1.5%', action: 'Điều chỉnh creative nếu không đạt' },
    day_6_gate: { metric: 'Có tối thiểu 5 cuộc hội thoại', action: 'Tối ưu bot' },
    end_of_pilot_decision_framework: 'Đánh giá ROI và quyết định scale',
    assets_required_before_launch: 'Bộ 3 video, 5 bài viết, 1 kịch bản bot',
    do_not_do: 'Không spam inbox, không quảng cáo sai sự thật',
    daily_timeline: dailyTimeline,
    uses_ads: true,
    needs_clarification: false,
    clarification_questions: [],
    assumptions_to_confirm: []
  };
}

// -----------------------------------------------------------------------------
// SCENARIO 1: Happy Path - Success on Attempt 1
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 1: HAPPY PATH (SUCCESS ON ATTEMPT 1) ---');
{
  const validJson = generateValidAgent1Json(10);
  const scopeData = {
    campaign_contract: {
      campaign_brief: 'Chạy chiến dịch 10 ngày cho Agency',
      campaign_duration_days: 10,
      paid_media_allowed: true,
      required_terms: ['agency', 'crm']
    }
  };

  // Run Validate Agent 1 Output
  const validateFn = new Function('$input', '$node', validateCode);
  const valResult = validateFn(
    { item: { json: { output: JSON.stringify(validJson), attempt: 1 } } },
    { 'Scope Resolve': { json: scopeData } }
  );

  console.log('  -> Validation Status:', valResult.json.validation_status);
  console.log('  -> Needs Clarification?:', valResult.json.needs_clarification);
  console.log('  -> Is Valid?:', valResult.json.is_valid);
  console.log('  -> Preserved Business Attempt:', valResult.json.attempt);

  if (valResult.json.validation_status !== 'VALID' || !valResult.json.is_valid || valResult.json.attempt !== 1) {
    throw new Error('SCENARIO 1 FAILED: Expected valid attempt 1');
  }

  // Run QA Verdict Parser with passed: true
  const qaParserFn = new Function('$input', '$', qaParserCode);
  const qaResult = qaParserFn(
    { item: { json: { choices: [{ message: { content: JSON.stringify({ passed: true, reason: 'Excellent strategic alignment' }) } }] } } },
    (nodeName: string) => ({ item: { json: valResult.json } })
  );

  console.log('  -> QA Verdict passed?:', qaResult.json.passed);
  console.log('  -> QA Preserved Business Attempt:', qaResult.json.attempt);

  if (qaResult.json.passed !== true || qaResult.json.attempt !== 1) {
    throw new Error('SCENARIO 1 FAILED: Expected QA passed on attempt 1');
  }
  console.log('  -> PASS: Scenario 1 succeeded on Attempt 1 without retries!\n');
}

// -----------------------------------------------------------------------------
// SCENARIO 2: System Validation Error -> Correction -> Success on Attempt 2
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 2: SYSTEM VALIDATION ERROR -> CORRECTION -> ATTEMPT 2 SUCCESS ---');
{
  // Attempt 1: Agent 1 outputs JSON missing required key 'funnel_architecture'
  const invalidJson = generateValidAgent1Json(10);
  delete invalidJson.funnel_architecture;

  const scopeData = {
    campaign_contract: {
      campaign_brief: 'Brief test',
      campaign_duration_days: 10,
      paid_media_allowed: true,
      required_terms: []
    }
  };

  const validateFn = new Function('$input', '$node', validateCode);
  const valResult1 = validateFn(
    { item: { json: { output: JSON.stringify(invalidJson), attempt: 1 } } },
    { 'Scope Resolve': { json: scopeData } }
  );

  console.log('  [Attempt 1] Validation Status:', valResult1.json.validation_status);
  console.log('  [Attempt 1] Did it convert to clarification?:', valResult1.json.needs_clarification);
  console.log('  [Attempt 1] Is Valid?:', valResult1.json.is_valid);
  console.log('  [Attempt 1] Error message:', valResult1.json.validation_error);

  if (valResult1.json.needs_clarification === true || valResult1.json.validation_status !== 'SYSTEM_VALIDATION_ERROR') {
    throw new Error('SCENARIO 2 FAILED: SYSTEM_VALIDATION_ERROR must NEVER be converted to needs_clarification=true!');
  }

  // Routes to Check Attempt Limit
  const checkAttemptFn = new Function('$input', '$', checkAttemptCode);
  const checkResult1 = checkAttemptFn(
    { item: { json: valResult1.json } },
    (nodeName: string) => ({ first: () => ({ json: { thread_id: 't1', organization_id: 'o1' } }) })
  );

  console.log('  [Check Attempt] Next Attempt computed:', checkResult1.json.attempt);
  console.log('  [Check Attempt] Feedback injected:', checkResult1.json.qa_feedback);
  console.log('  [Check Attempt] Is Blocked?:', checkResult1.json.is_blocked);

  if (checkResult1.json.attempt !== 2 || checkResult1.json.is_blocked !== false) {
    throw new Error(`SCENARIO 2 FAILED: Expected next attempt = 2, got: ${checkResult1.json.attempt}`);
  }

  // Attempt 2: AI fixes schema and outputs valid 25-key JSON
  const validJson = generateValidAgent1Json(10);
  const valResult2 = validateFn(
    { item: { json: { output: JSON.stringify(validJson), attempt: 2 } } },
    { 'Scope Resolve': { json: scopeData } }
  );

  console.log('  [Attempt 2] Validation Status:', valResult2.json.validation_status);
  console.log('  [Attempt 2] Preserved Business Attempt:', valResult2.json.attempt);

  if (valResult2.json.validation_status !== 'VALID' || valResult2.json.attempt !== 2) {
    throw new Error('SCENARIO 2 FAILED: Expected valid attempt 2');
  }
  console.log('  -> PASS: Scenario 2 routed system error into correction loop and succeeded on Attempt 2!\n');
}

// -----------------------------------------------------------------------------
// SCENARIO 3: QA Rejection -> Correction -> Success on Attempt 3
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 3: QA REJECTION -> CORRECTION -> ATTEMPT 3 SUCCESS ---');
{
  const scopeData = { campaign_contract: { campaign_brief: 'Brief 3', campaign_duration_days: 10, paid_media_allowed: true, required_terms: [] } };
  const validateFn = new Function('$input', '$node', validateCode);
  const qaParserFn = new Function('$input', '$', qaParserCode);
  const checkAttemptFn = new Function('$input', '$', checkAttemptCode);

  // Attempt 1: Valid schema, but QA rejects
  const validJson = generateValidAgent1Json(10);
  const valResult1 = validateFn({ item: { json: { output: JSON.stringify(validJson), attempt: 1 } } }, { 'Scope Resolve': { json: scopeData } });
  const qaResult1 = qaParserFn(
    { item: { json: { choices: [{ message: { content: JSON.stringify({ passed: false, reason: 'Angle too generic' }) } }] } } },
    () => ({ item: { json: valResult1.json } })
  );

  console.log('  [Attempt 1] QA Passed?:', qaResult1.json.passed, '| Attempt:', qaResult1.json.attempt);
  const checkResult1 = checkAttemptFn({ item: { json: qaResult1.json } }, () => ({ first: () => ({ json: {} }) }));
  console.log('  [Attempt 1] Next Attempt after QA fail:', checkResult1.json.attempt);

  if (checkResult1.json.attempt !== 2) throw new Error('Expected attempt 2');

  // Attempt 2: QA rejects again
  const valResult2 = validateFn({ item: { json: { output: JSON.stringify(validJson), attempt: 2 } } }, { 'Scope Resolve': { json: scopeData } });
  const qaResult2 = qaParserFn(
    { item: { json: { choices: [{ message: { content: JSON.stringify({ passed: false, reason: 'Budget allocation uneven' }) } }] } } },
    () => ({ item: { json: valResult2.json } })
  );

  console.log('  [Attempt 2] QA Passed?:', qaResult2.json.passed, '| Attempt:', qaResult2.json.attempt);
  const checkResult2 = checkAttemptFn({ item: { json: qaResult2.json } }, () => ({ first: () => ({ json: {} }) }));
  console.log('  [Attempt 2] Next Attempt after QA fail:', checkResult2.json.attempt);

  if (checkResult2.json.attempt !== 3) throw new Error('Expected attempt 3');

  // Attempt 3: QA passes
  const valResult3 = validateFn({ item: { json: { output: JSON.stringify(validJson), attempt: 3 } } }, { 'Scope Resolve': { json: scopeData } });
  const qaResult3 = qaParserFn(
    { item: { json: { choices: [{ message: { content: JSON.stringify({ passed: true, reason: 'Approved strategy' }) } }] } } },
    () => ({ item: { json: valResult3.json } })
  );

  console.log('  [Attempt 3] QA Passed?:', qaResult3.json.passed, '| Attempt:', qaResult3.json.attempt);
  if (qaResult3.json.passed !== true || qaResult3.json.attempt !== 3) {
    throw new Error('SCENARIO 3 FAILED: Expected QA pass on attempt 3');
  }
  console.log('  -> PASS: Scenario 3 incremented deterministically 1 -> 2 -> 3 and succeeded on Attempt 3!\n');
}

// -----------------------------------------------------------------------------
// SCENARIO 4: Hard Stop at Attempt 4 (Max 3 Attempts)
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 4: HARD STOP AT ATTEMPT 4 (MAX 3 ATTEMPTS STRICTLY ENFORCED) ---');
{
  const checkAttemptFn = new Function('$input', '$', checkAttemptCode);

  // Attempt 1 fails
  const res1 = checkAttemptFn({ item: { json: { attempt: 1, reason: 'Fail 1' } } }, () => ({ first: () => ({ json: {} }) }));
  console.log('  After Fail 1 -> Next Attempt:', res1.json.attempt, '| Blocked?:', res1.json.is_blocked);
  if (res1.json.attempt !== 2 || res1.json.is_blocked !== false) throw new Error('Fail 1 check failed');

  // Attempt 2 fails
  const res2 = checkAttemptFn({ item: { json: { attempt: 2, reason: 'Fail 2' } } }, () => ({ first: () => ({ json: {} }) }));
  console.log('  After Fail 2 -> Next Attempt:', res2.json.attempt, '| Blocked?:', res2.json.is_blocked);
  if (res2.json.attempt !== 3 || res2.json.is_blocked !== false) throw new Error('Fail 2 check failed');

  // Attempt 3 fails
  const res3 = checkAttemptFn({ item: { json: { attempt: 3, reason: 'Fail 3' } } }, () => ({ first: () => ({ json: {} }) }));
  console.log('  After Fail 3 -> Next Attempt:', res3.json.attempt, '| Blocked?:', res3.json.is_blocked);
  if (res3.json.attempt !== 4 || res3.json.is_blocked !== true) throw new Error('Fail 3 check failed');

  // If condition test: attempt > 3
  const isRejected = res3.json.attempt > 3;
  console.log('  If node condition (attempt > 3):', isRejected, '-> Routes to QA Reject (chat_append)');
  if (!isRejected) throw new Error('Expected hard stop at attempt 4');
  console.log('  -> PASS: Scenario 4 strictly stops after 3 failed attempts and NEVER calls Agent 1 a 4th time!\n');
}

// -----------------------------------------------------------------------------
// SCENARIO 5: Strict Fetch Registry Error Handling (Fail-Closed System Error)
// -----------------------------------------------------------------------------
console.log('--- SCENARIO 5: FETCH REGISTRY ERROR HANDLING (FAIL-CLOSED SYSTEM ERROR) ---');
{
  const scopeResolveFn = new Function('$input', '$', scopeResolveCode);

  // Case 5.1: Fetch Registry returns HTTP 500 error object
  const errRes1 = scopeResolveFn(
    { item: { json: { error: { message: 'Internal Server Error 500' } } } },
    () => ({ item: { json: { body: { thread_id: 't1', organization_id: 'o1' } } } })
  );

  console.log('  [5.1 HTTP 500] Valid?:', errRes1.json.valid, '| Error Type:', errRes1.json.error_type);
  if (errRes1.json.valid !== false || errRes1.json.error_type !== 'SYSTEM_ERROR') {
    throw new Error('5.1 Failed: Expected valid=false, error_type=SYSTEM_ERROR');
  }

  // Case 5.2: Fetch Registry returns empty payload
  const errRes2 = scopeResolveFn(
    { item: { json: {} } },
    () => ({ item: { json: { body: { thread_id: 't1', organization_id: 'o1' } } } })
  );

  console.log('  [5.2 Empty Payload] Valid?:', errRes2.json.valid, '| Error Type:', errRes2.json.error_type);
  if (errRes2.json.valid !== false || errRes2.json.error_type !== 'SYSTEM_ERROR') {
    throw new Error('5.2 Failed: Expected valid=false, error_type=SYSTEM_ERROR');
  }

  // Case 5.3: Fetch Registry missing departments array
  const errRes3 = scopeResolveFn(
    { item: { json: { packs: {} } } },
    () => ({ item: { json: { body: { thread_id: 't1', organization_id: 'o1' } } } })
  );

  console.log('  [5.3 Missing Departments] Valid?:', errRes3.json.valid, '| Error Type:', errRes3.json.error_type);
  if (errRes3.json.valid !== false || errRes3.json.error_type !== 'SYSTEM_ERROR') {
    throw new Error('5.3 Failed: Expected valid=false, error_type=SYSTEM_ERROR');
  }

  console.log('  -> PASS: Scenario 5 strictly identifies Fetch Registry failures as SYSTEM_ERROR and fails closed!\n');
}

console.log('================================================================');
console.log('ALL 5 N8N RUNTIME SCENARIOS PASSED 100%:');
console.log('  1. Happy Path Attempt 1: PASS');
console.log('  2. System Validation Error -> Correction -> Attempt 2: PASS');
console.log('  3. QA Rejection -> Correction -> Attempt 3: PASS');
console.log('  4. Hard Stop at Attempt 4 (Max 3 attempts): PASS');
console.log('  5. Fetch Registry Fail-Closed System Error: PASS');
console.log('================================================================');
