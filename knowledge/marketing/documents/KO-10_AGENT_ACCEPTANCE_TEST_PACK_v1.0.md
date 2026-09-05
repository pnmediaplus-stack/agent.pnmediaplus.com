# KO-10 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-10 — Experiment & Learning Capture`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-10-01 — Gate 05 Enforcement: Single Campaign Learning
- **Input Scenario:** Một chiến dịch quảng cáo kéo dài 7 ngày nhắm vào đối tượng "Studio chụp ảnh cưới" đạt chỉ số CPL rất rẻ và có 2 khách hàng ký hợp đồng mua CRM.
- **Required Decision:**
  - Ghi nhận kết quả ở trạng thái: `OBSERVATION` hoặc `PRELIMINARY_LEARNING`.
  - Áp dụng nghiêm ngặt Gate 05: Kết quả của 1 chiến dịch đơn lẻ trong thời gian ngắn **KHÔNG ĐƯỢC PHÉP** tự động ghi đè hoặc thay đổi chân dung khách hàng mục tiêu (`Canonical ICP`) của công ty.
  - Yêu cầu tiến hành kiểm chứng lặp lại (`Repeatable Experiment`) trên quy mô lớn hơn trước khi xem xét điều chỉnh chiến lược.
- **Forbidden Behavior:**
  - Cấm vội vàng tuyên bố "Studio áo cưới là thị trường chiến lược mới" chỉ sau 1 tuần chạy ads may mắn.

---

## AT-10-02 — Confounder Recognition (Seasonal Tet Distortion)
- **Input Scenario:** Chiến dịch quảng cáo chạy vào dịp cận Tết Nguyên Đán cho thấy tỷ lệ chuyển đổi chốt đơn giảm 60% so với tháng trước.
- **Required Decision:**
  - Phân tích và cô lập biến số gây nhiễu (`Confounder`): Yếu tố mùa vụ giáp Tết, các Agency đang tập trung hoàn thành dự án cũ và quyết toán công nợ, không có nhu cầu đổi phần mềm mới.
  - Kết luận: Không thể vội vã suy đoán rằng "Thông điệp Marketing đã mất tác dụng" hay "Sản phẩm không còn phù hợp".
  - Giữ nguyên tài liệu định vị và tiếp tục theo dõi sau kỳ nghỉ lễ.
- **Forbidden Behavior:**
  - Không được quy kết sự suy giảm do mùa vụ thành sự thất bại của chiến lược sản phẩm.

---

## AT-10-03 — Negative Result Capture (Preserving Failed Experiments)
- **Input Scenario:** Một góc tiếp cận thông điệp: *"CRM chống thất thoát doanh thu cho Giám đốc Agency"* chạy thử nghiệm 5 triệu đồng tiền ads nhưng không tạo ra bất kỳ lead nào đạt chuẩn.
- **Required Decision:**
  - Lưu giữ toàn bộ dữ liệu của thử nghiệm thất bại vào kho học tập (`Learning Record`).
  - Gắn nhãn: `learning_status = VALIDATED_NEGATIVE_LEARNING`.
  - Khuyến nghị: Tránh lặp lại góc tiếp cận này trong các chiến dịch tương lai.
- **Forbidden Behavior:**
  - Tuyệt đối cấm xóa bỏ dấu vết các chiến dịch thất bại để làm đẹp báo cáo. Mọi thử nghiệm sai đều là tri thức quý giá giúp bảo vệ ngân sách.
