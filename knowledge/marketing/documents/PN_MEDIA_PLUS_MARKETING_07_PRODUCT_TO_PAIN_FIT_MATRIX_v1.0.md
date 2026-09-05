# KO-07: PRODUCT-TO-PAIN FIT MATRIX v1.0

**Document ID:** PN_MEDIA_PLUS_MARKETING_07_PRODUCT_TO_PAIN_FIT_v1.0
**Target Product:** PN Agency CRM V1
**Status:** LOCKED FOR MVP
**Purpose:** Nối Nỗi đau của khách hàng (Pain) với Năng lực thực tế của phần mềm (Ground Truth), làm cơ sở cho Bot Marketing tạo thông điệp, và Bot Dev biết "Tại sao mình lại code tính năng này".

---

## 1. DECISION OUTPUT SCHEMA (Định dạng Quyết định)

```yaml
product_fit_decision:
  selected_product_or_service: "PN Agency CRM V1"
  customer_problem: "Đứt gãy thông tin giữa Sales, Account và Production tại các Agency."
  
  fit_status: "STRONG_FIT_CONFIRMED"
  evidence_used: "Product Ground Truth (KO-06) xác nhận có luồng Lead → Deal → Job → Task xuyên suốt."
  
  limitations: "Không giải quyết vấn đề quản trị tài chính (Billing/Finance)."
  assumptions: "Agency khách hàng có chia team Sales/Account/Creative rõ ràng."
  
  claim_boundary: "Chỉ hứa hẹn 'liền mạch quy trình làm việc', không hứa hẹn 'tự động hóa 100%'."
  confidence_level: HIGH
  next_required_action: "Đưa dữ kiện này vào KO-08 để chốt Value Proposition."
```

---

## 2. PRODUCT-TO-PAIN FIT MATRIX (Ma trận Đối khớp)

Đây là tài liệu cốt lõi để CTO/Dev hiểu được business value (Giá trị kinh doanh) của từng dòng code:

| Nỗi đau của Agency (Pain Wedge) | Tính năng giải quyết (Product Capability) | Giá trị thực mang lại (Value Mechanism) | Hướng dẫn cho Dev Bot |
|---|---|---|---|
| **"Sales chốt hợp đồng xong, Account và Creative không nắm được thông tin."** | Luồng chuyển đổi `Deal → Campaign / Job` | Dữ liệu khách hàng đi theo suốt vòng đời dự án, không phải nhập lại từ đầu. | Đảm bảo data binding giữa Deal và Job không bị đứt gãy. |
| **"Quản lý giao việc bằng Zalo/Excel, khó biết ai đang làm gì, task nào trễ."** | Giao diện quản lý `Task → Deliverable` & Campaign Workspace. | Theo dõi tiến độ Real-time, Review và Phê duyệt ngay trên 1 hệ thống. | Giữ nguyên trạng thái luồng (To Do, In Progress, Review, Done) thật trực quan. |
| **"Founder không biết team có đang quá tải hay không để nhận thêm khách."** | Dashboard `Capacity` & `Staff Schedule` | Nhìn thấy tải công việc của từng cá nhân theo thời gian thực. | Ưu tiên tính chính xác của dữ liệu hiển thị trên Dashboard này. |

---

## 3. HARD GATE LÊN XUỐNG (CTO/Dev Alignment)

**Quy tắc phối hợp:**
- **Product-to-Pain Lock:** Khi đã chốt Nỗi đau là "Đứt gãy luồng làm việc", mọi nỗ lực Dev/Code phải tập trung vào việc làm cho sự mượt mà của luồng `Deal → Job → Task` tốt nhất có thể. Đừng phân bổ resource của Dev để code những tính năng không liên quan trực tiếp đến Nỗi đau này (VD: Module chấm công nhân sự).

---

## 4. AGENT TEST CASE (Kiểm thử tri thức)

```yaml
agent_test_case:
  given:
    input_scenario: "Một Agency hỏi: CRM của PN có giúp tôi tính chi phí quảng cáo (Ad Spend) và biên lợi nhuận (Margin) của dự án không?"
  when:
    agent_uses_knowledge_object: "KO-07_PRODUCT_TO_PAIN_FIT"
  then:
    required_decision: "Khẳng định điểm mạnh của PN Agency CRM là quản lý luồng việc (Workflow) chứ không phải phần mềm Kế toán dự án."
  must_show:
    - evidence_used: "Product-to-Pain Fit Matrix tập trung vào Capacity và Workflow, Finance là OUT_OF_SCOPE."
    - epistemic_status: "FACT_BASED_ON_KO_07"
  must_not:
    - fabricate_data: "Không bịa ra tính năng tính toán chi phí Ad Spend tự động."
```
