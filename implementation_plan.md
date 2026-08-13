# Kế hoạch Triển khai: Kiến trúc BYOK & Multi-Provider Động (Tái sử dụng Phase 070)

Mục tiêu: Chuyển đổi kiến trúc sang dạng cấu hình động (Config-driven) mà **KHÔNG CẦN TẠO THÊM BẢNG DATABASE MỚI**. Tái sử dụng tối đa hệ thống Phase 070 (Tenant Integration Vault) hiện có để quản lý danh mục Model và Tùy chọn của Tenant.

## Phân tích Kiến trúc hiện tại & Hạn chế
- **Hạn chế 1 (Next.js):** Các file như `openai-adapter.ts` hay `fal-ai-adapter.ts` đang bị hardcode bảng giá (Pricing) và tên Model.
- **Hạn chế 2 (N8N):** Node AI Broker đang bị fix cứng giá trị `model: 'dall-e-3'`.
- **Lợi thế:** Hệ thống đã có bảng `integration_providers` (chứa danh sách nhà cung cấp) và `tenant_integrations` (chứa API Key của Tenant). Cả 2 bảng này đều có cột `public_metadata` kiểu JSONB cực kỳ linh hoạt.

## Proposed Changes (Giải pháp Tối ưu)

### 1. Tận dụng `public_metadata` thay vì tạo bảng mới
- **Tại bảng `integration_providers`**: Chúng ta sẽ lưu danh sách các models hỗ trợ và giá tiền vào cột `public_metadata`.
  - Ví dụ: `public_metadata: { "models": [{ "code": "dall-e-3", "capability": "image", "cost": 40.0 }, { "code": "gpt-4o", "capability": "text", "cost": 5.0 }] }`
- **Tại bảng `tenant_integrations`**: Chúng ta sẽ lưu lựa chọn Model mặc định của Tenant vào cột `public_metadata`.
  - Ví dụ: `public_metadata: { "preferred_image_model": "fal-ai/flux/dev", "preferred_text_model": "gpt-4o" }`

### 2. Nâng cấp Giao diện UI (Dashboard Cấu hình API)
- Trên giao diện `/tenant-integrations` hiện tại (như anh chụp ảnh), sau khi Tenant điền API Key cho một AI Provider (vd: OpenAI), UI sẽ bung ra một Dropdown để chọn "Mô hình Hình ảnh mặc định" và "Mô hình Text mặc định" dựa trên danh sách models lấy từ `integration_providers`.
- Các lựa chọn này sẽ được lưu gọn gàng vào `public_metadata` của `tenant_integrations`.

### 3. Dọn dẹp Code Hardcode trong Next.js
- **[MODIFY]** `src/lib/ai-providers/*-adapter.ts`
  - Gỡ bỏ hoàn toàn các biến hằng số `OPENAI_PRICING`, `FAL_PRICING`.
  - Logic tính phí (Metering) sẽ quét qua danh sách `models` trong `public_metadata` của Provider để tính giá.

### 4. Thiết kế lại Luồng N8N (Config-driven)
- **[MODIFY]** Luồng `PHASE3_AUTO_CONTENT_CREATOR.json`
  - Node `Fetch Governance Registry` sẽ được bổ sung thêm thông tin cấu hình từ `tenant_integrations.public_metadata`.
  - Node `AI Broker (Image)` sẽ sử dụng biến môi trường lấy từ Registry thay vì hardcode:
    ```json
    {
       "provider": "{{ $('Fetch Registry').item.json.preferred_image_provider }}",
       "model": "{{ $('Fetch Registry').item.json.preferred_image_model }}",
       "prompt": "..."
    }
    ```
  - Cập nhật Node `Extract Visual` tương thích nhiều định dạng trả về.

## Verification Plan
1. Xóa file SQL thừa (`phase076_dynamic_ai_catalog.sql`).
2. Sửa file Seed Database (`phase070_...`) để nhồi sẵn danh sách models vào metadata của Provider OpenAI và Fal.ai.
3. Chạy giao diện, chọn Model, lưu lại, và chạy test N8N để xác minh ảnh được vẽ bằng Fal.ai.
