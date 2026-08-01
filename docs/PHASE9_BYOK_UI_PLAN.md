# Phase 9: Premium Dynamic BYOK UI (Tenant Integrations)

## Overview
Phase 9 tập trung vào việc nâng cấp giao diện cấu hình API (Bring Your Own Key) cho Tenant. Dựa trên kiến trúc Adapter đã hoàn thành ở Phase 8, UI mới tự động lấy danh sách AI Providers và render động thành các thẻ (IntegrationCard) trực quan.

## Technical Details
- **Zero-Code Frontend**: Giao diện không hard-code tên bất kỳ Provider nào. Tất cả đều được map động từ API `/api/tenant-integrations` (dựa trên `src/lib/ai-providers/index.ts`).
- **Aesthetics**: Giao diện áp dụng **Sleek Dark Mode + Light Glassmorphism** (slate/cyan/emerald/rose).
- **Security Constraint**: 
  - Hoàn toàn **không gọi Supabase từ Client**. Tất cả thao tác (`create`, `rotate`, `revoke`, `test`) đều đi qua `/api/tenant-integrations/*` nội bộ.
  - Form nhập API Key giữ nguyên chuẩn **Write-Only**: Dữ liệu chỉ đi 1 chiều vào vault, tuyệt đối không trả ngược ra Client.
  - Fail-closed constraints của Phase 070 được giữ nguyên vẹn.

## Components
- `src/components/phase070/TenantIntegrationsView.tsx`: Layout chính, điều phối API POST/GET.
- `src/components/ui/IntegrationCard.tsx`: Thẻ hiển thị trạng thái và Form nhập Key, tích hợp `lucide-react` icons.
