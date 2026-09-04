# 075 N8N STAGING VERIFICATION RUNBOOK
**Target Workflow:** `075_N8N_CAMPAIGN_PLANNER_STRICT.json` (Commit: `8116faf`)  
**Mục tiêu:** Thu thập 5 Execution ID thực tế trên N8N Staging phục vụ **Full Production Sign-off**.

---

## 1. HƯỚNG DẪN IMPORT VÀO N8N STAGING
1. Truy cập giao diện N8N Staging (`https://n8n.pnmediaplus.com`).
2. Vào **Workflows** ➔ Chọn **Import from File**.
3. Chọn file [`n8n/workflows/075_N8N_CAMPAIGN_PLANNER_STRICT.json`](file:///d:/Projects/agent.pnmediaplus.com/n8n/workflows/075_N8N_CAMPAIGN_PLANNER_STRICT.json).
4. Kiểm tra các credentials đã gán:
   - OpenAI API Account (dành cho `OpenAI Chat Model`, `Agent 4 - QA`, `Agent 7 - Packaging`).
   - Tavily API Account (dành cho `Search in Tavily`).
5. Kích hoạt workflow (**Active: TRUE**).
6. Lấy Webhook URL: `https://n8n.pnmediaplus.com/webhook/075-campaign-planner`.

---

## 2. 5 CA KIỂM THỬ THỰC TẾ TRÊN N8N STAGING

### Ca 1: Missing Context (Fail-Closed Drop Sink)
- **Mục đích:** Chứng minh webhook thiếu `organization_id` hoặc `thread_id` sẽ kết thúc tại `Fail-Closed Drop Sink` và **tuyệt đối KHÔNG gọi `chat_append`**.
- **Lệnh curl kích hoạt:**
  ```bash
  curl -X POST https://n8n.pnmediaplus.com/webhook/075-campaign-planner \
    -H "Content-Type: application/json" \
    -d '{
      "body": {
        "campaign_contract": {
          "campaign_brief": "Brief thiếu organization_id",
          "campaign_duration_days": 10,
          "paid_media_allowed": true,
          "required_terms": ["crm"]
        }
      }
    }'
  ```
- **Tiêu chí nghiệm thu:**
  - Execution kết thúc tại node `Fail-Closed Drop Sink`.
  - Không có bất kỳ request HTTP nào được gửi tới `/api/n8n/publish-callback`.
  - Ghi nhận: `Execution ID Ca 1`.

---

### Ca 2: Happy Path (Thành công ở Lượt 1)
- **Mục đích:** Chứng minh brief chuẩn 10 ngày cho Agency vượt qua QA ngay lần 1 và gửi `Delivery` với đúng `tenant/thread`.
- **Lệnh curl kích hoạt:**
  ```bash
  curl -X POST https://n8n.pnmediaplus.com/webhook/075-campaign-planner \
    -H "Content-Type: application/json" \
    -d '{
      "body": {
        "thread_id": "thread_staging_happy_01",
        "organization_id": "org_staging_test",
        "department_name": "Phòng Marketing",
        "campaign_contract": {
          "campaign_brief": "Chiến dịch 10 ngày ra mắt dịch vụ CRM tự động hóa cho agency thiết kế",
          "campaign_goal": "Thu hút 30 agency đăng ký dùng thử",
          "campaign_duration_days": 10,
          "paid_media_allowed": true,
          "required_terms": ["crm", "agency", "tự động hóa"]
        }
      }
    }'
  ```
- **Tiêu chí nghiệm thu:**
  - `AI Agent 1` chạy 1 lần (`attempt = 1`).
  - `Agent 4 QA` trả về `passed: true`.
  - `Delivery (chat_append)` gửi callback mang đúng `thread_id: "thread_staging_happy_01"`, `attempt: 1`.
  - Ghi nhận: `Execution ID Ca 2`.

---

### Ca 3: Human Clarification Flow
- **Mục đích:** Chứng minh brief thiếu dữ liệu trọng yếu khiến Agent 1 kích hoạt `needs_clarification: true` sẽ gửi câu hỏi làm rõ và dừng luồng.
- **Lệnh curl kích hoạt:**
  ```bash
  curl -X POST https://n8n.pnmediaplus.com/webhook/075-campaign-planner \
    -H "Content-Type: application/json" \
    -d '{
      "body": {
        "thread_id": "thread_staging_clarify_01",
        "organization_id": "org_staging_test",
        "department_name": "Phòng Marketing",
        "campaign_contract": {
          "campaign_brief": "Chạy quảng cáo bán nhà 50 tỷ nhưng ngân sách toàn chiến dịch là 500.000 VNĐ",
          "campaign_goal": "Bán 10 căn biệt thự trong 10 ngày với ngân sách 500k",
          "campaign_duration_days": 10,
          "paid_media_allowed": true,
          "required_terms": ["bất động sản"]
        }
      }
    }'
  ```
- **Tiêu chí nghiệm thu:**
  - Agent 1 nhận định ngân sách không khả thi về mặt toán học (`Total Budget < CPL`).
  - Trả về `needs_clarification: true`.
  - Kích hoạt node `Clarify Scope (chat_append)` gửi danh sách câu hỏi cần làm rõ.
  - Ghi nhận: `Execution ID Ca 3`.

---

### Ca 4: Retry Thành Công (Attempt 2)
- **Mục đích:** Chứng minh Agent 1 tự sửa lỗi cấu trúc hoặc chất lượng và thành công ở lượt thứ 2.
- **Tiêu chí nghiệm thu:**
  - Lượt 1 bị chặn (tại `Is Valid?` hoặc `Agent 4 QA`).
  - Node `Check Attempt Limit` tính toán `attempt = 2`.
  - Agent 1 nhận feedback và chạy lại lượt 2.
  - Lượt 2 QA pass và gửi `Delivery` với nhãn `Lượt 2/3`.
  - Ghi nhận: `Execution ID Ca 4`.

---

### Ca 5: Hard Stop Sau 3 Lượt (Tối Đa 3 Attempts)
- **Mục đích:** Chứng minh nếu không đạt tiêu chuẩn sau 3 lần sửa, hệ thống dừng cứng tại `QA Reject` và **tuyệt đối không gọi Agent 1 lần thứ 4**.
- **Tiêu chí nghiệm thu:**
  - Lượt 1 Fail ➔ Lượt 2 Fail ➔ Lượt 3 Fail.
  - `Check Attempt Limit` tính `attempt = 4`.
  - Node `If (attempt > 3)` kích hoạt nhánh TRUE.
  - Chuyển vào `QA Reject (chat_append)` thông báo dừng sau 3 lượt thử.
  - Ghi nhận: `Execution ID Ca 5`.

---

## 3. BẢNG TỔNG HỢP GỬI GATEKEEPER PRODUCTION SIGN-OFF
Sau khi hoàn tất 5 ca trên N8N Staging, điền thông tin vào bảng này và gửi cho Gatekeeper QA:

```yaml
n8n_staging_execution_report:
  workflow_version: "075_N8N_CAMPAIGN_PLANNER_STRICT.json"
  commit_hash: "8116faf"
  staging_instance_url: "https://n8n.pnmediaplus.com"
  verified_cases:
    case_1_missing_context:
      execution_id: "<N8N_EXEC_ID_1>"
      terminal_node: "Fail-Closed Drop Sink"
      chat_append_called: false
    case_2_happy_path:
      execution_id: "<N8N_EXEC_ID_2>"
      attempts_used: 1
      terminal_node: "Delivery (chat_append)"
      tenant_intact: true
    case_3_clarification:
      execution_id: "<N8N_EXEC_ID_3>"
      terminal_node: "Clarify Scope (chat_append)"
      needs_clarification_flag: true
    case_4_retry_success:
      execution_id: "<N8N_EXEC_ID_4>"
      attempts_used: 2
      terminal_node: "Delivery (chat_append)"
    case_5_hard_stop_max3:
      execution_id: "<N8N_EXEC_ID_5>"
      attempts_used: 3
      terminal_node: "QA Reject (chat_append)"
      agent_1_called_4th_time: false
  verdict_request: "PRODUCTION_SIGN_OFF"
```
