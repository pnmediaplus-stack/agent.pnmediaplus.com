# 075_CAMPAIGN_PLANNING_WORKFLOW_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Roadmap for N8N Campaign Planning Integration (`/plan_campaign`)  
**Purpose:** Define the contract between the Next.js Chat UI and the N8N Automation Layer for the `/plan_campaign` slash command, strictly enforcing the Gatekeeper's security and architecture mandates.

---

## 0. Roadmap Principle

The integration between the Chat UI (`/plan_campaign`) and N8N MUST be built with strict boundaries. The AI Agent in N8N operates as a background worker that receives commands via Supabase Webhooks and reports back via a secure callback endpoint.

All integrations must strictly adhere to the 4 Gatekeeper Hard Constraints to prevent technical debt and ensure production safety.

---

## 1. The 4 Hard Constraints (Gatekeeper Contract)

1. **Command Scope Rõ Ràng (Strict Command Scoping):**
   - Lệnh `/plan_campaign` KHÔNG được route mù (blind routing). 
   - Bắt buộc phải có tham số `department_id` hoặc `department_name` hợp lệ khớp với Registry (`060_DEPARTMENT_REGISTRY_SCHEMA`). 
   - Nếu thiếu tham số hoặc sai department, UI và API Chat Action phải fail-closed ngay lập tức (chặn lưu vào Database và trả về lỗi hướng dẫn người dùng).

2. **Append-Only Callback:**
   - Luồng N8N trả kết quả về khung chat tuyệt đối CHỈ dùng cơ chế thêm tin nhắn (append-only).
   - Nghiêm cấm mọi hành vi sửa đổi (mutate) State của Task, Thread, hoặc Chat hiện tại từ phía N8N callback.

3. **Auth Lane Separation:**
   - Bảo mật luồng gọi từ N8N về Next.js API thông qua cơ chế Auth Lane tách biệt.
   - Khi sử dụng `N8N_API_KEY`, cần cấp Key/Lane riêng biệt chỉ dành cho tác vụ `campaign_planning` để đảm bảo đặc quyền được phân tách (Least Privilege).

4. **Tái sử dụng Endpoint (Endpoint Reuse):**
   - Chỉ sử dụng ĐÚNG endpoint `/api/n8n/publish-callback` đã được hardening ở Phase 074 với Action là `chat_append`.
   - Tuyệt đối không sinh thêm Endpoint mới cho tác vụ gửi tin nhắn tiến độ hay kết quả của N8N Agent.

---

## 2. N8N Workflow Architecture

The N8N Workflow operates as a decoupled listener:

- **Trigger:** Supabase PG_NET Webhook fires on `INSERT` to `chat_messages` where `intent_type = 'plan_campaign'`.
- **Node 1 (Acknowledge):** HTTP POST to `https://[NEXT_PUBLIC_BASE_URL]/api/n8n/publish-callback` with payload:
  ```json
  {
    "action": "chat_append",
    "thread_id": "<UUID>",
    "idempotency_key": "<UUID_EXECUTION_ACK>",
    "sender": "agent",
    "body": "Marketing Agent đã nhận yêu cầu lập kế hoạch truyền thông. Đang tiến hành phân tích...",
    "intent_type": "agent_progress"
  }
  ```
- **Node 2 (AI Processing):** The Campaign Planner AI Agent evaluates the brief (e.g. 10 days, 50tr/month target) and generates a Markdown plan.
- **Node 3 (Delivery):** HTTP POST to `/api/n8n/publish-callback` appending the final Markdown plan:
  ```json
  {
    "action": "chat_append",
    "thread_id": "<UUID>",
    "idempotency_key": "<UUID_EXECUTION_DONE>",
    "sender": "agent",
    "body": "<Markdown Content>",
    "intent_type": "agent_response"
  }
  ```

---

## 3. Exit Criteria for Phase 075

- `chat-actions.ts` successfully implements strict validation for `/plan_campaign`.
- N8N correctly receives the webhook payload containing the `department_id` and the `brief`.
- N8N successfully uses the `/api/n8n/publish-callback` to stream progress and the final plan to the UI.
- No direct database writes are performed by N8N for message appending; all writes go through the audited callback endpoint.

---
