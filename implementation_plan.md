# Migrate Chat Attachments to Cloudflare R2

Mục tiêu: Chuyển đổi toàn bộ lưu trữ file đính kèm trong khung chat và file do AI (Kie) tạo ra từ Supabase Storage sang Cloudflare R2. Đồng thời, giải quyết triệt để lỗi Facebook không đọc được ảnh bằng cách thiết lập cơ chế URL Public an toàn (bỏ giới hạn 5 phút và bỏ Auth chặn Facebook).

## User Review Required
> [!IMPORTANT]
> - Cloudflare R2 mặc định là Private. Nếu bạn đã có **Public Custom Domain** cho R2, hệ thống sẽ trả về link trực tiếp. 
> - Nếu chưa có Public Domain, mình sẽ tạo một endpoint `/api/assets/public` có chức năng Redirect 302 sang Link Presigned của R2 (không cần token xác thực). Facebook hỗ trợ Redirect nên vẫn sẽ lấy được ảnh bình thường.

## Proposed Changes

---

### Cloudflare R2 Client

#### [MODIFY] [r2-client.ts](file:///d:/Projects/agent.pnmediaplus.com/src/lib/r2-client.ts)
- Bổ sung hàm `uploadBufferToR2(objectKey, buffer, contentType)` để Server có thể upload thẳng file bytes lên R2 mà không cần phải đi vòng qua Presigned Upload URL.
- Bổ sung hàm lấy Public URL: Trả về link Custom Domain nếu có, hoặc trả về link gọi tới proxy public.

---

### Chat Attachments API

#### [MODIFY] [route.ts](file:///d:/Projects/agent.pnmediaplus.com/src/app/api/chat-attachments/route.ts)
- Gỡ bỏ hoàn toàn logic fetch sang REST API của Supabase Storage (`/storage/v1/object/...`).
- Gỡ bỏ logic tạo Signed URL 5 phút.
- Gắn hàm `uploadBufferToR2` vừa tạo để lưu file đính kèm của người dùng thẳng lên R2.
- Trả về đường dẫn public (hoặc proxy public) để Chat UI render ổn định.

---

### Public Asset Proxy (New)

#### [NEW] [route.ts](file:///d:/Projects/agent.pnmediaplus.com/src/app/api/assets/public/route.ts)
- Tạo một API route mới không bị kiểm duyệt bởi `verifyActionAuth()` (cho phép Facebook cào data).
- Route này sẽ nhận `key` và kiểm tra bảo mật (chỉ cho phép truy xuất các thư mục được public như `campaign-media` hoặc `chat-attachments`).
- Tự động sinh R2 Presigned URL (1 tiếng) và trả về `302 Redirect`. Bot Facebook sẽ đi theo Redirect này để lấy ảnh.

## Verification Plan

### Automated Tests
- Build lại project (TypeScript validation) không báo lỗi.

### Manual Verification
1. Gắn thử một file ảnh vào khung chat -> File tải lên thành công, link ảnh được render ổn định.
2. Kiểm tra Bucket R2 trên Cloudflare Dashboard -> Ảnh chat đã xuất hiện trong R2.
3. Kích hoạt lại lệnh `/publish` một content bất kỳ của Kie -> Link ảnh được truyền sang Facebook thành công và không bị báo lỗi `Missing or invalid image file`.
