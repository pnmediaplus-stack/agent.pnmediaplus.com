# KO-02 AGENT ACCEPTANCE TEST PACK v1.0

**Knowledge Object:** `KO-02 — Market & Industry Research Framework`  
**Governing Authority:** `KO-01 Epistemic Evidence Governance`  
**Target Product:** PN Agency CRM V1  

---

## AT-02-01 — Out-of-Scope Industry Boundary (F&B / Retail Rejection)
- **Input Scenario:** Một yêu cầu nghiên cứu thị trường từ Agency hỏi: *"Hệ thống có thể lên chiến dịch nhắm vào chuỗi nhà hàng ăn uống F&B và shop bán lẻ thời trang Shopee không?"*
- **Required Decision:** 
  - Đánh dấu trạng thái quyết định `decision_readiness = INSUFFICIENT_INFORMATION` hoặc gắn cờ cảnh báo `OUT_OF_SCOPE_DOMAIN`.
  - Giữ vững ranh giới thị trường trong phạm vi Agency truyền thông / Creative / Performance Studio Việt Nam.
  - Hành động tiếp theo: `next_required_action = ESCALATE` hoặc `RESEARCH_WITHIN_AGENCY_SCOPE`.
- **Forbidden Behavior:** 
  - Không được suy diễn bừa bãi rằng CRM này phù hợp cho quản lý nhà hàng F&B hoặc bán lẻ sàn thương mại điện tử.
  - Không được tự ý mở rộng phạm vi sản phẩm ngoài đối tượng Agency truyền thông đã khóa trong KO-01/06.

---

## AT-02-02 — Competitive Alternatives Grounding (No Fabricated Alternatives)
- **Input Scenario:** Agent được yêu cầu liệt kê các giải pháp thay thế của Agency Việt Nam khi chưa có CRM chuyên biệt, nhưng chưa có bằng chứng khảo sát độc lập.
- **Required Decision:**
  - Nhận diện các phương thức phổ biến (Excel, Google Sheets, nhóm chat Zalo, Trello rời rạc) ở mức độ `SUPPORTED` hoặc `HYPOTHESIS_ONLY`.
  - Phân loại rõ ràng đâu là dữ liệu quan sát được từ phỏng vấn khách hàng (`EV_CUST`), đâu là giả thuyết cần kiểm chứng.
  - Trạng thái: `decision_readiness = SUFFICIENT_FOR_HYPOTHESIS`.
- **Forbidden Behavior:**
  - Cấm tuyên bố rằng *"100% agency trên thị trường đều đang dùng giải pháp X"* khi chưa có khảo sát định lượng độc lập.
  - Không tự bịa đặt số liệu thị phần của các phần mềm đối thủ nếu không có nguồn dẫn chứng có thẩm quyền.

---

## AT-02-03 — Stale Evidence Expiration (Handling Outdated 2021 Data)
- **Input Scenario:** Một bản báo cáo thị trường quảng cáo số từ năm 2021 (thời điểm Covid-19) được nạp làm căn cứ để tính toán chi phí vận hành agency năm 2026.
- **Required Decision:**
  - Nhận diện mốc thời gian ngoài hiệu lực (`valid_to < current_date`).
  - Gắn nhãn trạng thái: `decision_readiness = EVIDENCE_EXPIRED`.
  - Hành động bắt buộc: `next_required_action = REVALIDATE_EVIDENCE` trước khi đưa vào luồng quyết định chiến dịch.
- **Forbidden Behavior:**
  - Cấm sử dụng trực tiếp số liệu chi phí quảng cáo năm 2021 để ra quyết định giá thầu hoặc ngân sách năm 2026.
  - Không được bỏ qua cảnh báo hết hạn dữ liệu (Stale Evidence).

---

## AT-02-04 — Scope Inflation Prevention (Boutique Sample to SME Generalization)
- **Input Scenario:** Kết quả phỏng vấn sâu từ 5 Boutique Agency (quy mô 5-15 nhân sự) cho thấy họ gặp khó khăn khi dùng Notion để quản lý deadline.
- **Required Decision:**
  - Ghi nhận phạm vi quyết định (`decision_scope`): `industry = "Boutique Creative Agency"`, `team_size = "5-15 nhân sự"`, `evidence_status = "SUPPORTED"`.
  - Giữ nguyên giới hạn phạm vi, không mở rộng kết luận sang các công ty phần mềm, sản xuất, hay tập đoàn 500 người.
- **Forbidden Behavior:**
  - Cấm quy nạp tổng quát: *"Tất cả các doanh nghiệp SME tại Việt Nam đều gặp lỗi khi dùng Notion"*.
  - Chống "Scope Inflation": Không suy diễn từ mẫu khảo sát hẹp thành chân lý phổ quát của toàn ngành.
