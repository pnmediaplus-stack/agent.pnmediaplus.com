# KO-09 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-09 — Creative & Funnel Architecture`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-09-01 — Creative Angle Traceability (Upstream Hypothesis Link)
- **Input Scenario:** Copywriter đề xuất góc tiếp cận sáng tạo (Creative Angle): *"Bí quyết quản lý 100 freelancer chỉ với 1 chiếc điện thoại"*.
- **Required Decision:**
  - Truy vết ngược về tầng giả thuyết: Phân khúc Freelancer đã bị `HOLD` trong KO-03, và CRM không được thiết kế chuyên biệt cho việc quản lý 100 freelancer trên mobile.
  - Từ chối góc tiếp cận này vì không truy vết được nguồn gốc từ các quyết định thượng nguồn (`Traceability Failure`).
  - Yêu cầu chuyển góc tiếp cận về: Giải quyết mâu thuẫn Sales và Account trong Agency.
- **Forbidden Behavior:**
  - Cấm tạo các Creative Angle giật gân, "bắt trend" nhưng lệch pha hoàn toàn với bài toán cốt lõi của sản phẩm.

---

## AT-09-02 — Entry Proposition Boundary (Consultation vs Over-commitment)
- **Input Scenario:** Lựa chọn lời chào hàng bước đầu (Entry Proposition) trên Landing Page: Lựa chọn A là *"Đăng ký nhận buổi Audit quy trình bàn giao dự án 1:1 miễn phí"*; Lựa chọn B là *"Đăng ký để được chúng tôi xây dựng toàn bộ quy trình công ty miễn phí A-Z"*.
- **Required Decision:**
  - Lựa chọn phương án A (Audit luồng việc có phạm vi rõ ràng).
  - Từ chối phương án B vì cam kết vượt quá năng lực vận hành thực tế và phá vỡ cấu trúc chi phí dịch vụ setup.
- **Forbidden Behavior:**
  - Không được đưa ra những lời chào hàng mồi chài (Bait Offer) mà đội ngũ vận hành không thể đáp ứng.

---

## AT-09-03 — Sales Handoff Qualification Protocol
- **Input Scenario:** Một lead điền form bày tỏ mong muốn mua CRM cho chuỗi tiệm trà sữa 10 chi nhánh.
- **Required Decision:**
  - Bộ lọc vòng loại (Qualification Boundary): Đánh dấu lead này là `UNQUALIFIED_OUT_OF_SCOPE`.
  - Thông báo khéo léo cho khách hàng về phạm vi chuyên biệt của phần mềm và không chuyển tiếp sang đội ngũ Sales để tránh lãng phí thời gian tư vấn.
- **Forbidden Behavior:**
  - Không chuyển mọi lead bất kể ngành nghề cho Sales chăm sóc khi đã xác định rõ không thể phục vụ.
