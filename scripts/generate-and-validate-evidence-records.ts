import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import YAML from 'yaml';
import { z } from 'zod';

const repoEvidenceDir = path.resolve('knowledge/marketing/evidence_records');
const packagingEvidenceDir = 'D:\\Projects\\CRM_PRODUCT_PACKAGING_OUTPUT_run_quick_1\\TAI LIEU TRI THUC\\TAI LIEU MARKETING\\EVIDENCE_RECORDS';

[repoEvidenceDir, packagingEvidenceDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 1. CONTENT DEFINITION WITH STRICT PROVENANCE & EPISTEMIC LABELS
const custVoiceContent = `# EVIDENCE RECORD: SYNTHESIZED CUSTOMER INQUIRY PATTERNS & OBJECTIONS v1.1
# Epistemic Classification: DERIVED_FROM_SUPPORT_MANUAL_SYNTHESIS
# (Derived from internal operating manuals & AI Advisor rules, NOT raw customer audio transcripts)
# Target Product: PN Agency CRM / Operations Suite

metadata:
  record_id: "EV-CUST-20260905-001"
  source_authority: "CSKH_MASTER_KNOWLEDGE & AI_ADVISOR_RULES"
  extraction_date: "2026-09-05"
  effective_version: "v1.1 (2026-08-27)"
  target_market: "Vietnam B2B Agency / Creative / Marketing Studio"
  epistemic_status: "DERIVED_FROM_SUPPORT_MANUAL_SYNTHESIS"
  epistemic_confidence: "HIGH_FOR_INTERNAL_RULES_ONLY"
  note: "This document synthesizes common inquiry patterns and boundaries recorded in support guidelines. It does not represent raw unedited customer audio transcripts."

customer_inquiry_patterns:
  - id: "INQ-01"
    category: "CAPABILITY_BOUNDARY"
    affected_role: "Founder / Ke toan truong"
    inquiry_pattern_synthesized: "Phan mem ben ban co tu dong xuat hoa don do va tinh luong nhan su theo KPI khong?"
    context: "Khach hang Agency thuong co nhu cau kep giua quan tri du an va ke toan/HRM."
    system_truth: "OUT_OF_SCOPE. Phan mem tap trung chuyen sau vao core workflow Lead -> Deal -> Job -> Task -> Deliverable. Khong co module ke toan thue hoac HRM tinh luong."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 4: Product Boundary"
      source_lines: "91-105"
    claim_boundary: "Tuyet doi khong hua hen tinh nang ke toan, hoa don do hoac tinh luong."

  - id: "INQ-02"
    category: "COMMERCIAL_OBJECTION"
    affected_role: "Founder / Managing Director"
    inquiry_pattern_synthesized: "Tai sao toi phai tra phi Setup ban dau 12 den 18 trieu trong khi nhieu cong cu SaaS khac cho dung thu mien phi?"
    context: "Khach hang so sanh mo hinh trien khai chuyen sau voi cac cong cu SaaS dai tra (Trello, ClickUp, Notion)."
    system_truth: "Phi Setup chi tra cho dich vu trien khai: 2 buoi online training chuyen giao quy trinh, cau hinh workflow chuan hoa theo Agency, va cam ket dong hanh go-live trong 7-14 ngay."
    provenance:
      source_document: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md"
      source_section: "Section 2: Commercial Position & Section 4: Standard Price Matrix"
      source_lines: "39-57, 83-93"
    claim_boundary: "Giai thich gia tri trien khai, tuyet doi khong tu y ha gia hoac mien phi setup."

  - id: "INQ-03"
    category: "SWITCHING_BARRIER"
    affected_role: "Operations Lead / Account Manager"
    inquiry_pattern_synthesized: "Ben toi dang quan ly bang Google Sheets va Zalo quen roi, chuyen sang phan mem moi nhan vien co chiu dung khong hay lai luoi nhap lieu?"
    context: "Rao can thoi quen nhan su Agency tre, ngai he thong cong kenh."
    system_truth: "He thong thiet ke theo luong viec tu nhien cua Agency (Lead -> Deal -> Job -> Task), giam thao tac trung lap, phan quyen ro rang."
    provenance:
      source_document: "03_BUSINESS_WORKFLOW_GUIDE.md"
      source_section: "Section B: Luong San Xuat"
      source_lines: "12-21"
    claim_boundary: "Khong hua hen tu dong 100%, nhan manh tinh minh bach va khong troi brief."

  - id: "INQ-04"
    category: "TAX_AND_INVOICE"
    affected_role: "Ke toan / Quan ly tai chinh"
    inquiry_pattern_synthesized: "Gia tren bang gia da bao gom thue VAT chua va xuat hoa don cong ty nhu the nao?"
    context: "Thu tuc thanh toan chi phi doanh nghiep."
    system_truth: "Gia niem yet chua bao gom VAT. Thue GTGT va cac nghia vu thue duoc ap dung theo quy dinh phap luat tai thoi diem xuat hoa don."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 8: VAT Communication Rule"
      source_lines: "256-271"
    claim_boundary: "Khong tu y tinh 8% hay 10%, khong tuyen bo mien thue VAT."

  - id: "INQ-05"
    category: "CORE_WORKFLOW_PAIN"
    affected_role: "Account Director / Creative Director"
    inquiry_pattern_synthesized: "Sales chot hop dong voi khach xong gui brief qua group Zalo roi troi mat, team Creative lam sai yeu cau khach khieu nai, he thong co chan duoc viec nay khong?"
    context: "Dut gay thong tin ban giao Sales sang Delivery la noi dau lon nhat cua Agency."
    system_truth: "Khi Deal Won, he thong ho tro tao Campaign/Job gan lien tai lieu brief va danh sach Deliverable xuyen suot."
    provenance:
      source_document: "03_BUSINESS_WORKFLOW_GUIDE.md"
      source_section: "Section A: Luong Tien Kinh Doanh & Section B: Luong San Xuat"
      source_lines: "3-21"
    claim_boundary: "Khuyen khich truyen thong tinh lien mach brief, khong hua hen runtime automation tu dong tao job neu chua xac nhan."

  - id: "INQ-06"
    category: "PRE_SALES_PROGRAM"
    affected_role: "Founder / Agency Owner"
    inquiry_pattern_synthesized: "Chuong trinh Founding Partner co quyen loi gi va Agency cua toi co du dieu kien tham gia khong?"
    context: "Chinh sach uu dai dong hanh giai doan dau."
    system_truth: "Gioi han 3 den 5 Agency dau tien phu hop, xet duyet duy nhat boi Human Founder."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 9: Founding Partner Rule"
      source_lines: "273-296"
    claim_boundary: "Chi giai thich chinh sach va chuyen lead cho Founder, khong tu approve Founding Partner."

  - id: "INQ-07"
    category: "WORKFLOW_FEEDBACK"
    affected_role: "Project Manager / Account Executive"
    inquiry_pattern_synthesized: "Bên toi co quy trinh feedback thiet ke qua 3 vong, phan mem co giup theo doi deadline tung vong khong?"
    context: "Quan ly vong sua doi Deliverable voi khach hang."
    system_truth: "Moi Deliverable gan voi trang thai To Do, In Progress, Review, Done va thoi han ro rang."
    provenance:
      source_document: "03_BUSINESS_WORKFLOW_GUIDE.md"
      source_section: "Section B: Luong San Xuat"
      source_lines: "12-21"
    claim_boundary: "Minh bach tien do review, khong hua bot tu dong nhac khach neu chua cau hinh."

  - id: "INQ-08"
    category: "CUSTOM_DEVELOPMENT"
    affected_role: "Tech Lead / Agency Owner"
    inquiry_pattern_synthesized: "Neu toi muon chinh sua giao dien hoac tich hop voi phan mem rieng cua toi thi chi phi nhu the nao?"
    context: "Yeu cau tuy bien ngoai ban Core."
    system_truth: "Support != Configuration != Custom Development. Yeu cau custom can danh gia ky thuat va bao gia tach biet."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 13: Support != Custom Development"
      source_lines: "383-406"
    claim_boundary: "Khong dua tinh nang custom rieng vao phi thue bao hang nam."

  - id: "INQ-09"
    category: "PACKAGE_SCALING"
    affected_role: "Agency Founder"
    inquiry_pattern_synthesized: "Cong ty toi hien tai 15 nhan su thi nen chon goi nao, sau nay mo rong co nang cap duoc khong?"
    context: "Dinh huong lua chon goi ban dau va nang cap."
    system_truth: "Agency Core 20 (cho <= 20 user) la goi tieu chuan, co the nang cap len Core 35 hoac Core 50 khi mo rong nhan su."
    provenance:
      source_document: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md"
      source_section: "Section 4: Standard Price Matrix"
      source_lines: "83-93"
    claim_boundary: "Tu van dung 3 user bands niêm yet: Core 20, Core 35, Core 50."

  - id: "INQ-10"
    category: "PLATFORM_ACCESS"
    affected_role: "Creative Designer / Copywriter"
    inquiry_pattern_synthesized: "Phan mem co app tren dien thoai iOS/Android de nhan vien nhan task va upload file khong?"
    context: "Kỳ vọng ung dung di dong."
    system_truth: "He thong su dung Web App Responsive, toi uu tren trinh duyet di dong. Chua co app native tren App Store/CH Play."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 4: Product Boundary"
      source_lines: "91-105"
    claim_boundary: "Trung thuc ve trinh duyet di dong, khong bia dat co mobile app native."

  - id: "INQ-11"
    category: "CAPACITY_MANAGEMENT"
    affected_role: "Founder / Operations Director"
    inquiry_pattern_synthesized: "Lam sao de toi nhin vao he thong la biet ngay nhan su nao dang qua tai, ai dang ranh de nhan them job?"
    context: "Mu mo tai cong viec la nguyen nhan gay chay deadline hoac tu choi oan deal."
    system_truth: "Module Capacity Planning va Staff Schedule hien thi truc quan tai cong viec theo du lieu nhap."
    provenance:
      source_document: "05_KNOWN_LIMITATIONS.md"
      source_section: "Section 5: Capacity Planning / Staff Schedule"
      source_lines: "60-68"
    claim_boundary: "Hien thi truc quan theo du lieu nhap; khong claim AI tu dong phan bo viec neu chua xac nhan."

  - id: "INQ-12"
    category: "ADS_AUTOMATION_MISCONCEPTION"
    affected_role: "Performance Marketer"
    inquiry_pattern_synthesized: "He thong nay co tu dong len campaign chay quang cao Facebook/Google hay chi quan ly noi bo?"
    context: "Nham lan giua Marketing CRM va Ads Automation tool."
    system_truth: "PN Agency CRM la he thong quan tri van hanh quy trinh (Internal Operations CRM), khong phai tool AI tu dong chay Ads."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 3: Product Truth"
      source_lines: "62-89"
    claim_boundary: "Khong nhan co tinh nang AI tu dong chay Ads."

  - id: "INQ-13"
    category: "BILLING_CYCLE"
    affected_role: "Giam doc tai chinh / Founder"
    inquiry_pattern_synthesized: "Ben toi co the thanh toan theo tung quy de xem hieu qua truoc duoc khong, hay bat buoc thanh toan 1 nam?"
    context: "Toi uu dong tien va giam rui ro cam ket."
    system_truth: "Ho tro 2 hinh thuc thanh toan: Theo Quy (Quarterly) hoac Theo Nam (Annual voi muc chi phi tiet kiem hon)."
    provenance:
      source_document: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md"
      source_section: "Section 4: Standard Price Matrix"
      source_lines: "83-93"
    claim_boundary: "Bao gia dung theo Price Matrix niem yet, khong tu y chia nho thanh goi thang."

  - id: "INQ-14"
    category: "ONBOARDING_SCHEDULE"
    affected_role: "Agency Founder / PM"
    inquiry_pattern_synthesized: "Ke tu luc ky hop dong va thanh toan thi mat bao lau de toan bo cong ty co the van hanh tren he thong?"
    context: "Tien do chuyen giao cong nghe."
    system_truth: "Thoi gian onboarding tieu chuan la 7-14 ngay lam viec, gom 2 buoi dao tao online huong dan workflow."
    provenance:
      source_document: "08_AI_ADVISOR_KNOWLEDGE_AND_DECISION_RULES_v1.1.md"
      source_section: "Section 5: AGENCY_STANDARD Behavior"
      source_lines: "82-109"
    claim_boundary: "Khong cam ket go-live duoi 7 ngay neu khach chua hoan tat chuan bi data."

  - id: "INQ-15"
    category: "OUT_OF_SCOPE_QUALIFICATION"
    affected_role: "Chu chuoi ban le / F&B"
    inquiry_pattern_synthesized: "Ben toi kinh doanh chuoi nha hang va ban le thoi trang, dung phan mem nay co hop khong?"
    context: "Khach hang ngoai phan khuc Agency."
    system_truth: "He thong duoc thiet ke dac thu cho Agency/Creative Studio voi luong Deal -> Job -> Deliverable. Nganh F&B/Ban le nen dung CRM pho thong phu hop hon."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 10: Customer Classification (Other Industry Generic)"
      source_lines: "330-337"
    claim_boundary: "Fail-closed trung thuc, khong co tinh ban khi san pham khong phu hop."
`;

const commAuthorityContent = `# EVIDENCE RECORD: CANONICAL COMMERCIAL AUTHORITY & PRICING RULES v1.1
# Epistemic Classification: CANONICAL_INTERNAL_COMMERCIAL_POLICY
# Authority Level: FOUNDER_LOCKED_PRICING (Single Source of Commercial Truth)

metadata:
  record_id: "EV-COMM-20260905-001"
  source_authority: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md (HUMAN_APPROVED)"
  effective_version_date: "2026-08-27"
  market: "Vietnam"
  currency: "VND"
  tax_status: "BEFORE_VAT"
  epistemic_status: "CANONICAL_INTERNAL_COMMERCIAL_POLICY"
  authority_owner: "HUMAN_FOUNDER_LOCKED"
  provenance:
    source_document: "PN_AGENCY_CRM_PRICE_MATRIX_v1.0.md"
    approval_state: "HUMAN_APPROVED"
    lines: "1-105"

commercial_governance_rules:
  model: "Setup_Fee + Recurring_Subscription + Standard_Support"
  vat_rule: "Gia niem yet chua bao gom VAT. Thue GTGT ap dung theo quy dinh hien hanh."
  discount_authority: "NONE. Agent/Bot tuyet doi khong co quyen tu y giam gia, chiet khau hoac tang thang mien phi."

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

const workflowPainContent = `# EVIDENCE RECORD: WORKFLOW FRICTION & PRODUCT LIMITATIONS v1.1
# Epistemic Classification: DERIVED_FROM_WORKFLOW_SPEC_AND_LIMITATIONS
# Phuc vu: Input kiem chung cho KO-05, KO-06, KO-07

metadata:
  record_id: "EV-WORKFLOW-20260905-001"
  source_authority: "BUSINESS_WORKFLOW_GUIDE & KNOWN_LIMITATIONS"
  extraction_date: "2026-09-05"
  epistemic_status: "DERIVED_FROM_WORKFLOW_SPEC_AND_LIMITATIONS"
  target_workflow: "Lead -> Deal -> Campaign/Job -> Task -> Deliverable"
  provenance:
    source_documents:
      - "03_BUSINESS_WORKFLOW_GUIDE.md"
      - "05_KNOWN_LIMITATIONS.md"

core_workflow_friction_points:
  - friction_id: "PAIN-01"
    friction_name: "Sales-Delivery Handover Disconnect"
    symptom: "Deal Won tren he thong neu khong co workspace dong bo se bi roi rot brief khi ban giao sang thuc thi."
    impact: "Brief bi sot tren Zalo, Creative lam sai yeu cau khach, tre deadline ban giao."
    solution_in_product: "Chuyen tiep Deal Won vao Campaign Workspace va Job board voi file brief dinh kem xuyen suot."
    provenance:
      source_document: "03_BUSINESS_WORKFLOW_GUIDE.md"
      source_section: "Section A: Luong Tiền Kinh Doanh & Section B: Luong San Xuat"
      source_lines: "1-21"

  - friction_id: "PAIN-02"
    friction_name: "Task Tracking Chaos via Zalo / Excel"
    symptom: "Giao viec va bao cao tien do roi rac qua nhom chat va file spreadsheet phan manh."
    impact: "Khong ro task nao dang review, task nao bi tre, khong co lich su sua doi ban deliverable."
    solution_in_product: "Bang Task -> Deliverable theo 4 trang thai: To Do, In Progress, Review, Done."
    provenance:
      source_document: "03_BUSINESS_WORKFLOW_GUIDE.md"
      source_section: "Section B: Luong San Xuat"
      source_lines: "12-21"

  - friction_id: "PAIN-03"
    friction_name: "Workload and Capacity Blindness"
    symptom: "Founder va PM khong biet ai dang qua tai (overloaded), ai dang ranh (underutilized)."
    impact: "Nhan them du an gay chay deadline hoac phan bo cong viec lech gay bat man nhan su."
    solution_in_product: "Dashboard Capacity Planning va Staff Schedule the hien truc quan tai cong viec."
    provenance:
      source_document: "05_KNOWN_LIMITATIONS.md"
      source_section: "Section 5: Capacity Planning / Staff Schedule"
      source_lines: "60-68"

hard_product_boundaries:
  - boundary_id: "BOUND-01"
    feature: "Billing (Xuat hoa don do, cong no thue)"
    status: "OUT_OF_SCOPE"
    instruction: "Khong nam trong pham vi san pham. Huong khach ve nghiep vu van hanh."
    provenance:
      source_document: "05_KNOWN_LIMITATIONS.md"
      source_section: "Section 7: Billing"
      source_lines: "80-90"

  - boundary_id: "BOUND-02"
    feature: "Finance & Accounting (Quan tri tai chinh, tinh luong HRM)"
    status: "DEFERRED"
    instruction: "Chua dua vao thuong mai phien ban nay. Khong hua hen moc thoi gian ra mat."
    provenance:
      source_document: "05_KNOWN_LIMITATIONS.md"
      source_section: "Section 8: Finance"
      source_lines: "92-100"

  - boundary_id: "BOUND-03"
    feature: "Runtime Automation (Tu dong hoa 100%)"
    status: "NOT_CONFIRMED"
    instruction: "Khong claim 'tu dong hoa hoan toan'. Muc do tu dong hoa phu thuoc cau hinh trien khai."
    provenance:
      source_document: "05_KNOWN_LIMITATIONS.md"
      source_section: "Section 4: Runtime Automation"
      source_lines: "45-58"

  - boundary_id: "BOUND-04"
    feature: "AI Ad Campaign Launcher"
    status: "DEFERRED"
    instruction: "PN Agency CRM khong phai tool AI tu chay Ads Facebook/TikTok."
    provenance:
      source_document: "00_CSKH_MASTER_KNOWLEDGE_v1.0.md"
      source_section: "Section 4: Product Boundary"
      source_lines: "99-105"
`;

// 2. WRITE TO BOTH REPO AND PACKAGING FOLDERS
const files = [
  { name: 'EV_CUST_CUSTOMER_VOICE_v1.0.yaml', content: custVoiceContent },
  { name: 'EV_COMM_COMMERCIAL_AUTHORITY_v1.0.yaml', content: commAuthorityContent },
  { name: 'EV_WORKFLOW_PAIN_RECORDS_v1.0.yaml', content: workflowPainContent }
];

for (const file of files) {
  const p1 = path.join(repoEvidenceDir, file.name);
  const p2 = path.join(packagingEvidenceDir, file.name);
  fs.writeFileSync(p1, file.content, 'utf8');
  fs.writeFileSync(p2, file.content, 'utf8');
}

// 3. RIGOROUS ZOD SCHEMA DEFINITION & PARSER VALIDATION
const MetadataSchema = z.object({
  record_id: z.string().min(5),
  source_authority: z.string().min(3),
  epistemic_status: z.string().min(5),
});

const InqPatternSchema = z.object({
  metadata: MetadataSchema,
  customer_inquiry_patterns: z.array(z.object({
    id: z.string().startsWith('INQ-'),
    category: z.string(),
    affected_role: z.string(),
    inquiry_pattern_synthesized: z.string(),
    context: z.string(),
    system_truth: z.string(),
    provenance: z.object({
      source_document: z.string(),
      source_section: z.string(),
      source_lines: z.string()
    }),
    claim_boundary: z.string()
  })).min(10)
});

const CommAuthoritySchema = z.object({
  metadata: MetadataSchema,
  commercial_governance_rules: z.object({
    model: z.string(),
    vat_rule: z.string(),
    discount_authority: z.string()
  }),
  standard_price_matrix: z.array(z.object({
    package_name: z.string(),
    user_band: z.string(),
    setup_fee_vnd: z.number().positive(),
    annual_subscription_vnd: z.number().positive(),
    quarterly_subscription_vnd: z.number().positive(),
    year_1_total_annual_vnd: z.number().positive(),
    year_1_total_quarterly_vnd: z.number().positive(),
    onboarding_timeline: z.string(),
    training_sessions: z.string()
  })).min(3),
  founding_partner_policy: z.object({
    quota: z.string(),
    approval_authority: z.string(),
    agent_behavior: z.string()
  }),
  customization_policy: z.object({
    deep_custom: z.string(),
    included_in_subscription: z.boolean(),
    rule: z.string()
  })
});

const WorkflowPainSchema = z.object({
  metadata: MetadataSchema,
  core_workflow_friction_points: z.array(z.object({
    friction_id: z.string().startsWith('PAIN-'),
    friction_name: z.string(),
    symptom: z.string(),
    impact: z.string(),
    solution_in_product: z.string(),
    provenance: z.object({
      source_document: z.string(),
      source_section: z.string(),
      source_lines: z.string()
    })
  })).min(3),
  hard_product_boundaries: z.array(z.object({
    boundary_id: z.string().startsWith('BOUND-'),
    feature: z.string(),
    status: z.string(),
    instruction: z.string(),
    provenance: z.object({
      source_document: z.string(),
      source_section: z.string(),
      source_lines: z.string()
    })
  })).min(4)
});

// 4. PARSE & VALIDATE
const manifestRecords: any[] = [];

for (const file of files) {
  const filePath = path.join(repoEvidenceDir, file.name);
  const rawText = fs.readFileSync(filePath, 'utf8');
  
  // Real YAML parsing
  const parsed = YAML.parse(rawText);
  if (!parsed) {
    throw new Error(`YAML parsing failed for ${file.name}`);
  }

  // Schema Validation
  if (file.name.includes('CUSTOMER_VOICE')) {
    InqPatternSchema.parse(parsed);
    console.log(`[PASS_ZOD_SCHEMA] ${file.name} (Items: ${parsed.customer_inquiry_patterns.length})`);
  } else if (file.name.includes('COMMERCIAL_AUTHORITY')) {
    CommAuthoritySchema.parse(parsed);
    console.log(`[PASS_ZOD_SCHEMA] ${file.name} (Packages: ${parsed.standard_price_matrix.length})`);
  } else if (file.name.includes('WORKFLOW_PAIN')) {
    WorkflowPainSchema.parse(parsed);
    console.log(`[PASS_ZOD_SCHEMA] ${file.name} (Pains: ${parsed.core_workflow_friction_points.length}, Boundaries: ${parsed.hard_product_boundaries.length})`);
  }

  // Checksum
  const sha256 = crypto.createHash('sha256').update(rawText, 'utf8').digest('hex');
  manifestRecords.push({
    file_name: file.name,
    sha256,
    byte_size: Buffer.byteLength(rawText, 'utf8'),
    lines_count: rawText.split('\n').length,
    epistemic_status: parsed.metadata.epistemic_status,
    source_authority: parsed.metadata.source_authority,
    record_id: parsed.metadata.record_id
  });
}

// 5. WRITE MANIFEST TO REPOSITORY
const manifest = {
  manifest_version: "v1.0",
  generated_at: new Date().toISOString(),
  environment: "repository_tracked",
  total_files: manifestRecords.length,
  records: manifestRecords
};

const manifestPath = path.join(repoEvidenceDir, 'EVIDENCE_MANIFEST.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log(`[MANIFEST_GENERATED] ${manifestPath}`);
console.log(JSON.stringify(manifest, null, 2));
