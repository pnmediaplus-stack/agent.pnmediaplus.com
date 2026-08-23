# Canonical Visual Assets Contract

Mục tiêu: chuẩn hóa toàn bộ pipeline ảnh thành một contract duy nhất là `visual_assets`, để mọi tầng từ Chat UI, `chat-actions`, n8n, QA, đến Facebook publish đều đọc và ghi cùng một kiểu dữ liệu. Không thêm storage migration vào plan này.

## Phạm vi
- Chuẩn hóa tên field cho ảnh sang `visual_assets` end-to-end.
- Loại bỏ các tên trung gian dễ gây lệch contract như `image_url`, `image_urls`, `providedImageUrl`, `providedImageUrls`, `artifacts.image`, `artifacts.images` khi đi qua ranh giới hệ thống.
- Giữ nguyên hạ tầng lưu file hiện tại trong plan này. Nếu cần đổi storage sau, sẽ tách thành plan riêng.

## Contract Mục Tiêu
`visual_assets` là mảng duy nhất mô tả ảnh của một content item.
- Mỗi phần tử là một object có tối thiểu: `url`, `type`, `source`, `batch_id`.
- `type` phân biệt ảnh upload từ user, ảnh AI tạo, hoặc ảnh tham chiếu.
- `source` ghi rõ từ đâu sinh ra asset để debug và audit.

## Proposed Changes

---

### Frontend Chat

#### [MODIFY] [src/components/chat/ChatComposer.tsx](file:///d:/Projects/agent.pnmediaplus.com/src/components/chat/ChatComposer.tsx)
- Chỉ lưu một canonical mảng `visual_assets` ở state submit.
- Khi user chọn nhiều file, tất cả file hợp lệ đều được map vào `visual_assets`.
- Không còn xuất ra nhiều biến song song cho cùng một ý nghĩa.

### Chat Actions

#### [MODIFY] [src/app/actions/chat-actions.ts](file:///d:/Projects/agent.pnmediaplus.com/src/app/actions/chat-actions.ts)
- Đảm bảo payload gửi sang AI Orchestrator và n8n luôn mang `visual_assets`.
- Khi router map intent, không tạo thêm field ảnh tạm khác ngoài contract chuẩn.

### AI Orchestrator

#### [MODIFY] [src/lib/ai-orchestrator/router.ts](file:///d:/Projects/agent.pnmediaplus.com/src/lib/ai-orchestrator/router.ts)
- Duy trì routing image action theo flag quyết định hiện có.
- Chuẩn hóa payload để output xuống n8n chỉ còn một field ảnh canonical là `visual_assets`.

### Phase 3 n8n Workflow

#### [MODIFY] [n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json](file:///d:/Projects/agent.pnmediaplus.com/n8n/workflows/PHASE3_AUTO_CONTENT_CREATOR.json)
- `Format Prompt` chỉ đọc từ `visual_assets`.
- `Set Provided Image` được đổi thành bước normalize `visual_assets`.
- `Submit Visual` ghi xuống DB theo batch contract thống nhất.
- Bỏ các biến ảnh cũ sau khi đã có canonical field.

### Phase 4 Facebook Publish

#### [MODIFY] [n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json](file:///d:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C_FB_PUBLISH_EXECUTOR.json)
- `Extract FB Assets` chỉ đọc `visual_assets`.
- `Validate FB Publish` và `Callback Success` nhận cùng một payload chuẩn, không còn phụ thuộc `image_url` đơn lẻ.

## Verification Plan

### Automated Tests
- `npx tsc --noEmit` phải xanh.
- JSON workflow của cả 2 file n8n phải parse được.

### Manual Verification
1. Upload 2 ảnh từ Chat UI và xác nhận payload đi qua các tầng chỉ còn `visual_assets`.
2. Chạy Phase 3 và kiểm tra DB lưu đủ toàn bộ ảnh theo cùng batch.
3. Chạy Phase 4 publish và xác nhận Facebook nhận đúng tập ảnh, không rơi về ảnh đầu tiên בלבד.
