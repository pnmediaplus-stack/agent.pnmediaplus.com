# PN MEDIA PLUS — AUTOMATION ORCHESTRATION DASHBOARD v1.0
## Governed Modular AI OS Extension

==================================================
0. PURPOSE
==================================================

Automation Orchestration Dashboard là bảng điều khiển trung tâm để vận hành toàn bộ AI Media Operating System.

Mục tiêu:
- quản lý workflow content từ idea → publish → performance → learning
- điều phối 7 AI Agent
- theo dõi trạng thái từng content item
- biết task đang kẹt ở agent nào
- biết output nào đã PASS / FAIL
- lưu QA score
- lưu publish status
- lưu performance
- giảm thao tác thủ công
- biến hệ thống AI agent thành production pipeline có thể scale

Nếu Content Database là kho dữ liệu,
thì Orchestration Dashboard là giao diện điều hành.

==================================================
1. CORE PRINCIPLE
==================================================

Không vận hành AI bằng chat rời rạc mãi.

Dashboard tồn tại để:

```yaml
operator:
  biết_việc_nào_đang_ở_đâu
  biết_ai_agent_nào_cần_chạy
  biết_output_nào_đã_sẵn_sàng
  biết_lỗi_nào_cần_route
  biết_content_nào_cần_publish
````

Mục tiêu cuối:

* giảm chaos
* tăng throughput
* tăng kiểm soát chất lượng
* tạo hệ thống production-grade.

==================================================
2. SYSTEM POSITION
==================

```text
Human / Campaign Plan
        ↓
Automation Orchestration Dashboard
        ↓
Agent 1 / 2 / 3 / 4 / 5 / 6 / 7
        ↓
Content Database
        ↓
Publish System
        ↓
Performance Memory
        ↓
Learning Feedback
```

==================================================
3. DASHBOARD MODULES
====================

Dashboard nên có các module:

```yaml
dashboard_modules:
  - command_center
  - content_pipeline_board
  - agent_task_queue
  - asset_library
  - QA_review_board
  - publish_calendar
  - performance_monitor
  - conversion_tracker
  - learning_center
  - system_health_monitor
```

==================================================
4. COMMAND CENTER
=================

Command Center là màn hình tổng quan.

Hiển thị:

```yaml
command_center:
  active_campaigns:
  content_in_pipeline:
  awaiting_human_approval:
  QA_failed_items:
  scheduled_posts:
  published_today:
  high_performing_posts:
  stuck_tasks:
  urgent_actions:
```

Mục tiêu:

* mở dashboard là biết hệ thống đang ở trạng thái nào.

==================================================
5. CONTENT PIPELINE BOARD
=========================

Dạng Kanban.

Columns:

```yaml
pipeline_columns:
  - idea
  - research_ready
  - visual_ready
  - caption_ready
  - QA_ready
  - QA_passed
  - scheduled
  - published
  - performance_logged
  - learning_logged
```

Mỗi card là một `content_item`.

Card fields:

```yaml
content_card:
  content_id:
  title:
  campaign:
  platform:
  content_type:
  owner:
  current_agent:
  status:
  next_action:
  priority:
  due_date:
  QA_score:
  publish_time:
```

==================================================
6. AGENT TASK QUEUE
===================

Mỗi agent có queue riêng.

```yaml
agent_task_queue:
  Agent_1:
    tasks:
      - create viral_research_packet
      - revise angle

  Agent_2:
    tasks:
      - create final_publish_output
      - revise hook/CTA

  Agent_3:
    tasks:
      - create image_prompt_pack
      - revise visual hierarchy

  Agent_4:
    tasks:
      - QA image+caption
      - route failures

  Agent_5:
    tasks:
      - create motion_prompt_pack
      - revise motion prompt

  Agent_6:
    tasks:
      - create keyframe_image_prompt_pack
      - fix continuity keyframes

  Agent_7:
    tasks:
      - create documentation
      - package SOP/report
```

Queue fields:

```yaml
task_fields:
  task_id:
  content_id:
  assigned_agent:
  input_required:
  expected_output:
  status:
  priority:
  created_at:
  due_at:
  blocker:
  human_action_needed:
```

==================================================
7. ASSET LIBRARY
================

Asset Library lưu:

```yaml
asset_library:
  - rendered_images
  - keyframes
  - videos
  - captions
  - prompts
  - logos
  - brand assets
  - lead magnets
  - documents
```

Asset fields:

```yaml
asset_fields:
  asset_id:
  content_id:
  asset_type:
  file_url:
  created_by:
  agent_owner:
  version:
  approved:
  notes:
```

==================================================
8. QA REVIEW BOARD
==================

QA Board dùng cho Agent 4.

Fields:

```yaml
qa_board:
  content_id:
  review_id:
  review_type:
  QA_decision:
  average_score:
  strategic_alignment:
  hook_strength:
  stop_scroll_strength:
  emotional_clarity:
  trustworthiness:
  overclaim_risk:
  owner_to_fix:
  pass_condition:
  reviewed_at:
```

Views:

* Failed QA
* Pass with Notes
* Publish Ready
* Needs Human Approval

==================================================
9. PUBLISH CALENDAR
===================

Calendar view cho content đã scheduled.

Fields:

```yaml
publish_calendar:
  content_id:
  platform:
  publish_date:
  publish_time:
  caption_status:
  visual_status:
  QA_status:
  publish_status:
  campaign:
```

Rules:

* không cho scheduled nếu QA chưa PASS
* không cho publish nếu thiếu asset/caption
* cảnh báo nếu content trùng angle quá gần nhau

==================================================
10. PERFORMANCE MONITOR
=======================

Theo dõi performance sau publish.

Fields:

```yaml
performance_monitor:
  content_id:
  platform:
  publish_url:
  impressions:
  reach:
  views:
  likes:
  comments:
  shares:
  saves:
  clicks:
  CTR:
  retention:
  performance_score:
  captured_at:
```

Views:

* Top Saves
* Top Comments
* Top Shares
* Low Performers
* Unexpected Winners
* Needs Repackage

==================================================
11. CONVERSION TRACKER
======================

Theo dõi lead/conversion.

Fields:

```yaml
conversion_tracker:
  content_id:
  CTA_type:
  keyword_used:
  keyword_comments:
  DMs_started:
  resources_sent:
  audit_requests:
  demo_requests:
  leads_created:
  lead_quality_score:
  conversion_rate:
```

Views:

* Best CTA
* Best Lead Magnet
* High Intent Leads
* Weak CTA Posts

==================================================
12. LEARNING CENTER
===================

Learning Center lưu insight sau performance.

Fields:

```yaml
learning_center:
  learning_id:
  related_content_id:
  insight_type:
  observation:
  evidence:
  recommended_action:
  applies_to_agent:
  created_at:
```

Examples:

```yaml
learning:
  insight_type: hook_learning
  observation: pain_recognition hooks outperform generic AI hooks
  applies_to_agent: Agent_1, Agent_2
```

==================================================
13. SYSTEM HEALTH MONITOR
=========================

Theo dõi sức khỏe hệ thống.

Metrics:

```yaml
system_health:
  active_content_items:
  stuck_items:
  average_QA_score:
  QA_fail_rate:
  average_time_to_publish:
  content_throughput_per_week:
  performance_logging_rate:
  learning_logging_rate:
  agent_queue_load:
```

Warning triggers:

```yaml
warnings:
  - QA_fail_rate > 30%
  - stuck_items > 5
  - performance_logging_rate < 70%
  - no_learning_notes_for_7_days
  - content_items_without_owner
  - assets_without_content_id
```

==================================================
14. AUTOMATION RULES
====================

## Rule 1 — Auto Status Update

```yaml
if:
  Agent_1_output_received
then:
  status: research_ready
```

## Rule 2 — QA Gate

```yaml
if:
  QA_decision != PASS
then:
  block_publish: true
```

## Rule 3 — Publish Ready

```yaml
if:
  caption_ready: true
  visual_ready: true
  QA_passed: true
then:
  status: scheduled_ready
```

## Rule 4 — Performance Reminder

```yaml
if:
  published_time + 24h
then:
  remind_operator: log performance
```

## Rule 5 — Learning Reminder

```yaml
if:
  performance_logged: true
  learning_note_missing: true
then:
  remind_operator: write learning note
```

==================================================
15. RECOMMENDED TECH STACK
==========================

## MVP

```yaml
mvp_stack:
  database:
    - Google Sheets
    - Airtable
    - Notion

  automation:
    - n8n
    - Make

  asset_storage:
    - Google Drive

  dashboard:
    - Airtable Interface
    - Notion Dashboard
    - Looker Studio
```

## Production

```yaml
production_stack:
  database:
    - Supabase
    - PostgreSQL

  automation:
    - n8n

  asset_storage:
    - Google Drive / S3

  dashboard:
    - Retool
    - Appsmith
    - custom Next.js dashboard

  analytics:
    - Meta API
    - TikTok API
    - YouTube API
```

==================================================
16. MVP DASHBOARD TABLES
========================

Nếu bắt đầu nhanh, cần tối thiểu:

```yaml
mvp_tables:
  - content_items
  - agent_tasks
  - assets
  - qa_reviews
  - publish_records
  - performance_records
  - learning_notes
```

Không cần build quá phức tạp ngay.

==================================================
17. OPERATOR SOP
================

## Daily Operating Flow

1. Mở Command Center
2. Kiểm stuck tasks
3. Chạy agent theo task queue
4. Update output artifact
5. Route task sang agent tiếp theo
6. QA content ready
7. Schedule publish
8. Log performance bài đã đăng
9. Ghi learning notes

## Weekly Review

1. Xem top performers
2. Xem flop patterns
3. Update hook library
4. Update visual pattern library
5. Calibrate QA scoring
6. Chọn angles tuần sau

==================================================
18. DASHBOARD PASS CONDITION
============================

Dashboard đạt chuẩn khi:

```yaml
pass_condition:
  - biết mỗi content đang ở stage nào
  - biết agent nào đang giữ task
  - biết output nào đã PASS/FAIL
  - biết post nào đã publish
  - biết performance thế nào
  - biết learning nào cần feed lại system
  - không thất lạc asset/prompt/caption
```

==================================================
19. FAILURE MODES
=================

## Dashboard quá phức tạp

Cause:

* build quá nhiều field từ đầu

Fix:

* bắt đầu MVP với 7 bảng chính

---

## Operator không cập nhật dữ liệu

Cause:

* form nhập quá rườm rà

Fix:

* giảm field bắt buộc
* automation reminder
* one-click status update

---

## Data không dùng lại được

Cause:

* thiếu content_id
* thiếu linking giữa asset và content

Fix:

* bắt buộc content_id chuẩn

---

## QA không phản ánh performance

Cause:

* không log performance
* không calibration

Fix:

* weekly QA-performance review

==================================================
20. FINAL PRINCIPLE
===================

Automation Orchestration Dashboard biến hệ thống từ:

```yaml
agent_workflow_in_chat
```

thành:

```yaml
AI_media_operations_control_center
```

Từ đây, hệ thống không chỉ chạy bằng prompt.

Hệ thống bắt đầu vận hành như một nhà máy nội dung có:

* dashboard
* queue
* status
* QA gate
* publish control
* performance feedback
* learning loop.

```