# KO-06: PRODUCT GROUND TRUTH & CAPABILITY MATRIX v1.0

**Document ID:** PN_MEDIA_PLUS_MARKETING_06_PRODUCT_GROUND_TRUTH_v1.0
**Target Product:** PN Agency CRM V1
**Status:** LOCKED FOR MVP
**Purpose:** Nguồn sự thật duy nhất về năng lực lõi của sản phẩm, làm cơ sở cho cả CTO/Dev (giới hạn code) và Marketing (giới hạn claim).

---

## 1. DECISION OUTPUT SCHEMA (Định dạng Quyết định)

```yaml
product_ground_truth_decision:
  product_name: "PN Agency CRM"
  core_workflow_confirmed: "Lead → Deal → Campaign/Job → Task → Deliverable"
  commercial_status: "Validated Product Package"
  
  supported_capabilities:
    - "Quản lý Pipeline bán hàng (Leads/Deals)"
    - "Quản lý Chiến dịch & Job sản xuất"
    - "Phân công Task & Theo dõi Deliverable"
    - "Hiển thị Capacity & Staff Schedule"
    - "Cấu hình Admin (Phân quyền, Phòng ban, SLA)"
    
  unsupported_or_deferred_capabilities:
    - "Billing (OUT_OF_SCOPE)"
    - "Finance & Accounting (DEFERRED)"
    - "Renewal Management (DEFERRED)"
    - "AI Copilot (DEFERRED)"
    - "Runtime Automation tự động chuyển Job/Task (NOT_CONFIRMED)"
    - "Tự động hóa toàn phần (NOT_CONFIRMED)"

  confidence_level: HIGH
  evidence_used: "Bộ 12 tài liệu gốc PN Media Plus CRM"
  next_required_action: "Sử dụng Matrix này làm Input cho KO-07 (Product-to-Pain Fit) và định hướng giới hạn code cho Dev."
```

---

## 2. CAPABILITY MATRIX (Ma trận Năng lực)

Để đảm bảo Marketing không bán thứ Dev chưa code, và Dev không code thứ Marketing không bán, mọi tính năng phải được ánh xạ:

| Module | Tính năng thực tế (Ground Truth) | Trạng thái Dev/Product | Marketing Claim Boundary (Giới hạn quảng cáo) |
|---|---|---|---|
| **Sales CRM** | Quản lý Leads, Deals, Sales Dashboard | CONFIRMED | "Quản lý data khách hàng và tỷ lệ chốt Deal" |
| **Production** | Quản lý Campaign, Job, Task, Deliverable | CONFIRMED | "Nối liền Sales với Account và Creative, theo dõi tiến độ Job" |
| **Operations** | Capacity, Staff Schedule, SLA | CONFIRMED | "Nhìn rõ ai đang rảnh, ai quá tải, kiểm soát deadline" |
| **Automation** | Tự động tạo bản ghi, thông báo chéo | NOT_CONFIRMED | 🚫 **KHÔNG** được claim là "Hệ thống tự động hóa hoàn toàn" |
| **Finance** | Quản trị tài chính, xuất hóa đơn | OUT_OF_SCOPE | 🚫 **KHÔNG** được claim là "ERP" hay "Quản trị tài chính" |
| **AI** | Trợ lý ảo AI Copilot | DEFERRED | 🚫 **KHÔNG** được claim là "AI CRM" trong Phase này |

---

## 3. HARD GATE LÊN XUỐNG (CTO/Dev Alignment)

**Quy tắc phối hợp Dev - Marketing:**
1. **Marketing không được vượt rào (Claim Scope > Product Scope):** Bất kỳ thông điệp nào hứa hẹn "Tự động hóa luồng việc" hoặc "Quản lý tài chính Agency" sẽ bị BLOCK tại Gate 04 (Claim Safety).
2. **Dev không tự phình rào (Over-engineering):** CTO và Dev Bot chỉ tập trung hoàn thiện và fix bug cho luồng *Lead → Deal → Job → Task*. Không tự phát triển module Finance hoặc AI ở giai đoạn này để bảo vệ biên lợi nhuận (Setup Fee 12-18tr).

---

## 4. AGENT TEST CASE (Kiểm thử tri thức)

```yaml
agent_test_case:
  given:
    input_scenario: "Khách hàng Agency yêu cầu phần mềm CRM có thể tự động xuất hóa đơn đỏ và tính lương nhân sự."
  when:
    agent_uses_knowledge_object: "KO-06_PRODUCT_GROUND_TRUTH"
  then:
    required_decision: "Từ chối khéo léo yêu cầu tự động xuất hóa đơn và tính lương, đưa bài toán về luồng quản trị vận hành Campaign/Task cốt lõi."
  must_show:
    - evidence_used: "Billing là OUT_OF_SCOPE, Finance là DEFERRED."
    - epistemic_status: "FACT_BASED_ON_KO_06"
  must_not:
    - exceed_claim_boundary: "Không hứa hẹn sẽ code thêm module tính lương miễn phí."
```
