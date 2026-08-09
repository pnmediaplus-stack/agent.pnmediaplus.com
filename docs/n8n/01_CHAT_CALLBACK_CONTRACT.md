# 01_CHAT_CALLBACK_CONTRACT

**Classification:** `[SYSTEM ROOT]`  
**Status:** DRAFT (Phase 1.5)  
**Purpose:** Định nghĩa chuẩn giao tiếp cho N8N khi muốn gửi dữ liệu (Chat Message hoặc Trạng thái Publish) ngược về Next.js.

---

## 1. Universal Endpoint
Tất cả các Callback từ N8N đều gọi về một Endpoint duy nhất:
- **URL:** `POST /api/n8n/publish-callback`
- **Auth Header:** `x-n8n-api-key: <N8N_API_KEY>` hoặc `Authorization: Bearer <N8N_API_KEY>`

Endpoint này hoạt động như một Router, yêu cầu bắt buộc phải có trường `action` trong Payload để định tuyến nhánh xử lý. Mọi payload không hợp lệ hoặc thiếu `action` (trừ legacy) đều sẽ fail-closed (HTTP 400).

---

## 2. Nhánh: Gửi tin nhắn Chat (Chat Append)
Sử dụng nhánh này để N8N trả lời User trong luồng Chat (ví dụ: Gửi Kế hoạch sau khi chạy xong).
Endpoint tuân thủ chuẩn **Append-Only** (chỉ chèn thêm, không sửa state) và có **Idempotency** (chống ghi trùng khi retry).

**Yêu cầu Payload:**
```json
{
  "action": "chat_append",
  "thread_id": "<uuid_của_phiên_chat>",
  "organization_id": "<uuid_của_tổ_chức>",
  "idempotency_key": "<uuid_hoặc_hash_duy_nhất_cho_mỗi_tin_nhắn>",
  "sender": "marketing_agent",
  "body": "Nội dung kế hoạch hoặc phản hồi từ Agent",
  "intent_type": "agent_response",
  "metadata": {
    "any_extra_field": "..."
  }
}
```

**Nguyên tắc:**
- `idempotency_key` bắt buộc phải có. Nếu N8N gọi API 2 lần với cùng một `idempotency_key`, lần thứ 2 sẽ trả về `200 OK` nhưng không ghi thêm vào CSDL.
- Không được đính kèm các trường liên quan đến State của Task (như `status`, `job_id`). Việc quản lý State phải thông qua nhánh riêng.

---

## 3. Nhánh: Cập nhật trạng thái Publish (Publish Status)
Sử dụng nhánh này để N8N báo cáo kết quả đăng tải (Publish) lên Facebook/Social Media.
Nhánh này sẽ thay đổi trạng thái (State) của Task trong cơ sở dữ liệu (`tasks` table).

**Yêu cầu Payload:**
```json
{
  "action": "publish_status",
  "job_id": "<uuid_của_task>",
  "status": "SUCCESS | FAILED",
  "post_id": "optional_id",
  "error_message": "optional_error",
  "fb_id": "optional_fb_id"
}
```

**Nguyên tắc:**
- Branch này sẽ trực tiếp `PATCH` vào bảng `tasks` để chuyển state thành `PUBLISHED` hoặc `FAILED`.
- Chỉ sử dụng khi Task đã thực sự hoàn thành việc xuất bản ra môi trường ngoài.

---

## 4. Bắt lỗi (Fail-Closed)
- HTTP 400: Sai Schema, thiếu trường bắt buộc (`action`, `thread_id`...).
- HTTP 401: Sai API Key.
- HTTP 500: Lỗi kết nối Supabase hoặc lỗi server.
