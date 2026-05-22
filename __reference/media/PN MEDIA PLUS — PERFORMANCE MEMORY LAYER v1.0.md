# PN MEDIA PLUS — PERFORMANCE MEMORY LAYER v1.0
## Governed Modular AI OS Extension

==================================================
0. PURPOSE
==================================================

Performance Memory Layer là lớp trí nhớ thị trường của hệ thống.

Mục tiêu:
- giúp AI học từ performance thật
- giảm research cảm tính
- tăng độ chính xác strategic decision
- tạo feedback loop giữa:
  - content
  - thị trường
  - audience behavior
  - future outputs

Trước đây hệ thống chỉ có:

```yaml
creation_intelligence
````

Bây giờ hệ thống sẽ có thêm:

```yaml
market_learning_intelligence
```

==================================================

1. CORE PRINCIPLE
   ==================================================

Không phải content nào “có vẻ hay” cũng perform tốt.

Performance Memory Layer tồn tại để:

* ghi nhớ cái gì perform thật
* phát hiện pattern
* feed ngược vào Agent 1 / Agent 3 / Agent 4

==================================================
2. MEMORY ARCHITECTURE
======================

```text
Published Content
        ↓
Performance Capture
        ↓
Performance Database
        ↓
Pattern Analysis
        ↓
Strategic Learning
        ↓
Agent 1 / Agent 3 / Agent 4
```

==================================================
3. MEMORY OBJECT TYPES
======================

Hệ thống lưu:

```yaml
memory_objects:
  - hook_memory
  - thumbnail_memory
  - caption_memory
  - CTA_memory
  - emotional_trigger_memory
  - visual_pattern_memory
  - audience_response_memory
  - QA_score_memory
  - platform_behavior_memory
```

==================================================
4. HOOK MEMORY SYSTEM
=====================

## Purpose

Lưu:

* hook nào perform tốt
* hook nào flop
* hook nào save cao
* hook nào comment mạnh

---

## Schema

```yaml
hook_memory:
  hook_id:
  hook_text:
  platform:
  audience:
  content_type:
  emotional_trigger:
  curiosity_type:
  CTR:
  save_rate:
  comment_rate:
  share_rate:
  watch_retention_if_video:
  QA_score:
  publish_date:
  outcome:
  notes:
```

---

## Example

```yaml
hook_memory:
  hook_text:
    "Nhiều chủ shop không mệt vì bán hàng.
     Mà mệt vì phải nhớ quá nhiều."

  platform:
    Facebook

  emotional_trigger:
    mental_overload

  save_rate:
    high

  outcome:
    strong_performer
```

==================================================
5. THUMBNAIL MEMORY SYSTEM
==========================

## Purpose

Lưu:

* visual nào stop-scroll mạnh
* visual nào bị ignore
* thumbnail nào tăng save/share

---

## Schema

```yaml
thumbnail_memory:
  thumbnail_id:
  thumbnail_type:
  focal_structure:
  emotional_signal:
  text_density:
  color_contrast:
  CTR:
  save_rate:
  audience_response:
  outcome:
```

---

## Example

```yaml
thumbnail_type:
  before_after_operator_chaos

outcome:
  strong_scroll_stop
```

==================================================
6. EMOTIONAL TRIGGER MEMORY
===========================

## Purpose

Lưu:

* emotion nào audience phản hồi mạnh
* emotion nào gây save/share/comment cao

---

## Emotional Classes

```yaml
emotional_classes:
  - overwhelm
  - identity_recognition
  - quiet_frustration
  - operator_relief
  - creator_validation
  - hidden_pain
  - workflow_clarity
  - anti_hustle
  - authority_relief
```

---

## Schema

```yaml
emotional_memory:
  emotional_trigger:
  platform:
  audience:
  save_rate:
  comment_rate:
  share_rate:
  conversion_impact:
  notes:
```

==================================================
7. CTA MEMORY SYSTEM
====================

## Purpose

Lưu:

* CTA nào tạo comment tốt
* CTA nào bị ignore
* CTA nào quá sales-heavy

---

## Schema

```yaml
cta_memory:
  CTA_text:
  CTA_type:
  emotional_style:
  comment_rate:
  save_rate:
  audience_response:
  outcome:
```

==================================================
8. QA SCORE MEMORY
==================

## Purpose

Lưu:

* QA score
* performance thực tế
* correlation giữa QA và market response

---

## Schema

```yaml
qa_memory:
  content_id:
  hook_strength:
  stop_scroll_strength:
  emotional_clarity:
  mobile_readability:
  visual_alignment:
  trustworthiness:
  publish_result:
```

==================================================
9. PERFORMANCE INGESTION LAW
============================

Sau khi publish:

* operator hoặc automation phải nhập performance.

Có thể manual:

* Google Sheet
* Airtable
* Notion
* Database

Hoặc automation:

* Meta API
* TikTok API
* Analytics pipeline

==================================================
10. PERFORMANCE SCORING
=======================

## Suggested scoring

```yaml
performance_score:
  weak:
    1-3

  usable:
    4-6

  strong:
    7-8

  elite:
    9-10
```

==================================================
11. LEARNING ENGINE
===================

Performance Layer phải phân tích:

```yaml
pattern_analysis:
  - hooks_that_repeat_successfully
  - thumbnails_that_stop_scroll
  - CTA_that_drive_comments
  - emotional_patterns_that_save
  - platform_specific_behavior
```

==================================================
12. FEEDBACK INTO AGENTS
========================

==================================================
12.1 Agent 1
============

Agent 1 sẽ:

* ưu tiên angle từng perform tốt
* tránh pattern flop
* tăng confidence nếu có market evidence

Ví dụ:

```yaml
performance_hint:
  mental_overload_posts
  historically_high_save_rate
```

==================================================
12.2 Agent 3
============

Agent 3 sẽ:

* học thumbnail structure nào mạnh
* học focal hierarchy nào perform tốt
* học visual density phù hợp

==================================================
12.3 Agent 4
============

Agent 4 sẽ:

* so QA score với performance thật
* học scoring accuracy
* phát hiện false positive QA

==================================================
13. MEMORY RETENTION LAW
========================

Không phải content cũ nào cũng còn giá trị.

Memory cần:

* decay logic
* trend weighting
* platform freshness

Ví dụ:

```yaml
priority:
  recent_high_performance
  >
  old_viral_pattern
```

==================================================
14. HUMAN OVERRIDE LAW
======================

Performance Memory:

* hỗ trợ Human
* không thay thế strategic judgment

Human vẫn có quyền:

* test angle mới
* phá pattern cũ
* thử experimental content

Không biến system thành:

* chỉ lặp content cũ.

==================================================
15. PERFORMANCE DASHBOARD
=========================

Khuyến nghị build dashboard gồm:

```yaml
dashboard:
  - top_hooks
  - top_visuals
  - top_save_posts
  - top_comment_posts
  - flop_patterns
  - QA_accuracy
  - audience_shift
```

==================================================
16. FUTURE AUTOMATION EXTENSION
===============================

Sau này có thể build:

```yaml
future_modules:
  - auto_performance_ingestion
  - auto_hook_scoring
  - auto_thumbnail_analysis
  - auto_pattern_detection
  - auto_recommendation_engine
```

==================================================
17. SYSTEM INTEGRATION MAP
==========================

```text
Published Content
        ↓
Performance Data
        ↓
Performance Memory Layer
        ↓
Pattern Learning
        ↓
Agent 1 / 3 / 4
        ↓
Better Future Outputs
```

==================================================
18. OPERATOR SOP
================

## Sau mỗi post:

### STEP 1

Lưu:

* hook
* thumbnail
* platform
* publish date

### STEP 2

Sau 24–72h:

* nhập:

  * CTR
  * save
  * comment
  * share
  * retention

### STEP 3

Tag:

* strong performer
* weak performer
* unexpected performer

### STEP 4

Feed vào:

* hook memory
* thumbnail memory
* emotional memory

==================================================
19. SUCCESS CONDITION
=====================

Performance Memory Layer thành công khi:

```yaml
success_condition:
  - Agent 1 research chính xác hơn
  - Agent 3 visual authority mạnh hơn
  - Agent 4 QA gần market reality hơn
  - system học từ audience thật
  - giảm random guessing
```

==================================================
20. FINAL SYSTEM PRINCIPLE
==========================

Performance Memory Layer biến hệ thống từ:

```yaml
content_generation_system
```

thành:

```yaml
adaptive_learning_media_system
```

Hệ thống không chỉ tạo content.

Hệ thống bắt đầu:

* nhớ
* học
* tối ưu
* thích nghi với thị trường.

```
```
