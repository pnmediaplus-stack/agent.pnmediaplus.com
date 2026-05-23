# 057_DEPARTMENT_REGISTRY_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Draft canonical department registry seed for PN OS multi-department operations  
**Purpose:** Define every department pack, owner, boundary, dependency, and current operating state in one governed registry

---

# 0. Registry Principle

The registry is authority.

Departments are not defined by folder names, chat labels, or convenience.
They are defined by registry records.

If a department is not in the registry, it is not operationally authoritative.

---

# 1. Registry Rules

- one department = one canonical registry record
- one owner = one accountable owner role
- one primary truth source per domain
- one state per record
- one handoff contract format across the system

No department may self-register authority.

---

# 2. Registry Status

This registry is a seed for the current multi-department rollout.

Current registry state:

- canonical seed: draft
- operational use: governance only
- production authority: not yet enabled

This means the registry can guide build and routing now, but it does not authorize autonomous production behavior.

---

# 3. Registry Fields

Every department record must contain:

- department_id
- department_name
- department_pack
- owner_role
- owner_team
- primary_purpose
- canonical_truth_source
- allowed_actions
- must_not_actions
- dependencies
- downstream_recipients
- current_state
- handoff_required
- qa_required
- human_review_required
- notes

---

# 4. Department Records

## 4.1 Core Governance

| Field | Value |
|---|---|
| department_id | `dept-core-gov` |
| department_name | Core Governance |
| department_pack | Core Governance Pack |
| owner_role | Human / Executive + Governance Relay |
| owner_team | Executive Governance Layer |
| primary_purpose | Human finality, routing, apply-gate, state reconciliation |
| canonical_truth_source | Core constitution + protocol authority |
| allowed_actions | route, normalize, reconcile, block, escalate |
| must_not_actions | implement code, self-approve, mutate runtime truth |
| dependencies | none |
| downstream_recipients | all departments |
| current_state | active-governance |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | always when approval law triggers |
| notes | This is the top routing layer for multi-department governance. |

## 4.2 Business Truth

| Field | Value |
|---|---|
| department_id | `dept-business-truth` |
| department_name | Business Truth |
| department_pack | Business Truth Pack |
| owner_role | Finance / Billing + Auth / Identity + Product / Offer Governance |
| owner_team | Business Truth Layer |
| primary_purpose | Own offer, pricing, billing, identity, and package truth |
| canonical_truth_source | Billing services, auth services, product truth sources |
| allowed_actions | validate truth, expose sanitized read models, enforce ownership boundaries |
| must_not_actions | let marketing set price, let UI compute money truth |
| dependencies | Core Governance |
| downstream_recipients | Marketing, Media, Operations, Customer |
| current_state | active-governance |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | when pricing/compliance exceptions occur |
| notes | This pack protects system truth for money and identity. |

## 4.3 Marketing

| Field | Value |
|---|---|
| department_id | `dept-marketing` |
| department_name | Marketing |
| department_pack | Marketing Pack |
| owner_role | Chief Marketing Agent |
| owner_team | Marketing Governance Layer |
| primary_purpose | Positioning, GTM translation, campaign orchestration, claim boundary |
| canonical_truth_source | Approved product/business truth, market signals, proof references |
| allowed_actions | analyze, translate, brief, sequence, coordinate, escalate |
| must_not_actions | mutate billing/auth/runtime, self-launch, fabricate proof |
| dependencies | Core Governance, Business Truth |
| downstream_recipients | Media, Operations, Human |
| current_state | active-governance |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | when claims, pricing, or launch thresholds are crossed |
| notes | Marketing owns governed truth translation, not final launch authority. |

## 4.4 Media

| Field | Value |
|---|---|
| department_id | `dept-media` |
| department_name | Media |
| department_pack | Media Pack |
| owner_role | Media Lead / Production Lead |
| owner_team | Media Execution Layer |
| primary_purpose | Asset production, prompt architecture, motion, caption packaging, publish readiness |
| canonical_truth_source | Marketing brief, QA-approved boundaries, asset references |
| allowed_actions | produce, adapt, package, prepare publish-ready assets |
| must_not_actions | change offer truth, widen claims, publish without QA |
| dependencies | Marketing, Core Governance |
| downstream_recipients | QA, Distribution, Performance Memory |
| current_state | active-governance |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | when public claims or launch risk are sensitive |
| notes | Media is execution, not truth creation. |

## 4.5 Operations

| Field | Value |
|---|---|
| department_id | `dept-operations` |
| department_name | Operations |
| department_pack | Operations Pack |
| owner_role | Runtime / N8N + Ops Lead |
| owner_team | Operations Layer |
| primary_purpose | Workflow execution, routing, monitoring, run visibility |
| canonical_truth_source | Approved handoffs, runtime registry, execution logs |
| allowed_actions | execute approved flows, monitor queues, report status |
| must_not_actions | decide canonical truth, self-approve, mutate policy |
| dependencies | Core Governance, Business Truth |
| downstream_recipients | Human, Governance Relay, all department owners |
| current_state | mock-first / partial-operational |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | for production enablement |
| notes | Operations becomes live only after read-only validation and rollout gate. |

## 4.6 Customer

| Field | Value |
|---|---|
| department_id | `dept-customer` |
| department_name | Customer |
| department_pack | Customer Pack |
| owner_role | CS / Support Lead |
| owner_team | Customer Support Layer |
| primary_purpose | Support intake, issue triage, escalation tracking, feedback loop |
| canonical_truth_source | Customer tickets, approved product truth, resolved issue logs |
| allowed_actions | intake, triage, escalate, summarize feedback |
| must_not_actions | rewrite offer truth, invent resolutions, bypass escalation |
| dependencies | Core Governance, Business Truth, Marketing |
| downstream_recipients | Marketing, Product, Operations, Human |
| current_state | planned |
| handoff_required | yes |
| qa_required | yes |
| human_review_required | for sensitive incidents |
| notes | Customer feedback is a governed loop-back channel. |

---

# 5. Sub-Department Registry

## 5.1 Marketing Sub-Departments

| Department | Owner | State | Notes |
|---|---|---|---|
| Chief Marketing Agent | Marketing Governance Layer | drafted | strategic coordinator |
| Market Intel | Marketing Governance Layer | drafted | signal collection and trend analysis |
| PMM / Positioning | Marketing Governance Layer | drafted | offer translation and positioning |
| Growth | Marketing Governance Layer | drafted | CTA and conversion support |
| Content & Distribution | Marketing Governance Layer | drafted | sequencing and routing |
| Story & Narrative | Marketing Governance Layer | drafted | narrative and hook framing |
| Systems Proof | Marketing Governance Layer | drafted | proof visualization and operational realism |

## 5.2 Media Sub-Departments

| Department | Owner | State | Notes |
|---|---|---|---|
| Image Prompt Architect | Media Execution Layer | drafted | prompt structure |
| Video Keyframe Image Architect | Media Execution Layer | drafted | keyframe continuity |
| Image-to-Video Motion Prompt Architect | Media Execution Layer | drafted | motion prompt logic |
| Social Caption Architect | Media Execution Layer | drafted | platform-native copy |
| Publish Readiness QA Agent | Media QA Layer | drafted | release safety gate |
| Distribution Intelligence | Media Intelligence Layer | drafted | platform adaptation and timing |
| Performance Memory | Media Memory Layer | drafted | outcome learning |

---

# 6. Current Gaps

The registry is not yet production-complete because:

- runtime is still partially mock-first
- cross-department handoff is not yet live everywhere
- some department packs are still draft-seeded rather than operational
- publish and memory loops are not yet fully end-to-end

This is acceptable for governance rollout, but not for autonomous production.

---

# 7. Registry Maintenance Rule

Registry changes must go through:

1. proposal
2. review
3. apply gate
4. lineage update
5. index update

No silent edits.
No implicit authority shifts.

