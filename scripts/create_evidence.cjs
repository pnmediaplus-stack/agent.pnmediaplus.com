const fs = require('fs');
const path = require('path');

const targetDir = 'D:\\Projects\\CRM_PRODUCT_PACKAGING_OUTPUT_run_quick_1\\TAI LIEU TRI THUC\\TAI LIEU MARKETING\\EVIDENCE_RECORDS';

const custVoice = `# EVIDENCE RECORD: CUSTOMER VOICE & REAL OBJECTIONS v1.0
# Nguon trich xuat: 00_CSKH_MASTER_KNOWLEDGE_v1.0.md & 08_AI_ADVISOR_KNOWLEDGE_AND_DECISION_RULES_v1.1.md
# Epistemic Status: VERIFIED_CSKH_RECORD
# Phuc vu: Input kiem chung cho KO-04 (ICP & Customer Evidence Pack)

metadata:
  record_id: "EV-CUST-202608-001"
  source_authority: "CSKH_MASTER_KNOWLEDGE & AI_ADVISOR_RULES"
  extraction_date: "2026-09-05"
  effective_version: "v1.1 (2026-08-27)"
  target_market: "Vietnam B2B Agency / Creative / Marketing Studio"
  epistemic_status: "VERIFIED_CSKH_RECORD"
  epistemic_confidence: "HIGH"

customer_voice_records:
  - id: "VOC-01"
    category: "CAPABILITY_BOUNDARY"
    affected_role: "Founder / Ke toan truong"
    verbatim_customer_language: "Phan mem ben ban co tu dong xuat hoa don do va tinh luong nhan su theo KPI khong?"
    context: "Khach hang thuong nham lan Agency CRM voi he thong ERP hoac HRM/Ke toan toan dien."
    system_truth: "OUT_OF_SCOPE. Phan mem tap trung luong cong viec Lead -> Deal -> Job -> Task, khong lam ke toan thue hay HRM."
    claim_boundary: "Tuyet doi khong hua hen tinh nang ke toan hay tinh luong."

  - id: "VOC-02"
    category: "COMMERCIAL_OBJECTION"
    affected_role: "Founder / Managing Director"
    verbatim_customer_language: "Tai sao toi phai tra phi Setup ban dau 12 den 18 trieu trong khi nhieu phan mem SaaS khac cho dung thu mien phi?"
    context: "Khach hang so sanh voi cac cong cu SaaS dai tra nuoc ngoai (Trello, ClickUp)."
    system_truth: "Phi Setup chi tra cho 2 buoi dao tao chuyen giao quy trinh, chuan hoa workflow Agency, va cau hinh ban dau de go-live trong 7-14 ngay."
    claim_boundary: "Nhan manh gia tri chuan hoa van hanh, khong ha gia phi Setup."

  - id: "VOC-03"
    category: "SWITCHING_FRICTION"
    affected_role: "Operations Lead / Account Manager"
    verbatim_customer_language: "Ben toi dang quan ly bang Google Sheets va chat Zalo quen roi, chuyen sang phan mem moi nhan vien co chiu dung khong hay lai luoi nhap lieu?"
    context: "Rao can thay doi thoi quen cua doi ngu nhan vien Agency tre/creative."
    system_truth: "Giao dien phan quyen ro rang, luong viec noi tiep Lead -> Deal -> Job -> Task giup giam thao tac trung lap so voi copy paste tren Sheet."
    claim_boundary: "Khong hua hen tu dong 100%, nhan manh tinh minh bach cua Task va Deliverable."

  - id: "VOC-04"
    category: "TAX_AND_INVOICE"
    affected_role: "Ke toan / Quan ly tai chinh"
    verbatim_customer_language: "Gia tren bang gia da bao gom thue VAT chua va xuat hoa don cong ty nhu the nao?"
    context: "Khach hang doanh nghiep can lam thu tuc chi phi hop le."
    system_truth: "Gia niem yet chua bao gom VAT. Thue GTGT duoc ap dung theo quy dinh phap luat tai thoi diem xuat hoa don."
    claim_boundary: "Khong tu cong 8% hay 10%, khong noi mien thue VAT."

  - id: "VOC-05"
    category: "CORE_WORKFLOW_PAIN"
    affected_role: "Account Director / Creative Director"
    verbatim_customer_language: "Sales chot hop dong voi khach xong gui brief qua group Zalo roi troi mat, team Creative lam sai yeu cau khach mang von, he thong co giai quyet duoc khong?"
    context: "Noi dau nhuc nhoi nhat trong van hanh Agency: dut gay thong tin ban giao Sales sang Delivery."
    system_truth: "Deal Won duoc chuyen tiep thanh Campaign/Job Workspace, gan lien tai lieu brief va deliverable xuyen suot."
    claim_boundary: "Claim manh me vao kha nang lien mach du lieu du an, khong roi rot brief."

  - id: "VOC-06"
    category: "PRE_SALES_INQUIRY"
    affected_role: "Founder / Agency Owner"
    verbatim_customer_language: "Chuong trinh Founding Partner co quyen loi gi va Agency cua toi co du dieu kien tham gia khong?"
    context: "Khach hang tim kiem uu dai dong hanh giai doan dau."
    system_truth: "Gioi han 3-5 Agency phu hop dau tien, tham dinh truc tiep boi Human Founder."
    claim_boundary: "Bot chi giai thich chuong trinh, khong co quyen tu cap quyen Founding Partner."

  - id: "VOC-07"
    category: "WORKFLOW_SLA"
    affected_role: "Project Manager / Account Executive"
    verbatim_customer_language: "Ben toi co quy trinh feedback thiet ke qua 3 vong, phan mem co kiem soat duoc deadline tung vong khong?"
    context: "Kiem soat tien do va so lan chinh sua deliverable voi khach hang."
    system_truth: "Moi Deliverable gan lien voi trang thai (To Do, In Progress, Review, Done) va han nop cu the."
    claim_boundary: "Minh bach tien do, khong hua hen bot tu dong giuc khach duyet bai."

  - id: "VOC-08"
    category: "CUSTOM_BOUNDARY"
    affected_role: "Tech Lead / Agency Owner"
    verbatim_customer_language: "Neu toi muon chinh sua quy trinh hoac tich hop them phan mem khac thi ben ban co nhan lam rieng khong?"
    context: "Nhu cau custom tinh nang dac thu ngoai ban Core."
    system_truth: "Support != Configuration != Custom Development. Yeu cau custom can qua Technical Assessment va bao gia tach biet."
    claim_boundary: "Khong gop phi custom vao phi thue bao hang nam."

  - id: "VOC-09"
    category: "PACKAGE_SELECTION"
    affected_role: "Agency Founder"
    verbatim_customer_language: "Cong ty toi hien tai 15 nhan su thi chon goi nao hop ly nhat, sau nay mo rong them nguoi co nang cap duoc khong?"
    context: "Lua chon goi ban dau toi uu chi phi."
    system_truth: "Goi Agency Core 20 (cho <= 20 user) la phu hop nhat, co the nang cap len Core 35 hoac 50 khi quy mo phinh to."
    claim_boundary: "Tu van dung theo 3 user bands niem yet trong Price Matrix."

  - id: "VOC-10"
    category: "FEATURE_LIMITATION"
    affected_role: "Creative Designer / Copywriter"
    verbatim_customer_language: "Phan mem co app tren dien thoai iOS/Android de nhan vien nhan task nhanh khong?"
    context: "Mong muon tinh tien loi di dong cua nhan su tre."
    system_truth: "He thong toi uu trai nghiem Web App Responsive tren trinh duyet di dong, chua co app native doc lap."
    claim_boundary: "Trung thuc ve Web App, khong bia dat co ung dung App Store/CH Play."

  - id: "VOC-11"
    category: "CAPACITY_PAIN"
    affected_role: "Founder / Operations Director"
    verbatim_customer_language: "Lam sao de toi nhin vao he thong la biet ngay trong tuan nay nhan su nao dang qua tai, ai dang ranh de nhan them du an?"
    context: "Mu mo ve tai cong viec (Capacity Blindness) dan den nhan au hoac tu choi oan khach hang."
    system_truth: "Module Capacity Planning va Staff Schedule hien thi tai cong viec va lich trinh cua tung nhan su."
    claim_boundary: "Ho tro hien thi truc quan theo du lieu nhap, khong cam ket AI tu dong phan bo thay con nguoi."

  - id: "VOC-12"
    category: "AUTOMATION_MISCONCEPTION"
    affected_role: "Performance Marketer"
    verbatim_customer_language: "He thong nay co tu dong len camp chay quang cao Facebook/Google hay chi quan ly noi bo?"
    context: "Hieu lam CRM thanh cong cu AI chay ads tu dong."
    system_truth: "PN Agency CRM la he thong quan tri van hanh noi bo (Internal Operations), khong phai cong cu Ads Automation."
    claim_boundary: "Khang dinh rach roi pham vi phan mem quan tri quy trinh."

  - id: "VOC-13"
    category: "PAYMENT_TERMS"
    affected_role: "Giam doc tai chinh / Founder"
    verbatim_customer_language: "Ben toi co the thanh toan theo tung quy truoc de trai nghiem duoc khong, hay bat buoc phai thanh toan 1 nam?"
    context: "Khach hang can nhac dong tien ban dau."
    system_truth: "Ho tro thanh toan theo Quy (Quarterly Subscription) hoac theo Nam (Annual Subscription co muc phi uu dai hon)."
    claim_boundary: "Bao dung muc phi theo quy trong Price Matrix, khong tu y tao ky thanh toan theo thang."

  - id: "VOC-14"
    category: "ONBOARDING_TIMELINE"
    affected_role: "Agency Founder / PM"
    verbatim_customer_language: "Ke tu luc ky hop dong va thanh toan thi mat bao lau de toan bo nhan vien cong ty toi co the dung duoc?"
    context: "Ap luc tien do dua cong cu vao van hanh thuc te."
    system_truth: "Khung thoi gian trien khai chuan (Standard Implementation) la tu 7 den 14 ngay lam viec, gom 2 buoi dao tao online."
    claim_boundary: "Khong hua hen go-live trong 24 gio neu chua qua quy trinh onboarding."

  - id: "VOC-15"
    category: "OUT_OF_SCOPE_INDUSTRY"
    affected_role: "Chu chuoi nha hang / Ban le"
    verbatim_customer_language: "Ben toi lam chuoi ban le thoi trang va F&B, dung phan mem nay quan ly khach va don hang duoc khong?"
    context: "Khach hang ngoai nganh Agency tim kiem giai phap."
    system_truth: "He thong thiet ke chuyen sau cho luong Deal -> Job -> Deliverable cua Agency. Nganh F&B/Ban le pho thong nen dung giai phap chuyen biet."
    claim_boundary: "Fail-closed trung thuc, khong co ban khi san pham khong phu hop."
`;

const commAuthority = `# EVIDENCE RECORD: COMMERCIAL AUTHORITY & PRICING RULES v1.0
# Nguon trich xuat: PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md
# Epistemic Status: FOUNDER_LOCKED_PRICING (Human Authority Lock)
# Phuc vu: Input kiem chung cho KO-01 (Gate 04: Commercial & Pricing Authority)

metadata:
  record_id: "EV-COMM-202608-001"
  source_authority: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md (HUMAN_APPROVED)"
  effective_version_date: "2026-08-27"
  market: "Vietnam"
  currency: "VND"
  tax_status: "BEFORE_VAT"
  epistemic_status: "FOUNDER_LOCKED_PRICING"
  authority_level: "FOUNDER_ONLY"

commercial_structure:
  model: "Setup_Fee + Recurring_Subscription + Standard_Support"
  vat_rule: "Gia niem yet chua bao gom VAT. Thue GTGT ap dung theo quy dinh hien hanh."
  discount_authority: "NONE. Agent/Bot khong co quyen tu y giam gia, chiet khau hoac them thang mien phi."

standard_price_matrix:
  - package_name: "Agency Core 20"
    user_band: "<= 20 users"
    setup_fee_vnd: 12000000
    annual_subscription_vnd: 30000000
    quarterly_subscription_vnd: 9000000
    year_1_total_annual_vnd: 42000000
    year_1_total_quarterly_vnd: 48000000
    onboarding_timeline: "7-14 ngay lam viec"
    training_sessions: "2 buoi online"

  - package_name: "Agency Core 35"
    user_band: "21 - 35 users"
    setup_fee_vnd: 15000000
    annual_subscription_vnd: 39000000
    quarterly_subscription_vnd: 12000000
    year_1_total_annual_vnd: 54000000
    year_1_total_quarterly_vnd: 63000000
    onboarding_timeline: "7-14 ngay lam viec"
    training_sessions: "2 buoi online"

  - package_name: "Agency Core 50"
    user_band: "36 - 50 users"
    setup_fee_vnd: 18000000
    annual_subscription_vnd: 48000000
    quarterly_subscription_vnd: 15000000
    year_1_total_annual_vnd: 66000000
    year_1_total_quarterly_vnd: 78000000
    onboarding_timeline: "7-14 ngay lam viec"
    training_sessions: "2 buoi online"

founding_partner_policy:
  quota: "Gioi han 3 den 5 Agency dau tien"
  approval_authority: "HUMAN_FOUNDER_ONLY"
  agent_behavior: "Chi giai thich chinh sach, tiep nhan thong tin, khong tu dong phe duyet."

customization_policy:
  deep_custom: "SEPARATE_QUOTATION"
  included_in_subscription: false
  rule: "Support != Configuration != Custom Development."
`;

const workflowPain = `# EVIDENCE RECORD: WORKFLOW FRICTION & PRODUCT BOUNDARIES v1.0
# Nguon trich xuat: 03_BUSINESS_WORKFLOW_GUIDE.md & 05_KNOWN_LIMITATIONS.md
# Epistemic Status: VERIFIED_WORKFLOW_FACT
# Phuc vu: Input kiem chung cho KO-05 (Pain Wedge) & KO-06 (Product Truth) & KO-07 (Fit Matrix)

metadata:
  record_id: "EV-WORKFLOW-202608-001"
  source_authority: "BUSINESS_WORKFLOW_GUIDE & KNOWN_LIMITATIONS"
  extraction_date: "2026-09-05"
  epistemic_status: "VERIFIED_WORKFLOW_FACT"
  target_workflow: "Lead -> Deal -> Campaign/Job -> Task -> Deliverable"

core_workflow_friction_points:
  - friction_id: "PAIN-01"
    friction_name: "Sales-Delivery Handover Disconnect"
    symptom: "Deal Won tren he thong khong tu dong ban giao tron ven thong tin sang doi ngu thuc thi."
    impact: "Brief bi sot tren Zalo, Creative lam sai yeu cau khach, tre deadline ban giao."
    solution_in_product: "Chuyen tiep Deal Won vao Campaign Workspace va Job board voi file brief dinh kem xuyen suot."
    epistemic_status: "CONFIRMED_WORKFLOW_FIT"

  - friction_id: "PAIN-02"
    friction_name: "Task Tracking Chaos via Zalo / Excel"
    symptom: "Giao viec va bao cao tien do roi rac qua nhom chat va file spreadsheet phan manh."
    impact: "Khong ro task nao dang review, task nao bi tre, khong co lich su sua doi ban deliverable."
    solution_in_product: "Bang Task -> Deliverable theo 4 trang thai: To Do, In Progress, Review, Done."
    epistemic_status: "CONFIRMED_WORKFLOW_FIT"

  - friction_id: "PAIN-03"
    friction_name: "Workload and Capacity Blindness"
    symptom: "Founder va PM khong biet ai dang qua tai (overloaded), ai dang ranh (underutilized)."
    impact: "Nhan them du an gay chay deadline hoac phan bo cong viec lech gay bat man nhan su."
    solution_in_product: "Dashboard Capacity Planning va Staff Schedule the hien truc quan tai cong viec."
    epistemic_status: "CONFIRMED_WORKFLOW_FIT"

hard_product_boundaries:
  - boundary_id: "BOUND-01"
    feature: "Billing (Xuat hoa don do, cong no thue)"
    status: "OUT_OF_SCOPE"
    instruction: "Khong nam trong pham vi san pham. Cung cap cho khach thong tin doi tac hoac huong ve nghiep vu van hanh."

  - boundary_id: "BOUND-02"
    feature: "Finance & Accounting (Quan tri tai chinh, tinh luong HRM)"
    status: "DEFERRED"
    instruction: "Chua dua vao thuong mai phien ban nay. Khong hua hen moc thoi gian ra mat."

  - boundary_id: "BOUND-03"
    feature: "Runtime Automation (Tu dong hoa 100%)"
    status: "NOT_CONFIRMED"
    instruction: "Khong claim 'tu dong hoa hoan toan'. Mức do tu dong hoa phu thuoc cau hinh trien khai cu the."

  - boundary_id: "BOUND-04"
    feature: "AI Ad Campaign Launcher"
    status: "DEFERRED"
    instruction: "PN Agency CRM khong phai tool AI tu chay Ads Facebook/TikTok."
`;

fs.writeFileSync(path.join(targetDir, 'EV_CUST_CUSTOMER_VOICE_v1.0.yaml'), custVoice, 'utf8');
fs.writeFileSync(path.join(targetDir, 'EV_COMM_COMMERCIAL_AUTHORITY_v1.0.yaml'), commAuthority, 'utf8');
fs.writeFileSync(path.join(targetDir, 'EV_WORKFLOW_PAIN_RECORDS_v1.0.yaml'), workflowPain, 'utf8');

console.log('ALL_3_EVIDENCE_RECORDS_WRITTEN_SUCCESSFULLY');
