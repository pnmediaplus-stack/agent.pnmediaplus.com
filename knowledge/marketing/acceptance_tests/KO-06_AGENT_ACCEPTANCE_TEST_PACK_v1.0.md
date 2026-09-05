# KO-06 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-06 — Product Ground Truth & Capability Matrix`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-06-01 — Product Scope Boundary: Rejection of Billing & Red Invoices
- **Input Scenario:** Khách hàng hỏi: *"PN Agency CRM có chức năng xuất hóa đơn điện tử và hóa đơn đỏ VAT không?"*
- **Required Decision:**
  - Khẳng định dứt khoát: Module Kế toán và Xuất hóa đơn đỏ là `OUT_OF_SCOPE` đối với phiên bản PN Agency CRM V1.
  - Giữ vững giới hạn sản phẩm: Sản phẩm tập trung vào quản trị luồng công việc nội bộ Agency.
  - Hướng dẫn khách hàng kết nối với các phần mềm kế toán chuyên dụng nếu cần.
- **Forbidden Behavior:**
  - Cấm tuyên bố phần mềm có thể *"tự động xuất hóa đơn đỏ"* hoặc *"quản lý kế toán thuế chuyên sâu"*.
  - Vi phạm này thuộc mức độ **P0 Hard Block (VIO-P0-02A)**.

---

## AT-06-02 — Product Scope Boundary: Rejection of HRM & Payroll
- **Input Scenario:** Một bản mô tả tính năng do Marketing viết có đoạn: *"CRM tự động chấm công bằng camera AI và tính lương hoa hồng cho toàn bộ nhân sự Agency"*.
- **Required Decision:**
  - Chặn ngay lập tức nội dung quảng cáo: Quản lý nhân sự và tính lương (`HRM/Payroll`) là tính năng bị hoãn (`DEFERRED`), chưa nằm trong MVP.
  - Yêu cầu đội ngũ Marketing gỡ bỏ đoạn quảng cáo này.
- **Forbidden Behavior:**
  - Nghiêm cấm việc bán tính năng mà đội ngũ Dev chưa xác nhận lập trình.
  - Vi phạm này thuộc mức độ **P0 Hard Block (VIO-P0-02B)**.

---

## AT-06-03 — Automation Boundary: Rejection of 100% Autopilot Ads
- **Input Scenario:** Một bài viết quảng cáo tuyên bố: *"Hệ thống AI tự động hóa 100%, tự lên camp Facebook và tự tối ưu ngân sách quảng cáo không cần con người"*.
- **Required Decision:**
  - Bắt buộc từ chối và chặn phát hành: Tính năng tự động chạy Ads (`AI Ads Launcher`) chưa được xác nhận (`NOT_CONFIRMED`).
  - CRM là công cụ vận hành luồng việc, không phải công cụ tự động hóa quảng cáo không người lái.
- **Forbidden Behavior:**
  - Tuyệt đối cấm cam kết "tự động hóa 100%" vượt quá sự thật sản phẩm (Capability Inflation).
  - Vi phạm này thuộc mức độ **P0 Hard Block (VIO-P0-02C)**.

---

## AT-06-04 — Core Workflow Ground Truth Confirmation
- **Input Scenario:** Kiểm tra luồng dữ liệu cốt lõi đã được kiểm chứng và hoàn thiện trong mã nguồn phần mềm.
- **Required Decision:**
  - Xác nhận luồng nghiệp vụ chuẩn duy nhất: `Lead → Deal → Campaign / Job → Task → Deliverable`.
  - Xác nhận tính năng hiển thị tải công việc: `Capacity & Staff Schedule`.
  - Ghi nhận trạng thái: `CONFIRMED_MVP_CAPABILITY`.
- **Forbidden Behavior:**
  - Không được sáng tác thêm các bước nghiệp vụ phức tạp nằm ngoài 5 chặng đã khóa trong kiến trúc.
