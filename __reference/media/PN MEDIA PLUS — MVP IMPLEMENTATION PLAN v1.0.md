# PN MEDIA PLUS — MVP IMPLEMENTATION PLAN v1.0
## Governed Modular AI OS — Practical Deployment Roadmap

==================================================
0. MVP OBJECTIVE
==================================================

Mục tiêu MVP KHÔNG phải:

```yaml
- build siêu platform AI
- build SaaS hoàn chỉnh
- build automation full stack ngay
````

Mục tiêu thật:

```yaml
- vận hành ổn định 7 agent
- không thất lạc asset
- có QA gate
- có content tracking
- có performance logging
- có learning loop
- operator dùng được ngay
```

Triết lý:

```yaml
simple
>
complex_but_unusable
```

==================================================

1. MVP ARCHITECTURE
   ==================================================

## Giai đoạn đầu KHÔNG cần code custom nhiều.

Stack khuyến nghị:

```yaml
database:
  Airtable

automation:
  n8n

asset_storage:
  Google Drive

dashboard:
  Airtable Interface

AI_runtime:
  ChatGPT Projects / GPTs

analytics_logging:
  manual + lightweight automation
```

==================================================
2. MVP SYSTEM COMPONENTS
========================

```text
Human Operator
      ↓
Airtable Dashboard
      ↓
n8n Orchestration
      ↓
7 AI Agents
      ↓
Google Drive Assets
      ↓
Performance Logging
      ↓
Learning Notes
```

==================================================
3. MVP PHASE MAP
================

```yaml
phase_1:
  foundation_database

phase_2:
  agent_pipeline

phase_3:
  QA_gate

phase_4:
  publish_tracking

phase_5:
  performance_memory

phase_6:
  automation_assists

phase_7:
  optimization
```

==================================================
4. PHASE 1 — FOUNDATION DATABASE
================================

## Goal

Tạo content operating database tối thiểu.

---

## Build Tables

### 1. content_items

```yaml
fields:
  content_id
  title
  platform
  content_type
  status
  selected_angle
  emotional_axis
  owner
  created_at
```

---

### 2. agent_tasks

```yaml
fields:
  task_id
  content_id
  assigned_agent
  task_type
  status
  due_date
  blocker
```

---

### 3. assets

```yaml
fields:
  asset_id
  content_id
  asset_type
  file_link
  version
  approved
```

---

### 4. qa_reviews

```yaml
fields:
  review_id
  content_id
  average_score
  QA_decision
  owner_to_fix
```

---

### 5. performance_records

```yaml
fields:
  performance_id
  content_id
  impressions
  reach
  comments
  saves
  shares
  CTR
  performance_score
```

==================================================
5. PHASE 2 — AGENT PIPELINE
===========================

## Goal

Chuẩn hóa flow giữa 7 agent.

---

## Workflow

```text
Agent 1
↓
Agent 3 / Agent 6
↓
Image Render
↓
Agent 2 / Agent 5
↓
Agent 4
↓
Publish
```

---

## Operator Rules

### Mỗi content phải có:

```yaml
required_artifacts:
  - viral_research_packet
  - visual_asset
  - caption_output
  - QA_review
```

---

## Status Flow

```yaml
idea
→ research_ready
→ visual_ready
→ caption_ready
→ QA_ready
→ QA_passed
→ scheduled
→ published
```

==================================================
6. PHASE 3 — QA GATE
====================

## Goal

Không cho publish bypass QA.

---

## Rules

```yaml
cannot_publish_if:
  - QA_missing
  - average_score < 7
  - overclaim_risk > 3
  - missing_asset
```

---

## Agent 4 becomes mandatory gate.

==================================================
7. PHASE 4 — PUBLISH TRACKING
=============================

## Goal

Biết content nào đã đăng và ở đâu.

---

## Build

### publish_records table

```yaml
fields:
  publish_id
  content_id
  platform
  publish_url
  published_time
  status
```

---

## Add calendar view.

==================================================
8. PHASE 5 — PERFORMANCE MEMORY
===============================

## Goal

Bắt đầu học từ content thật.

---

## Operator SOP

### Sau 24–72h:

Log:

* reach
* saves
* comments
* shares
* retention

---

## Create:

```yaml
libraries:
  - hook_library
  - visual_pattern_library
  - CTA_library
```

==================================================
9. PHASE 6 — AUTOMATION ASSISTS
===============================

## Goal

Giảm thao tác thủ công.

---

## n8n Automations

### Automation 1

```yaml
trigger:
  QA_passed

action:
  move_status_to_scheduled
```

---

### Automation 2

```yaml
trigger:
  published_plus_24h

action:
  remind_performance_logging
```

---

### Automation 3

```yaml
trigger:
  low_QA_score

action:
  notify_owner
```

---

### Automation 4

```yaml
trigger:
  new_keyword_comment

action:
  notify_operator
```

==================================================
10. PHASE 7 — OPTIMIZATION
==========================

## Goal

Tăng intelligence.

---

## Add:

```yaml
optimization_modules:
  - performance_pattern_detection
  - hook_success_analysis
  - visual_success_analysis
  - CTA_success_analysis
  - repost_recommendation
```

==================================================
11. MVP DASHBOARD VIEWS
=======================

## View 1 — Command Center

```yaml
shows:
  - active_content
  - stuck_items
  - QA_failed
  - scheduled_today
```

---

## View 2 — Content Pipeline

Kanban board.

---

## View 3 — QA Board

```yaml
shows:
  - PASS
  - RETURN_TO_OWNER
  - FAIL
```

---

## View 4 — Performance View

```yaml
shows:
  - top_saves
  - top_comments
  - top_shares
  - weak_posts
```

---

## View 5 — Learning View

```yaml
shows:
  - best_hooks
  - best_visuals
  - failed_patterns
```

==================================================
12. MINIMUM HUMAN ROLES
=======================

## MVP cần tối thiểu:

```yaml
roles:
  operator:
    - chạy agents
    - update status
    - publish content

  QA_operator:
    - run Agent 4
    - check pass/fail

  strategist:
    - review weekly learnings
```

Một người có thể kiêm nhiều role.

==================================================
13. MVP SUCCESS METRICS
=======================

MVP thành công nếu:

```yaml
success_metrics:
  - không thất lạc asset
  - biết content đang ở đâu
  - QA không bị bypass
  - có performance logging
  - có learning notes
  - giảm chaos vận hành
  - throughput content tăng
```

==================================================
14. WHAT NOT TO BUILD YET
=========================

## Chưa cần:

```yaml
avoid_now:
  - custom SaaS
  - AI autonomous posting
  - auto content generation loop
  - full CRM
  - advanced analytics engine
  - expensive infra
```

Lý do:

```yaml
current_priority:
  operational_stability
  >
  overengineering
```

==================================================
15. RECOMMENDED IMPLEMENTATION ORDER
====================================

## WEEK 1

```yaml
week_1:
  - Airtable database
  - content pipeline
  - asset tracking
```

---

## WEEK 2

```yaml
week_2:
  - QA system
  - publish tracking
  - dashboard views
```

---

## WEEK 3

```yaml
week_3:
  - performance logging
  - hook library
  - visual pattern library
```

---

## WEEK 4

```yaml
week_4:
  - n8n automation
  - reminders
  - learning workflows
```

==================================================
16. SCALING ROADMAP
===================

## AFTER MVP

### Stage 2

```yaml
stage_2:
  - Supabase
  - Next.js dashboard
  - API integrations
```

---

### Stage 3

```yaml
stage_3:
  - auto performance ingestion
  - AI recommendations
  - distribution prediction
```

---

### Stage 4

```yaml
stage_4:
  - multi-client workspace
  - team permissions
  - AI-assisted orchestration
```

==================================================
17. FINAL IMPLEMENTATION PRINCIPLE
==================================

Đừng cố build:

```yaml
perfect_AI_company
```

Hãy build:

```yaml
usable_operating_system
```

Ưu tiên:

* vận hành thật
* logging thật
* QA thật
* learning thật
* consistency thật

Trước khi:

* scale
* automate mạnh
* bán cho khách hàng.

```