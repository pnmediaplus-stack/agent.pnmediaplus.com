# Kế hoạch Triển khai: "Context-Aware Chat" (Nhận thức Chiến lược Chiến dịch)

Tính năng này sẽ biến Chat UI từ một giao diện ra lệnh đơn thuần thành một Trợ lý thực thụ, biết tự động bám theo Kế hoạch Marketing của công ty.

## 1. Nguồn Dữ liệu Chiến dịch (Campaign Context Source)
* Lấy từ bảng `pn_content_phase2.campaigns`.
* Dữ liệu bóc tách để nhồi vào AI (Strategic Context): `campaign_name`, `campaign_goal`, `campaign_brief`, `target_audience`, `tone_of_voice` (nếu có trong `validation_hints`).

## 2. Lưu trữ Ngữ cảnh theo Luồng Chat (Thread-Level Active Campaign)
* Bổ sung cột `active_campaign_id` (UUID) vào bảng `pn_os_ai_department.chat_threads`.
* Bổ sung API/Slash Command để người dùng gán chiến dịch cho luồng hiện tại: `/campaign set <tên_hoặc_id>`.

## 3. Quy tắc chọn ACTIVE Campaign (Selection Rules & Fail-Closed)
Mỗi khi người dùng gõ lệnh sinh nội dung (`/viral_research` hoặc `/auto_content`), hệ thống sẽ phân giải Campaign theo thứ tự ưu tiên sau:

1. **User chỉ định trực tiếp trong lệnh:** (VD: `/viral_research Balo --campaign="Back to School"`). Nếu tìm thấy, dùng luôn.
2. **Context của Thread:** Nếu trong lệnh không có, kiểm tra cột `active_campaign_id` của Thread hiện tại. Nếu có, dùng luôn.
3. **Mặc định Duy nhất:** Kiểm tra bảng `campaigns` của Tenant. Nếu hiện tại **chỉ có đúng 1 Campaign đang ACTIVE**, tự động lấy Campaign đó làm mặc định.
4. **Fail-Closed (Hành vi an toàn):** Nếu có nhiều hơn 1 Campaign ACTIVE và user không chỉ định -> Dừng lệnh, trả lời bằng tin nhắn System yêu cầu user làm rõ: *"Hệ thống tìm thấy nhiều chiến dịch đang chạy (Back to School, Summer Sale). Bạn muốn dùng chiến dịch nào? Gõ `/campaign set <tên>` để chọn."*

## 4. Điểm Tiêm Ngữ cảnh (Injection Point)
* **API `chat-actions.ts`:** Sẽ làm nhiệm vụ phân giải logic số (3) ở trên. Nếu pass, nó sẽ query thông tin Campaign từ DB và truyền vào biến `campaignContext`.
* **N8N Workflow:** Thay vì chỉ nhận `briefText`, Webhook sẽ nhận thêm object `campaignContext`.
* **Node `Format Prompt`:** Bổ sung khối `[STRATEGIC CONTEXT]` vào đầu prompt, ép 3 Agent (Research, Caption, Image) phải sáng tạo xoay quanh Mục tiêu và Đối tượng của Chiến dịch này.

## 5. Trải nghiệm người dùng (UX)
* **Autocomplete:** Chat UI sẽ được nâng cấp để gõ `/campaign set ` hiện ra danh sách thả xuống các Chiến dịch đang Active (Lấy qua API).

> [!IMPORTANT]
> **User Review Required:**
> Anh thấy thứ tự ưu tiên phân giải Chiến dịch và hành vi **Fail-Closed** (từ chối chạy nếu có quá nhiều chiến dịch mà không chỉ định) đã hợp lý và chặt chẽ chưa ạ? Mình có muốn cho phép AI tự động đoán chiến dịch dựa trên từ khóa không, hay cứ ép User phải chọn cho an toàn?
