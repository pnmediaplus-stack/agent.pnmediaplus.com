# PN MEDIA PLUS — CONTENT DATABASE SCHEMA v1.0
## Governed Modular AI OS Extension

==================================================
0. PURPOSE
==================================================

Content Database Schema là lớp lưu trữ trung tâm của hệ thống.

Mục tiêu:
- gom toàn bộ content asset vào một nơi
- lưu source-of-truth của từng post/video/campaign
- nối content với performance
- nối content với conversion
- giúp hệ thống học lại từ dữ liệu thật
- tránh thất lạc prompt, hình, caption, QA score, kết quả publish

Nếu Performance Memory là trí nhớ thị trường,
Distribution Intelligence là chiến lược phân phối,
Conversion Layer là cầu nối lead,
thì Content Database là kho dữ liệu vận hành trung tâm.

==================================================
1. CORE PRINCIPLE
==================================================

Mỗi content asset phải có:

```yaml
content_asset:
  strategy
  creative
  publish
  performance
  conversion
  learning
````

Không lưu rời rạc kiểu:

* caption ở chat
* ảnh ở máy
* prompt ở file riêng
* performance ở sheet khác

Hệ thống cần một content record thống nhất.

==================================================
2. DATABASE OBJECT TYPES
========================

```yaml
database_objects:
  - campaigns
  - content_items
  - agents_outputs
  - visual_assets
  - video_assets
  - captions
  - publish_records
  - qa_reviews
  - performance_records
  - conversion_records
  - audience_segments
  - hook_library
  - visual_pattern_library
  - CTA_library
  - prompt_library
  - learning_notes
```

==================================================
3. CAMPAIGNS TABLE
==================

Dùng để gom nhiều content vào một chiến dịch.

```yaml
campaigns:
  campaign_id:
  campaign_name:
  campaign_goal:
  target_audience:
  platform_focus:
  offer:
  funnel_stage:
  start_date:
  end_date:
  status:
  owner:
  notes:
```

Ví dụ:

```yaml
campaign_id: CMP-2026-001
campaign_name: Veo 3 Character Consistency Series
campaign_goal: build authority + collect AI creator leads
platform_focus:
  - Facebook
  - Reels
  - TikTok
status: active
```

==================================================
4. CONTENT_ITEMS TABLE
======================

Bảng lõi cho từng post/video/carousel.

```yaml
content_items:
  content_id:
  campaign_id:
  content_type:
  platform:
  target_segment:
  funnel_stage:
  content_goal:
  selected_angle:
  emotional_axis:
  status:
  created_at:
  updated_at:
  owner:
```

content_type có thể là:

* facebook_post
* infographic
* carousel
* reel
* short_video
* long_post
* case_study
* lead_magnet
* email
* landing_page_section

Status:

* idea
* research_ready
* visual_ready
* caption_ready
* QA_passed
* scheduled
* published
* archived
* failed

==================================================
5. AGENT_OUTPUTS TABLE
======================

Lưu output từng agent.

```yaml
agent_outputs:
  output_id:
  content_id:
  agent_id:
  agent_name:
  agent_version:
  input_artifacts:
  output_artifact_type:
  output_summary:
  full_output_link:
  created_at:
  confidence_level:
  status:
```

Ví dụ:

```yaml
agent_name: Agent_1_Viral_Research
output_artifact_type: viral_research_packet
```

==================================================
6. STRATEGY PACKET TABLE
========================

Lưu kết quả Agent 1.

```yaml
strategy_packets:
  strategy_id:
  content_id:
  based_on_brief_id:
  interpreted_brief:
  audience_pain:
  selected_angle:
  rejected_patterns:
  recommended_angles:
  visual_direction_hints:
  caption_direction_hints:
  downstream_guidance:
  confidence_level:
```

==================================================
7. CAPTIONS TABLE
=================

Lưu caption và variants.

```yaml
captions:
  caption_id:
  content_id:
  based_on_strategy_id:
  caption_type:
  hook:
  title:
  body:
  CTA:
  hashtags:
  final_publish_output:
  platform:
  emoji_strategy:
  comment_trigger:
  save_trigger:
  trust_signal:
  status:
```

Status:

* draft
* selected
* QA_passed
* published
* rejected

==================================================
8. VISUAL_ASSETS TABLE
======================

Lưu hình ảnh, prompt, visual direction.

```yaml
visual_assets:
  visual_id:
  content_id:
  asset_type:
  visual_style:
  prompt_text:
  negative_prompt:
  engine_used:
  image_url:
  logo_used:
  brand_placement:
  thumbnail_strategy:
  focal_hierarchy:
  visual_quality_notes:
  status:
```

asset_type:

* social_image
* infographic
* carousel_cover
* keyframe
* thumbnail
* poster

==================================================
9. VIDEO_ASSETS TABLE
=====================

Lưu video, keyframe, motion prompt.

```yaml
video_assets:
  video_id:
  content_id:
  keyframe_pack_id:
  motion_prompt_pack_id:
  scene_count:
  engine_used:
  rendered_video_url:
  scene_urls:
  continuity_notes:
  artifact_notes:
  status:
```

==================================================
10. KEYFRAME_ASSETS TABLE
=========================

```yaml
keyframe_assets:
  keyframe_id:
  content_id:
  video_id:
  scene_id:
  keyframe_function:
  image_prompt:
  image_url:
  character_anchor:
  environment_anchor:
  reject_conditions:
  approved_by_human:
```

==================================================
11. QA_REVIEWS TABLE
====================

Lưu Measurable QA.

```yaml
qa_reviews:
  qa_id:
  content_id:
  reviewer_agent:
  review_type:
  decision:
  average_score:
  confidence_level:

  strategic_alignment:
  hook_strength:
  stop_scroll_strength:
  emotional_clarity:
  audience_fit:
  product_fit:
  human_value_fit:
  visual_caption_alignment:
  mobile_readability:
  save_trigger:
  comment_trigger:
  shareability:
  trustworthiness:
  brand_safety:
  overclaim_risk:
  platform_fit:
  execution_readiness:

  confirmed_failures:
  owner_to_fix:
  pass_condition:
  created_at:
```

==================================================
12. PUBLISH_RECORDS TABLE
=========================

```yaml
publish_records:
  publish_id:
  content_id:
  platform:
  page_or_channel:
  scheduled_time:
  published_time:
  publish_url:
  publish_status:
  publisher:
  notes:
```

publish_status:

* scheduled
* published
* failed
* deleted
* reposted

==================================================
13. PERFORMANCE_RECORDS TABLE
=============================

Lưu performance thật.

```yaml
performance_records:
  performance_id:
  content_id:
  platform:
  capture_time:
  impressions:
  reach:
  views:
  likes:
  comments:
  shares:
  saves:
  clicks:
  CTR:
  watch_time:
  retention_rate:
  completion_rate:
  follower_growth:
  performance_score:
  notes:
```

==================================================
14. CONVERSION_RECORDS TABLE
============================

```yaml
conversion_records:
  conversion_id:
  content_id:
  platform:
  funnel_stage:
  CTA_text:
  CTA_type:
  keyword_used:
  lead_magnet:
  keyword_comments:
  DMs_started:
  resources_sent:
  audits_requested:
  demos_booked:
  leads_created:
  conversion_rate:
  lead_quality_score:
  notes:
```

==================================================
15. HOOK_LIBRARY TABLE
======================

```yaml
hook_library:
  hook_id:
  hook_text:
  hook_type:
  emotional_trigger:
  platform:
  audience_segment:
  related_content_ids:
  average_performance_score:
  best_use_case:
  risk_note:
```

==================================================
16. VISUAL_PATTERN_LIBRARY TABLE
================================

```yaml
visual_pattern_library:
  pattern_id:
  pattern_name:
  visual_type:
  focal_structure:
  thumbnail_style:
  emotional_signal:
  platform_fit:
  related_visual_ids:
  average_performance_score:
  notes:
```

==================================================
17. CTA_LIBRARY TABLE
=====================

```yaml
cta_library:
  CTA_id:
  CTA_text:
  CTA_type:
  funnel_stage:
  platform:
  emotional_style:
  average_comment_rate:
  average_conversion_rate:
  risk_note:
```

==================================================
18. PROMPT_LIBRARY TABLE
========================

```yaml
prompt_library:
  prompt_id:
  prompt_type:
  agent_owner:
  prompt_text:
  use_case:
  engine_target:
  performance_notes:
  version:
  status:
```

prompt_type:

* image_prompt
* video_motion_prompt
* keyframe_prompt
* caption_prompt
* research_prompt
* QA_prompt

==================================================
19. LEARNING_NOTES TABLE
========================

```yaml
learning_notes:
  note_id:
  related_content_id:
  related_campaign_id:
  insight_type:
  observation:
  evidence:
  action_recommendation:
  created_at:
```

insight_type:

* hook_learning
* visual_learning
* CTA_learning
* timing_learning
* platform_learning
* audience_learning
* QA_calibration

==================================================
20. RELATIONSHIP MAP
====================

```text
campaigns
   ↓
content_items
   ↓
agent_outputs
   ↓
strategy_packets / captions / visual_assets / video_assets
   ↓
qa_reviews
   ↓
publish_records
   ↓
performance_records
   ↓
conversion_records
   ↓
learning_notes
```

==================================================
21. MINIMUM VIABLE DATABASE
===========================

Nếu chưa build full database, bắt đầu bằng Google Sheet/Airtable với 5 bảng:

```yaml
minimum_tables:
  - content_items
  - captions
  - visual_assets
  - qa_reviews
  - performance_records
```

Sau đó mở rộng:

* conversion_records
* hook_library
* visual_pattern_library
* prompt_library

==================================================
22. OPERATOR SOP
================

## Khi tạo content mới

1. Tạo content_id
2. Gắn campaign_id nếu có
3. Lưu Agent 1 strategy
4. Lưu image/caption/video prompt
5. Lưu final asset
6. Lưu QA score
7. Lưu publish record
8. Sau publish, cập nhật performance
9. Ghi learning note nếu có insight

==================================================
23. CONTENT ID FORMAT
=====================

Khuyến nghị:

```yaml
content_id_format:
  PN-{platform}-{type}-{YYYYMMDD}-{sequence}
```

Ví dụ:

```yaml
PN-FB-POST-20260512-001
PN-RL-VIDEO-20260512-002
PN-LI-CAROUSEL-20260512-003
```

==================================================
24. PLATFORM CODES
==================

```yaml
platform_codes:
  FB: Facebook
  TT: TikTok
  RL: Reels
  YS: YouTube Shorts
  LI: LinkedIn
  IG: Instagram
```

==================================================
25. CONTENT TYPE CODES
======================

```yaml
content_type_codes:
  POST: social post
  IMG: image post
  INFO: infographic
  CAR: carousel
  VID: video
  REEL: reel
  SHORT: short video
  CASE: case study
  LM: lead magnet
```

==================================================
26. STATUS FLOW
===============

```yaml
status_flow:
  idea
  → research_ready
  → visual_ready
  → caption_ready
  → QA_ready
  → QA_passed
  → scheduled
  → published
  → performance_logged
  → learning_logged
```

==================================================
27. DASHBOARD VIEWS
===================

Khuyến nghị dashboard:

```yaml
dashboard_views:
  content_pipeline:
    - content_id
    - status
    - owner
    - next_action

  performance_view:
    - platform
    - hook
    - saves
    - comments
    - shares
    - score

  QA_view:
    - average_score
    - fail_reason
    - owner_to_fix

  conversion_view:
    - CTA
    - keyword_comments
    - DMs
    - demos_booked

  learning_view:
    - insight
    - evidence
    - next_action
```

==================================================
28. INTEGRATION WITH AGENTS
===========================

Agent 1:

* đọc hook_library
* đọc emotional_memory
* đọc performance_records

Agent 2:

* đọc caption performance
* đọc CTA_library

Agent 3:

* đọc visual_pattern_library
* đọc thumbnail performance

Agent 4:

* ghi qa_reviews
* so QA với performance

Agent 5:

* đọc video artifact notes
* học motion fail patterns

Agent 6:

* đọc keyframe reject patterns
* học continuity fail patterns

Agent 7:

* đọc database để tạo reports/playbooks

==================================================
29. DATA QUALITY LAW
====================

Database chỉ có giá trị nếu dữ liệu sạch.

Bắt buộc:

* content_id duy nhất
* platform rõ
* status rõ
* owner rõ
* QA score rõ nếu đã QA
* publish URL nếu đã publish
* performance capture time rõ

Không được:

* lưu asset không gắn content_id
* ghi performance không biết post nào
* để nhiều bản caption final không rõ bản nào đã đăng

==================================================
30. FUTURE AUTOMATION EXTENSION
===============================

Sau này có thể tự động hóa:

* auto tạo content_id
* auto lưu agent outputs
* auto kéo performance từ platform
* auto cập nhật dashboard
* auto phát hiện winning patterns
* auto gợi ý repackage
* auto tạo report tuần

==================================================
31. SUCCESS CONDITION
=====================

Content Database Schema thành công khi:

```yaml
success_condition:
  - không thất lạc content asset
  - biết post nào từ angle nào
  - biết caption/visual nào perform
  - biết QA score có đúng thực tế không
  - biết pattern nào nên dùng lại
  - biết content nào nên repackage
  - agent có dữ liệu để học lại
```

==================================================
32. FINAL PRINCIPLE
===================

Content Database biến hệ thống từ:

```yaml
workflow_chạy_từng_lần
```

thành:

```yaml
AI_media_operating_database
```

Mỗi content không chỉ là một bài đăng.

Mỗi content là một data point giúp hệ thống thông minh hơn.

```