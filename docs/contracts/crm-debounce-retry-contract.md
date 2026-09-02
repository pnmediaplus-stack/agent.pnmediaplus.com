# CRM Debounce Retry Contract

Contract này chốt cách xử lý job debounce cho luồng chat 1:1 để job không bao giờ bị kẹt ở trạng thái `locked` vĩnh viễn.

## Trạng thái hợp lệ

- `pending`: job đã sẵn sàng được worker claim.
- `locked`: worker đang xử lý job, có `lock_token` và `lock_expires_at`.
- `retry_pending`: job tạm lỗi, đã unlock, chờ đến `next_retry_at`.
- `processed`: job đã gửi sang n8n thành công.
- `failed`: job lỗi cuối cùng, không retry nữa.
- `cancelled`: job bị huỷ nghiệp vụ.
- `superseded`: job bị job mới thay thế hoặc gộp ngữ cảnh.

## Trường bắt buộc

- `attempt_count`: số lần job đã bị retry.
- `next_retry_at`: thời điểm sớm nhất được phép claim lại.
- `lock_expires_at`: thời điểm lock hết hạn để reaper xử lý.
- `lock_token`: token xác thực quyền unlock/finalize của worker.
- `last_error`: lỗi gần nhất để debug.

## Luồng chuẩn

### 1. Upsert job

- Webhook chỉ được tạo hoặc cập nhật job ở trạng thái `pending` hoặc `retry_pending`.
- Nếu job đã tồn tại:
  - cập nhật `latest_message_id`, `latest_message_at`, `debounce_until`, `next_retry_at`
  - tăng `message_count`
- Không bao giờ tạo thêm job `locked` từ webhook.

### 2. Claim job

- Worker chỉ claim các job có:
  - `status IN ('pending', 'retry_pending')`
  - `next_retry_at <= now()`
- Khi claim:
  - đổi `status = 'locked'`
  - set `locked_at = now()`
  - set `lock_expires_at = now() + interval '5 minutes'`
  - set `lock_token = gen_random_uuid()`

### 3. Xử lý thành công

- Sau khi n8n trả `2xx`, job phải được finalize sang `processed`.
- Phải clear toàn bộ lock fields:
  - `locked_at = NULL`
  - `lock_expires_at = NULL`
  - `lock_token = NULL`
- `last_error` phải được reset `NULL`.

### 4. Lỗi tạm thời

- Nếu lỗi thuộc nhóm retry được:
  - network error
  - timeout
  - n8n 5xx
  - lỗi worker tạm thời
- Worker phải chuyển job từ `locked` sang `retry_pending`.
- Khi retry:
  - tăng `attempt_count`
  - set `next_retry_at = now() + backoff`
  - clear `locked_at`, `lock_expires_at`, `lock_token`
  - lưu `last_error`

### 5. Lỗi cuối cùng

- Nếu vượt số lần retry cho phép hoặc lỗi nghiệp vụ 4xx:
  - chuyển job sang `failed`
  - clear lock fields
  - lưu `last_error`

## Backoff retry

- Lần 1: 30 giây
- Lần 2: 2 phút
- Lần 3: 10 phút
- Sau đó: `failed`

## Reaper contract

- Reaper phải chạy trước mỗi vòng claim.
- Reaper chỉ xử lý job `locked` có `lock_expires_at < now()`.
- Nếu job đã hết số lần retry:
  - chuyển sang `failed`
- Nếu còn retry:
  - chuyển sang `retry_pending`
  - đặt lại `next_retry_at` theo backoff
  - clear lock fields

## Invariants

- Không có job nào được phép ở trạng thái `locked` mà không có `lock_expires_at`.
- Không có job nào được phép ở trạng thái `retry_pending` mà `next_retry_at` bị null.
- `pending` và `retry_pending` là 2 trạng thái duy nhất worker được claim.
- Worker lỗi không được để job ở `locked` rồi bỏ đó.

## Tóm tắt ngắn

- `locked` chỉ là trạng thái in-flight tạm thời.
- Tạm lỗi thì `locked -> retry_pending`.
- Hết retry hoặc lỗi nghiệp vụ thì `locked -> failed`.
- Claim chỉ lấy `pending/retry_pending`.
- Reaper dọn mọi `locked` quá hạn.
