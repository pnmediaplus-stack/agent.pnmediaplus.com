# PN MEDIA PLUS — SYSTEM MASTER INDEX v1.0
## Governed Modular AI OS

Tài liệu này là bản chỉ mục trung tâm cho toàn bộ hệ thống AI Agent của PN MEDIA PLUS.

Mục tiêu:
- giúp operator biết dùng agent nào
- biết gửi input gì
- biết nhận output gì
- biết route lỗi về đâu
- tránh dùng agent sai vai trò
- giữ hệ thống ổn định, sạch, dễ scale

---

# 1. SYSTEM CONSTITUTION

```yaml
system_layer:
  name: PN MEDIA PLUS AI OS CONSTITUTION
  version: v1.0
  role: governance_layer
````

## Chức năng

Bộ luật nền áp dụng cho mọi agent.

Bao gồm:

* authority law
* source-of-truth law
* routing law
* anti-overlap law
* anti-hardcode law
* human final authority law
* public language law
* brand safety law
* human value law
* output usability law
* QA governance law
* prompt cleanliness law
* performance learning law

## Khi nào dùng?

Luôn dùng.

Mọi agent v4.0 đều kế thừa constitution này.

---

# 2. AGENT VERSION MAP

| Agent   | Tên                                    | Version | Vai trò chính                 |
| ------- | -------------------------------------- | ------: | ----------------------------- |
| Agent 1 | Viral Research & Angle Agent           |    v4.0 | Chiến lược đầu nguồn          |
| Agent 2 | Social Caption Architect Agent         |    v4.0 | Caption publish-ready         |
| Agent 3 | Image Prompt Architect Agent           |    v4.0 | Prompt hình ảnh social/visual |
| Agent 4 | Publish Readiness QA Agent             |    v4.0 | QA trước publish              |
| Agent 5 | Image-to-Video Motion Prompt Architect |    v4.0 | Motion prompt cho video       |
| Agent 6 | Video Keyframe Image Architect         |    v4.0 | Keyframe ảnh cho video        |
| Agent 7 | Documentation & Packaging Architect    |    v4.0 | Đóng gói tài liệu             |

---

# 3. AGENT ROLE MAP

## Agent 1 — Viral Research & Angle Agent

```yaml
use_when:
  - có brief mới
  - cần tìm angle viral
  - cần research audience pain
  - cần strategic direction
  - cần tạo source-of-truth cho downstream
```

## Input

```yaml
input:
  - natural language brief
  - structured human_brief
  - product context
  - platform
  - audience
  - content goal
  - constraints
```

## Output

```yaml
output:
  - viral_research_packet
  - recommended_angles
  - rejected_patterns
  - visual_direction_hints
  - caption_direction_hints
  - downstream_guidance
```

## Không dùng Agent 1 để:

```yaml
do_not_use_for:
  - viết caption final
  - tạo image prompt final
  - QA publish
  - render ảnh/video
```

---

## Agent 2 — Social Caption Architect Agent

```yaml
use_when:
  - cần caption Facebook/TikTok/Reels/LinkedIn
  - cần hook/title
  - cần CTA
  - cần final_publish_output
  - cần caption support visual
```

## Input

```yaml
input:
  - viral_research_packet
  - selected_angle
  - emotional_axis
  - rendered_image
  - image_prompt_pack
  - platform
```

## Output

```yaml
output:
  - caption_pack
  - caption_variants
  - strongest_caption
  - fallback_caption
  - final_publish_output
```

## Không dùng Agent 2 để:

```yaml
do_not_use_for:
  - research lại strategy
  - tạo image prompt
  - QA publish
  - viết caption nếu không có context tối thiểu
```

---

## Agent 3 — Image Prompt Architect Agent

```yaml
use_when:
  - cần prompt tạo ảnh social
  - cần infographic/poster/carousel visual
  - cần visual authority
  - cần thumbnail strategy
  - cần visual direction từ angle
```

## Input

```yaml
input:
  - viral_research_packet
  - selected_angle
  - emotional_axis
  - platform
  - content goal
  - brand/logo assets nếu có
```

## Output

```yaml
output:
  - image_prompt_pack
  - render_prompt
  - thumbnail_strategy
  - focal_hierarchy
  - branding_notes
  - adaptation_notes
```

## Không dùng Agent 3 để:

```yaml
do_not_use_for:
  - viết caption final
  - QA publish
  - render ảnh thật
  - tạo motion prompt video
```

---

## Agent 4 — Publish Readiness QA Agent

```yaml
use_when:
  - trước khi publish
  - cần kiểm ảnh + caption
  - cần PASS/FAIL
  - cần route lỗi đúng agent
  - cần scoring QA
```

## Input

```yaml
input:
  - rendered_image
  - final_publish_output
  - viral_research_packet
  - image_prompt_pack
  - video output nếu có
```

## Output

```yaml
output:
  - publish_readiness_review
  - qa_scores
  - decision
  - confirmed_failures
  - owner_to_fix
  - pass_condition
```

## Không dùng Agent 4 để:

```yaml
do_not_use_for:
  - rewrite caption hoàn chỉnh
  - tạo prompt ảnh mới
  - chọn angle mới
  - approve thay Human
```

---

## Agent 5 — Image-to-Video Motion Prompt Architect

```yaml
use_when:
  - đã có keyframe images
  - cần prompt Veo 3 image-to-video
  - cần scene-by-scene motion prompt
  - cần retry guidance cho video
```

## Input

```yaml
input:
  - approved keyframe images
  - keyframe_image_prompt_pack
  - handoff_to_agent_5
  - emotional_axis
  - video goal
```

## Output

```yaml
output:
  - motion_prompt_pack
  - scene_render_blocks
  - copy_this_into_veo_3
  - expected_result
  - retry_guidance
```

## Không dùng Agent 5 để:

```yaml
do_not_use_for:
  - tạo keyframe mới
  - render video thật
  - viết caption
  - QA publish
```

---

## Agent 6 — Video Keyframe Image Architect

```yaml
use_when:
  - cần tạo video bằng image-to-video
  - cần keyframe cho từng scene
  - cần giữ nhân vật/bối cảnh nhất quán
  - cần giảm lỗi anatomy/device trước khi render video
```

## Input

```yaml
input:
  - viral_research_packet
  - selected_angle
  - emotional_axis
  - video goal
  - character/environment reference nếu có
```

## Output

```yaml
output:
  - keyframe_image_prompt_pack
  - character_anchor
  - environment_anchor
  - keyframe_prompts
  - human_selection_checklist
  - handoff_to_agent_5
```

## Không dùng Agent 6 để:

```yaml
do_not_use_for:
  - animate video
  - viết motion prompt
  - viết caption
  - QA publish
```

---

## Agent 7 — Documentation & Packaging Architect

```yaml
use_when:
  - cần đóng gói hệ thống thành tài liệu
  - cần handbook
  - cần proposal
  - cần SOP
  - cần client-facing documentation
  - cần training manual
```

## Input

```yaml
input:
  - agent system prompts
  - workflow
  - SOP
  - raw notes
  - case study
  - automation architecture
```

## Output

```yaml
output:
  - documentation_pack
  - document_blueprint
  - full_document_draft
  - docx_build_spec
  - troubleshooting_playbook
  - client_facing_version
```

## Không dùng Agent 7 để:

```yaml
do_not_use_for:
  - viết caption social
  - tạo image prompt
  - QA publish
  - research viral angle
```

---

# 4. MASTER WORKFLOW MAP

## 4.1 Social Post Workflow

```text
Human Brief
  ↓
Agent 1 — Viral Research
  ↓
Agent 3 — Image Prompt
  ↓
Image Engine
  ↓
Agent 2 — Caption
  ↓
Agent 4 — QA
  ↓
Human Publish
```

---

## 4.2 Image-to-Video Workflow

```text
Human Brief
  ↓
Agent 1 — Viral Research
  ↓
Agent 6 — Keyframe Image Architect
  ↓
Image Engine
  ↓
Agent 5 — Motion Prompt
  ↓
Veo 3 / Video Engine
  ↓
Agent 4 — QA
  ↓
Human Publish
```

---

## 4.3 Documentation Workflow

```text
System / Workflow / Notes
  ↓
Agent 7 — Documentation Packaging
  ↓
DOCX_BUILD_SPEC
  ↓
Human Review
  ↓
DOCX / PDF Production
```

---

# 5. ROUTING MAP

| Vấn đề                       | Route về agent             |
| ---------------------------- | -------------------------- |
| Brief chưa rõ / angle yếu    | Agent 1                    |
| Hook/caption/CTA yếu         | Agent 2                    |
| Visual không stop-scroll     | Agent 3                    |
| Caption và visual lệch nhau  | Agent 2 hoặc Agent 3       |
| QA fail / publish risk       | Agent 4                    |
| Motion video lỗi             | Agent 5                    |
| Keyframe không nhất quán     | Agent 6                    |
| Tài liệu trình bày kém       | Agent 7                    |
| Prompt quá rối / entropy cao | Refactor canonical version |
| Không rõ route               | Agent 4 đánh giá trước     |

---

# 6. ARTIFACT FLOW

## Core artifacts

```yaml
artifacts:
  viral_research_packet:
    owner: Agent 1

  image_prompt_pack:
    owner: Agent 3

  caption_pack:
    owner: Agent 2

  publish_readiness_review:
    owner: Agent 4

  keyframe_image_prompt_pack:
    owner: Agent 6

  motion_prompt_pack:
    owner: Agent 5

  documentation_pack:
    owner: Agent 7
```

---

# 7. SOURCE-OF-TRUTH ORDER

Khi agent bị conflict context, ưu tiên:

```yaml
priority_order:
  1: Human runtime instruction
  2: Approved upstream artifact
  3: Agent 1 strategic packet
  4: Brand/product context
  5: Platform context
  6: Assumptions
```

---

# 8. OPERATOR QUICK COMMANDS

## Lệnh tạo social post

```text
Dùng Agent 1 phân tích brief này thành viral_research_packet.
Sau đó route sang Agent 3 để tạo image_prompt_pack, Agent 2 để viết caption, và Agent 4 để QA trước publish.
```

---

## Lệnh tạo video

```text
Dùng Agent 1 để tạo strategic packet.
Sau đó route sang Agent 6 để tạo keyframe_image_prompt_pack.
Sau khi có ảnh keyframe đã duyệt, route sang Agent 5 để tạo motion_prompt_pack cho Veo 3.
Cuối cùng gửi Agent 4 QA trước publish.
```

---

## Lệnh tạo tài liệu

```text
Dùng Agent 7 để đóng gói hệ thống/workflow này thành tài liệu DOCX chuyên nghiệp.
Output cần có DOCUMENT_BLUEPRINT, FULL_DOCUMENT_DRAFT và DOCX_BUILD_SPEC.
```

---

# 9. VERSION CONTROL RULE

Mỗi agent phải có:

```yaml
version:
  canonical_version:
  last_updated:
  status:
  owner:
```

Không sử dụng nhiều bản prompt cùng lúc.

Nếu có patch:

* không append vô hạn
* refactor vào canonical version
* cập nhật version number

---

# 10. GOVERNANCE RULES FOR OPERATORS

Không được:

* bypass Agent 4 QA
* dùng Agent 2 khi chưa có context
* dùng Agent 5 khi chưa có keyframe
* để Agent 4 rewrite thay Agent 2
* để Agent 3 viết caption
* để Agent 6 animate video
* dùng nhiều prompt version cùng lúc

Phải:

* giữ artifact chain
* route đúng owner
* lưu version
* ghi nhận lỗi lặp lại
* cập nhật canonical prompt khi cần

---
