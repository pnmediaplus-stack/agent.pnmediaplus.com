# PN MEDIA PLUS — CONVERSION SYSTEM LAYER v1.0
## Governed Modular AI OS Extension

==================================================
0. PURPOSE
==================================================

Conversion System Layer là lớp biến attention thành lead, conversation, trust và cơ hội bán hàng.

Mục tiêu:
- không để content chỉ dừng ở reach/save/share
- tạo cầu nối từ content sang hành động kinh doanh
- thiết kế CTA routing rõ ràng
- tạo DM/comment workflow
- tạo lead capture flow
- tạo offer sequencing
- giảm hard-sell
- tăng conversion tự nhiên dựa trên trust

Nếu Distribution Intelligence quyết định “đăng cái gì, ở đâu, khi nào”,
thì Conversion System quyết định:

```yaml
người_xem_quan_tâm
→
đi_đâu_tiếp_theo
→
được_nurture_như_thế_nào
→
chuyển_thành_lead_ra_sao
````

==================================================

1. CORE PRINCIPLE
   ==================================================

Không phải mọi content đều phải bán ngay.

Mỗi nội dung phải có conversion intent phù hợp với funnel stage.

```yaml
bad_conversion:
  awareness_post:
    CTA: "mua ngay"

good_conversion:
  awareness_post:
    CTA: "comment để nhận checklist"
```

Conversion tốt phải:

* tự nhiên
* đúng ngữ cảnh
* không phá trust
* không ép mua quá sớm
* có next step rõ

==================================================
2. SYSTEM POSITION
==================

```text
Agent 1 — Viral Research
        ↓
Agent 2/3/5/6 — Content Packaging
        ↓
Agent 4 — QA
        ↓
Distribution Intelligence
        ↓
Conversion System Layer
        ↓
DM / Lead Capture / Offer Sequence
        ↓
Performance Memory
```

==================================================
3. CONVERSION OBJECT TYPES
==========================

Hệ thống cần quản lý:

```yaml
conversion_objects:
  - CTA_map
  - lead_magnet
  - comment_keyword
  - DM_flow
  - lead_capture_form
  - qualification_question
  - offer_sequence
  - nurture_sequence
  - booking_flow
  - community_onboarding
```

==================================================
4. FUNNEL STAGE MAP
===================

## 4.1 Awareness

Mục tiêu:

* tạo nhận biết
* kéo save/share/comment
* mở conversation nhẹ

CTA phù hợp:

* “Bạn đã gặp tình trạng này chưa?”
* “Comment ‘workflow’ nếu muốn tôi gửi checklist”
* “Lưu lại để dùng sau”
* “Tag người cũng đang gặp vấn đề này”

Không nên:

* bán hàng trực diện
* yêu cầu booking demo quá sớm

---

## 4.2 Consideration

Mục tiêu:

* giúp người xem hiểu vấn đề sâu hơn
* cho họ công cụ nhỏ để tự kiểm tra
* dẫn về DM/comment

CTA phù hợp:

* “Comment ‘CHECKLIST’ để nhận bản mẫu”
* “Inbox nếu muốn tôi gửi flow mẫu”
* “Muốn tôi phân tích workflow hiện tại của bạn không?”

---

## 4.3 Conversion

Mục tiêu:

* chuyển thành lead thật
* demo
* tư vấn
* mua sản phẩm/dịch vụ

CTA phù hợp:

* “Đăng ký audit workflow”
* “Book demo”
* “Nhận tư vấn triển khai”
* “Lấy bộ template đầy đủ”

---

## 4.4 Retention / Community

Mục tiêu:

* giữ quan hệ
* nuôi cộng đồng
* tăng trust dài hạn

CTA phù hợp:

* “Join group”
* “Nhận bản cập nhật workflow mới”
* “Gửi case của bạn để tôi breakdown”

==================================================
5. CTA ROUTING MAP
==================

```yaml
cta_routing:
  save_post:
    best_CTA:
      - "Lưu lại để dùng khi cần"
      - "Comment để nhận bản checklist"

  discussion_post:
    best_CTA:
      - "Bạn đang kẹt ở khâu nào?"
      - "Có ai gặp tình trạng này không?"

  infographic:
    best_CTA:
      - "Comment keyword để nhận bản PDF"
      - "Lưu lại để checklist sau"

  short_video:
    best_CTA:
      - "Follow để xem phần 2"
      - "Comment keyword để nhận prompt"

  case_study:
    best_CTA:
      - "Muốn tôi audit workflow tương tự không?"
      - "Inbox để nhận bản phân tích mẫu"

  authority_post:
    best_CTA:
      - "Nếu cần flow mẫu, comment keyword"
      - "Tôi có thể gửi template tham khảo"
```

==================================================
6. COMMENT KEYWORD SYSTEM
=========================

Comment keyword giúp chuyển engagement thành lead nhẹ.

Ví dụ:

```yaml
keyword_examples:
  "WORKFLOW":
    use_for:
      - automation checklist
      - SOP template

  "PROMPT":
    use_for:
      - prompt pack
      - AI creator content

  "VEO":
    use_for:
      - video prompt system
      - consistency checklist

  "CHECKLIST":
    use_for:
      - audit checklist
      - operational review

  "MAP":
    use_for:
      - workflow diagram
      - system blueprint
```

Luật:

* keyword phải ngắn
* dễ nhớ
* liên quan trực tiếp content
* không dùng quá nhiều keyword trong 1 post

==================================================
7. DM FLOW SYSTEM
=================

## 7.1 DM Flow cơ bản

```yaml
dm_flow:
  trigger:
    - comment keyword
    - inbox request
    - story reply

  step_1:
    acknowledge_interest

  step_2:
    deliver_value

  step_3:
    ask_qualification_question

  step_4:
    route:
      - free_resource
      - audit
      - demo
      - community
```

---

## 7.2 DM Message Template

```text
Cảm ơn bạn đã quan tâm. Tôi gửi bạn bản checklist/workflow mẫu ở đây.

Trước khi gửi bản phù hợp hơn, bạn đang muốn tối ưu phần nào nhất?

1. Content
2. Hình ảnh
3. Video AI
4. Automation đăng bài
5. Workflow bán hàng
```

---

## 7.3 Qualification Questions

```yaml
qualification_questions:
  automation_service:
    - "Hiện bạn đang vận hành content thủ công hay đã có workflow?"
    - "Bạn cần tự động hóa khâu nào trước?"

  AI_content_system:
    - "Bạn đang làm content cho ngành nào?"
    - "Bạn muốn scale hình ảnh, caption hay video trước?"

  video_ai_system:
    - "Bạn đang dùng Veo/Gemini/Runway hay công cụ nào?"
    - "Lỗi lớn nhất hiện tại là nhân vật, motion hay story?"
```

==================================================
8. LEAD MAGNET SYSTEM
=====================

Lead magnet phải gắn trực tiếp với content.

```yaml
lead_magnet_types:
  checklist:
    best_for:
      - save posts
      - operational content

  prompt_pack:
    best_for:
      - AI creator audience
      - video/image workflow

  workflow_map:
    best_for:
      - automation audience
      - business operator audience

  audit_template:
    best_for:
      - service conversion
      - consultant positioning

  mini_course:
    best_for:
      - education funnel
      - community building
```

Không tạo lead magnet quá rộng.

Sai:

```text
Tải ebook AI tổng hợp
```

Đúng:

```text
Checklist 7 lỗi khiến video Veo bị lệch nhân vật
```

==================================================
9. OFFER SEQUENCING SYSTEM
==========================

Không đưa offer ngay từ post đầu.

Nên sequence:

```yaml
offer_sequence:
  step_1:
    pain_recognition_content

  step_2:
    useful_framework

  step_3:
    practical_template

  step_4:
    case_study

  step_5:
    audit_offer

  step_6:
    paid_solution
```

Ví dụ:

```yaml
AI_video_offer_sequence:
  day_1:
    "Vì sao Veo 3 hay lệch nhân vật"

  day_2:
    "Checklist giữ character consistency"

  day_3:
    "Prompt/keyframe workflow"

  day_4:
    "Case study before-after"

  day_5:
    "Nhận audit video prompt system"
```

==================================================
10. SOFT LEAD SCORING
=====================

Lead không giống nhau.

```yaml
lead_score:
  1:
    liked_post

  2:
    saved_post

  3:
    commented_generic

  4:
    commented_keyword

  5:
    sent_DM

  6:
    asked_specific_question

  7:
    requested_template

  8:
    shared_current_problem

  9:
    requested_audit/demo

  10:
    ready_to_buy
```

Operator dùng score để:

* ưu tiên phản hồi
* chọn offer phù hợp
* không hard-sell người chưa sẵn sàng

==================================================
11. CONVERSION QA SCORECARD
===========================

Mỗi content cần được kiểm conversion readiness:

```yaml
conversion_scores:
  funnel_stage_fit:
  CTA_context_fit:
  lead_magnet_fit:
  comment_keyword_clarity:
  DM_followup_readiness:
  trust_preservation:
  offer_sequence_fit:
  conversion_risk:
```

PASS nếu:

```yaml
average_score: ">= 7"
conversion_risk: "<= 3"
CTA_context_fit: ">= 7"
trust_preservation: ">= 8"
```

==================================================
12. INTEGRATION WITH AGENTS
===========================

## Agent 1

Agent 1 cần đề xuất:

* funnel stage
* conversion intent
* lead magnet idea
* CTA direction

## Agent 2

Agent 2 cần viết:

* CTA đúng funnel stage
* comment keyword tự nhiên
* không hard-sell quá sớm

## Agent 3

Agent 3 cần hỗ trợ:

* visual cue cho lead magnet nếu cần
* không biến visual thành ads rẻ tiền

## Agent 4

Agent 4 cần kiểm:

* CTA có đúng funnel stage không
* over-sales risk
* conversion trust risk

## Performance Memory

Lưu:

* CTA nào tạo lead
* keyword nào có comment
* lead magnet nào được request nhiều
* DM flow nào chuyển đổi tốt

==================================================
13. CONVERSION MEMORY SCHEMA
============================

```yaml
conversion_memory:
  content_id:
  platform:
  funnel_stage:
  CTA_text:
  CTA_type:
  keyword_used:
  lead_magnet:
  comments_count:
  keyword_comments:
  DMs_started:
  resources_sent:
  audits_requested:
  demos_booked:
  conversion_rate:
  lead_quality_notes:
```

==================================================
14. OPERATOR SOP

## Before Publish

Kiểm:

```yaml
conversion_checklist:
  - content đang ở funnel stage nào?
  - CTA có phù hợp stage không?
  - có lead magnet không?
  - keyword có rõ không?
  - DM follow-up đã chuẩn bị chưa?
  - có route cho lead nóng không?
  - có tránh hard sell không?
```

## After Publish

Lưu:

* số comment keyword
* số DM
* số người xin template
* số người hỏi sâu
* số audit/demo request

==================================================
15. FAILURE MODES

## High Reach, Low Lead

Nguyên nhân:

* CTA quá mềm
* không có lead magnet
* không có comment keyword

Fix:

* Agent 2 chỉnh CTA
* thêm lead magnet
* build DM flow

---

## Many Comments, No DM

Nguyên nhân:

* operator không follow-up
* keyword chưa rõ
* không có automation DM

Fix:

* chuẩn hóa comment reply
* tạo DM script
* setup automation nếu cần

---

## Many Leads, Low Quality

Nguyên nhân:

* lead magnet quá rộng
* CTA hút sai audience
* offer không rõ

Fix:

* tighten lead magnet
* thêm qualification question

---

## Conversion Hurts Trust

Nguyên nhân:

* bán quá sớm
* CTA quá aggressive
* offer không match content

Fix:

* hạ funnel stage
* dùng soft CTA
* chuyển sang nurture

==================================================
16. CONVERSION DASHBOARD

Dashboard nên theo dõi:

```yaml
conversion_dashboard:
  - keyword_comments
  - DMs_started
  - resources_sent
  - audit_requests
  - demo_requests
  - lead_quality_score
  - conversion_rate_by_CTA
  - conversion_rate_by_platform
  - conversion_rate_by_content_type
```

==================================================
17. AUTOMATION EXTENSION

Sau này có thể automate:

```yaml
automation_modules:
  - comment_keyword_detector
  - auto_DM_sender
  - lead_score_updater
  - resource_delivery_bot
  - CRM_sync
  - followup_reminder
  - demo_booking_router
```

==================================================
18. SUCCESS CONDITION

Conversion System Layer thành công khi:

```yaml
success_condition:
  - content không chỉ có reach
  - comment biến thành conversation
  - save biến thành lead magnet request
  - DM có qualification flow
  - offer không phá trust
  - lead được phân loại rõ
  - performance memory ghi được conversion data
```

==================================================
19. NEXT EXTENSION

Sau Conversion System Layer, nên build:

```yaml
next_layer:
  CONTENT_DATABASE_SCHEMA
```

Vì hiện hệ thống đã có:

* agent governance
* memory
* QA scoring
* distribution
* conversion

Nhưng cần nơi lưu:

* content assets
* hooks
* prompts
* visuals
* performance
* conversion outcomes

==================================================
20. FINAL PRINCIPLE

Conversion System Layer biến hệ thống từ:

```yaml
media_attention_system
```

thành:

```yaml
business_growth_system
```

Nội dung không chỉ để được xem.

Nội dung phải tạo:

* trust
* relationship
* signal
* conversation
* lead
* opportunity.

```
