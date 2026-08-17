# Kế hoạch Triển khai: Cloudflare R2 Storage (`agent-storage`)

Tuyệt vời! Việc anh đã chuẩn bị sẵn Bucket `agent-storage` với chế độ **Public Access: Disabled** (Private) cho thấy anh rất quan tâm đến bảo mật và chống thất thoát tài nguyên (chống hotlink).

Với cấu hình này, hình ảnh AI tạo ra sẽ được giấu kín 100% đằng sau cánh cửa của Cloudflare. Bất kỳ ai cố tình truy cập trực tiếp bằng link cũng sẽ bị chặn lại. 

Để tương tác với kho lưu trữ siêu bảo mật này, hệ thống sẽ sử dụng cơ chế **Cloudflare R2 S3-compatible presigned URL** (Cấp thẻ ra vào có thời hạn) và **Asset Proxy** (Đường hầm trung chuyển). Dưới đây là kế hoạch chi tiết đã được Gatekeeper duyệt:

## Proposed Changes

### 1. [System & Dependencies Layer]
- **Install AWS SDK**: Cài đặt 2 thư viện chuẩn công nghiệp để giao tiếp với R2 qua chuẩn S3: `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`.
- **Environment Variables**: Yêu cầu khai báo các biến môi trường:
  ```env
  R2_ACCOUNT_ID=75f8b0f65e41949cc8efde8a9938d955
  R2_ACCESS_KEY_ID=<your_access_key>
  R2_SECRET_ACCESS_KEY=<your_secret_key>
  R2_BUCKET_NAME=agent-storage
  ```

### 2. [Backend Integration Layer]

#### [NEW] src/lib/r2-client.ts
- Xây dựng Core Client kết nối đến Cloudflare R2 Endpoint qua chuẩn S3-compatible.
- Khai báo 2 hàm tiện ích:
  - `generatePresignedUploadUrl(key)`: Tạo link cho phép N8N tải ảnh lên.
  - `generatePresignedDownloadUrl(key)`: Tạo link cho phép trình duyệt tải ảnh về.

#### [NEW] src/app/api/assets/proxy/route.ts
- Xây dựng Asset Proxy. Trong Chat, link ảnh sẽ luôn có dạng: `![Ảnh AI](/api/assets/proxy?key=campaign-x/image.png)`. Khi trình duyệt gọi API này, Backend sẽ ký một Link Download mới từ R2 và trả về mã `HTTP 302 Redirect`.
- **Gatekeeper Audit Checked**: Cấu hình Response Header với `Cache-Control: no-store, no-cache, must-revalidate` và `Expires: 0` để chặn 100% việc trình duyệt lưu Cache sai lệch cái link Proxy. Proxy cũng thực hiện check an toàn `key.includes('..')` để chống tấn công Path Traversal.

#### [NEW] src/app/api/assets/upload-ticket/route.ts
- **Gatekeeper Audit Checked**: Backend Next.js là nơi trực tiếp phát sinh và làm chủ `Object Key` cuối cùng bằng `crypto.randomUUID()`. N8N chỉ việc gọi lên xin thẻ Upload chứ không được quyền tự đặt tên. Object key sau đó được gửi trả về để N8N gán vào `payload` lưu vào CSDL.

### 3. [Workflow Layer (N8N)]

#### [MODIFY] n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json
- **Quy trình MỚI trong N8N**:
  1. AI Broker sinh ra ảnh gốc.
  2. N8N gọi `Download Image` kéo ảnh gốc vào bộ nhớ (Binary Data).
  3. N8N gọi API nội bộ `Get Upload Ticket` (Backend Next.js) để xin một thẻ `Cloudflare R2 S3-compatible presigned upload URL` kèm Object Key an toàn.
  4. N8N dùng `Upload to R2` (HTTP PUT method) để upload thẳng tấm ảnh đó vào Cloudflare R2 thông qua link vừa được cấp.
  5. N8N map chuỗi `r2_url` dạng `r2://[object_key]` rồi mới trả về cho Webhook cập nhật Database.

## Verification Plan
1. Viết API Test Tool ngắn gọn.
2. Cập nhật N8N Workflow và chạy luồng tạo ảnh.
3. Xác nhận hình ảnh hiển thị trên Chat UI thông qua `/api/assets/proxy` mượt mà, và trong bucket `agent-storage` của Cloudflare xuất hiện file vật lý.
