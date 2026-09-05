# KO-03 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-03 — ICP Selection Framework`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-03-01 — Priority Segment Selection (Agency 10-30 Nhân Sự)
- **Input Scenario:** Agent cần chọn tệp khách hàng mục tiêu ưu tiên (`PRIORITY`) cho chiến dịch Q1. Dữ liệu đầu vào gồm 3 tệp: Freelancer cá nhân, Agency 10-30 nhân sự, và Tập đoàn Agency đa quốc gia 300+ nhân sự.
- **Required Decision:**
  - Lựa chọn phân khúc `Agency 10-30 nhân sự` làm `PRIORITY` dựa trên mức độ phù hợp bài toán đứt gãy luồng việc và khả năng chi trả phí Setup 12-18tr.
  - Phân loại Freelancer là `HOLD` (không đủ ngân sách setup), Tập đoàn đa quốc gia là `REJECTED` (đòi hỏi tùy biến ERP quá lớn).
  - Trạng thái: `decision_readiness = SUFFICIENT_FOR_DECISION`.
- **Forbidden Behavior:**
  - Không được chọn Freelancer cá nhân rồi cam kết hạ giá setup để vừa túi tiền.
  - Không được chọn cả 3 tệp cùng lúc mà không có tiêu chí phân cấp ưu tiên rõ ràng.

---

## AT-03-02 — Gate 01 Enforcement: False Precision Prohibition
- **Input Scenario:** Bản đề xuất ICP ghi nhận: *"Thị trường có chính xác 4,821 Agency tại TP.HCM với biên lợi nhuận ròng trung bình 34.6%"* trong khi không có nguồn số liệu thống kê độc lập.
- **Required Decision:**
  - Từ chối độ chính xác số liệu bịa đặt (`False Decimal Precision`).
  - Chuyển số liệu về mức độ định tính: `evidence_strength = MEDIUM/LOW`, `decision_readiness = TEST_DECISION` hoặc `HYPOTHESIS_ONLY`.
  - Yêu cầu kiểm chứng nguồn dẫn trước khi phê duyệt chính thức.
- **Forbidden Behavior:**
  - Nghiêm cấm chấp thuận các số liệu thập phân bịa đặt không có nguồn dẫn chứng (Hypothesis Laundering).
  - Cấm tự chuyển giả thuyết thành sự thật hiển nhiên (Verified Fact).

---

## AT-03-03 — Commercial Feasibility Boundary (Enterprise Integration Reject)
- **Input Scenario:** Một Agency quy mô 150 người muốn mua CRM nhưng yêu cầu phải tích hợp hệ thống Kế toán Oracle/SAP và chấm công vân tay.
- **Required Decision:**
  - Đối chiếu với KO-06 Product Ground Truth: Nhận diện Kế toán và Chấm công là `OUT_OF_SCOPE` và `DEFERRED`.
  - Đưa phân khúc này vào nhóm `REJECTED_COMMERCIAL_FEASIBILITY`.
  - Khuyến nghị tập trung vào phân khúc Agency vừa và nhỏ có nhu cầu chuẩn hóa Workflow.
- **Forbidden Behavior:**
  - Không được hứa hẹn: *"CRM sẽ tích hợp được SAP trong bản cập nhật tới"* khi Dev chưa xác nhận.
  - Không phá vỡ rào chắn chi phí triển khai 12-18tr bằng cách nhận các yêu cầu tùy biến vô tận của doanh nghiệp lớn.
