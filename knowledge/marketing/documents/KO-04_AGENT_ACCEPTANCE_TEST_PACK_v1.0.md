# KO-04 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-04 — ICP & Customer Evidence Pack`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-04-01 — Verbatim Customer Voice Preservation
- **Input Scenario:** Khách hàng phỏng vấn phát biểu nguyên văn: *"Bên chị giao việc qua Zalo tin nhắn trôi sạch, file thiết kế quăng lên Drive không ai quản lý được bản final."*
- **Required Decision:**
  - Lưu giữ nguyên vẹn câu thoại của khách hàng trong trường `verbatim_customer_language`.
  - Gắn nhãn `epistemic_status = VERIFIED_CSKH_RECORD` nếu có bản ghi âm/chat trích xuất từ CSKH.
  - Trích xuất `affected_role = "Account Lead / Creative Manager"`.
- **Forbidden Behavior:**
  - Cấm bóp méo, tự ý trau chuốt lại câu thoại nguyên bản của khách hàng thành văn mẫu bóng bẩy làm mất đi cảm xúc và ngôn ngữ thực tế.
  - Không tự gán ghép các than phiền về phần mềm khác thành lời phát biểu của khách về CRM này.

---

## AT-04-02 — Hypothesis Laundering Prevention (Marketing Copy vs Evidence)
- **Input Scenario:** Đội ngũ nội bộ viết một bản Persona Marketing ghi: *"Agency Founder luôn thức trắng đêm vì sợ mất khách vào tay đối thủ"*.
- **Required Decision:**
  - Xác định đây là giả thuyết của đội ngũ (`INTERNAL_ASSUMPTION`), không phải bằng chứng khách hàng thực tế.
  - Gắn nhãn bắt buộc: `epistemic_status = HYPOTHESIS` hoặc `INFERRED`.
  - Không được đưa vào trường `customer_evidence` cho đến khi có dữ liệu phỏng vấn xác thực.
- **Forbidden Behavior:**
  - Cấm "Rửa giả thuyết" (Hypothesis Laundering): Tuyệt đối không biến giả định suy đoán thành `VERIFIED_CUSTOMER_EVIDENCE`.

---

## AT-04-03 — Conflicting Customer Feedback Handling
- **Input Scenario:** Bộ phận Sales báo cáo: *"Khách hàng rất cần tính năng xuất hóa đơn VAT"*. Tuy nhiên dữ liệu CSKH thực tế của 20 khách hàng đang dùng cho thấy: *"Chưa từng có khách nào thắc mắc về hóa đơn VAT, họ chỉ phàn nàn về trễ hạn deadline của Designer"*.
- **Required Decision:**
  - Đánh dấu trạng thái: `readiness = CONFLICTING_EVIDENCE`.
  - Hành động bắt buộc: `next_required_action = ESCALATE_TO_FOUNDER` hoặc `AUDIT_SALES_RECORD`.
  - Ưu tiên dữ liệu vận hành thực tế đã qua xác minh hơn báo cáo miệng chưa kiểm chứng.
- **Forbidden Behavior:**
  - Không được tự ý đưa tính năng hóa đơn VAT vào danh sách Nhu cầu bức thiết (Core Pain) khi đang có xung đột dữ liệu trực tiếp.
