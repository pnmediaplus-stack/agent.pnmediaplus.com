# KO-05 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-05 — Pain Evidence & Pain Wedge Selection`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-05-01 — Primary Pain Wedge Selection (Workflow Handover)
- **Input Scenario:** Chiến dịch Marketing cần chọn một "Mũi nhọn nỗi đau" (Pain Wedge) duy nhất để truyền thông trong số: (1) Khó khăn tính thuế, (2) Đứt gãy bàn giao Sales sang Account/Creative, (3) Thiếu công cụ thiết kế đồ họa.
- **Required Decision:**
  - Lựa chọn Nỗi đau (2): *"Đứt gãy bàn giao giữa Sales và Account/Production"* làm `selected_pain`.
  - Chứng minh độ khớp: Phù hợp 100% với năng lực sản phẩm `Deal → Job → Task` của PN Agency CRM V1.
  - Trạng thái: `epistemic_status = VERIFIED_EVIDENCE`.
- **Forbidden Behavior:**
  - Không chọn Nỗi đau (1) vì Kế toán/Thuế là `OUT_OF_SCOPE`.
  - Không chọn Nỗi đau (3) vì CRM không phải công cụ thiết kế đồ họa.
  - Không chọn cùng lúc 5-10 nỗi đau làm loãng thông điệp và vượt quá phạm vi giải quyết của phần mềm.

---

## AT-05-02 — Gate 02 Enforcement: Weak Evidence Downgrade
- **Input Scenario:** Một nhân viên thực tập phản ánh rằng: *"Agency bạn em rất ngại việc phải nhập thông tin khách hàng 2 lần"*, nhưng không có tài liệu ghi nhận chính thức.
- **Required Decision:**
  - Hạ cấp mức độ tin cậy của thông tin: `epistemic_status = PAIN_HYPOTHESIS`.
  - Không được công nhận đây là nỗi đau phổ quát của thị trường.
  - Đề xuất tạo bài test A/B nhỏ để kiểm chứng trước khi đưa vào tài liệu truyền thông chính thức.
- **Forbidden Behavior:**
  - Cấm nâng cấp ý kiến cá nhân lẻ tẻ thành `CANONICAL_PAIN_TRUTH`.

---

## AT-05-03 — Severity vs Frequency Distinction
- **Input Scenario:** Khách hàng phàn nàn: *"Lâu lâu hệ thống load trang mất 3 giây"* (Tần suất thấp, mức độ nhẹ) và *"Tháng nào cũng có ít nhất 2 dự án bị trễ deadline giao video cho khách vì Designer không nhận được brief"* (Tần suất cao, hậu quả nghiêm trọng).
- **Required Decision:**
  - Phân loại rõ ràng: Sự cố load chậm 3s là `LOW_SEVERITY_INCIDENT`.
  - Trễ deadline giao hàng là `HIGH_SEVERITY_BUSINESS_CONSEQUENCE`.
  - Chọn nỗi đau trễ deadline làm trọng tâm khai thác thông điệp giá trị.
- **Forbidden Behavior:**
  - Không phóng đại sự cố kỹ thuật nhỏ thành nỗi đau sống còn của khách hàng.
