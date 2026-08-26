# Nâng Cấp "Trung Tâm Điều Khiển AI" Tích Hợp (Centralized AI Control Center)

Mục tiêu: Quy hoạch lại trang /omnichannel/knowledge từ một trang tải tài liệu đơn thuần thành một Bảng điều khiển (Dashboard) toàn năng cho Bot AI. Tại đây, sếp có thể bơm tài liệu, sửa tính cách, và cài đặt chiến dịch chèo kéo khách hàng mà không cần phải chạm vào n8n hay Database.

## 1. Nâng cấp Giao diện (UI/UX Redesign)
File: src/app/(dashboard)/omnichannel/knowledge/page.tsx

Thay vì vứt lộn xộn, trang này sẽ được chia thành 3 Tab phân khu rõ ràng:

### Tab 1: Kho Tri Thức (Knowledge Base)
- Nơi tải tài liệu lên cho Bot học.
- Giữ nguyên tính năng Upload file hiện có, bổ sung thêm thanh tiến trình (Processing, Success, Failed) để track status ingestion của n8n.

### Tab 2: Tính Cách & Lệnh Chỉ Đạo (Core Persona)
- Nơi dán "Master Prompt" (Bản thiết kế nhân cách).
- Cập nhật trực tiếp xuống cột bot_system_prompt trong bảng crm_channels. Mỗi khi khách chat, n8n sẽ tự động kéo cái Prompt mới nhất này ra xài.
- Triển khai: Tạo thêm API [PUT] /api/crm/channels/prompt.

### Tab 3: Chiến Dịch Chủ Động (Proactive Campaigns) - [Phase 8]
- Giao diện lập trình kịch bản đeo bám khách hàng (Follow-up).
- Cấu hình điều kiện (VD: Khách im lặng 24h) và kịch bản (VD: Khuyến mãi 10%).
- Yêu cầu xây dựng bảng CSDL crm_campaign_rules và luồng Cron Job trên n8n.

## 2. Kế Hoạch Chuyển Đổi (Migration & Backward Compatibility)
- Việc phân tách Tab sẽ giữ nguyên API GET/POST của /api/crm/knowledge hiện tại, do đó KHÔNG làm gãy luồng Upload tài liệu cũ.
- Dữ liệu tài liệu đã upload vẫn hiển thị bình thường trong Tab 1. Cột status nếu bị null (dữ liệu cũ) sẽ được fallback hiển thị là 'Đã xử lý' trên UI.

## 3. Tiêu chí nghiệm thu (Verification)
- Tab 1: Upload thành công 1 tài liệu mới, trạng thái cập nhật theo realtime.
- Tab 2: Sửa Prompt -> DB update thành công -> Gửi 1 tin nhắn test trên Messenger thấy Bot áp dụng ngay luật mới.
- Tab 3 (Nếu làm): Form tạo chiến dịch lưu thành công xuống DB.
