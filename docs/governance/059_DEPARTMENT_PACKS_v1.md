# 059_DEPARTMENT_PACKS_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Department pack master reference for PN OS multi-department rollout  
**Purpose:** Define the v1 operating pack for each department in the registry so the system can route, approve, and hand off work deterministically

---

# 0. Pack Rule

Each department pack is a governed operating unit.

It must declare:

- owner
- purpose
- canonical truth source
- allowed actions
- forbidden actions
- dependencies
- handoff shape
- QA expectation

If a pack does not declare these, it is not operationally complete.

---

# 1. Core Governance Pack

## Purpose

Preserve Human finality, routing integrity, apply-gate behavior, and state reconciliation.

## Owner

- Human / Executive
- Governance Relay

## Canonical Truth Source

- constitution
- protocol
- registry

## Allowed Actions

- route
- normalize
- reconcile
- block
- escalate

## Must Not

- implement code
- self-approve
- mutate runtime truth
- choose canonical truth by convenience

## Dependencies

- none

## Handoff To

- all departments

## QA Expectation

- every governance handoff is evidence-backed and state-gated

---

# 2. Business Truth Pack

## Purpose

Own offer truth, pricing truth, billing truth, identity truth, and package truth.

## Owner

- Finance / Billing
- Auth / Identity
- Product / Offer Governance

## Canonical Truth Source

- billing services
- auth services
- product truth
- package truth

## Allowed Actions

- validate truth
- expose sanitized read models
- enforce ownership boundaries
- emit canonical package records

## Must Not

- let marketing set price
- let UI compute money truth
- let marketing infer identity
- let runtime decide financial truth

## Dependencies

- Core Governance

## Handoff To

- Marketing
- Media
- Operations
- Customer

## QA Expectation

- no package enters downstream work without explicit truth source and ownership

---

# 3. Marketing Pack

## Purpose

Translate verified business truth into governed marketing strategy, positioning, campaign direction, and claim boundary.

## Owner

- Chief Marketing Agent

## Canonical Truth Source

- approved business truth
- market signals
- proof references

## Included Departments

- Chief Marketing Agent
- Market Intel
- PMM / Positioning
- Growth
- Content & Distribution
- Story & Narrative
- Systems Proof

## Allowed Actions

- analyze
- position
- translate
- sequence
- brief
- coordinate
- escalate

## Must Not

- mutate billing/auth/runtime truth
- self-launch
- fabricate proof
- widen claim boundaries

## Dependencies

- Core Governance
- Business Truth

## Handoff To

- Media
- Operations
- Human review when required

## QA Expectation

- every GTM packet has claim boundary, proof direction, and approval state

---

# 4. Media Pack

## Purpose

Turn approved marketing truth into assets, captions, motion, distribution-ready materials, and performance memory.

## Owner

- Media Lead

## Canonical Truth Source

- Marketing brief
- QA-approved boundary
- asset references

## Included Departments

- Image Prompt Architect
- Video Keyframe Image Architect
- Image-to-Video Motion Prompt Architect
- Social Caption Architect
- Publish Readiness QA Agent
- Distribution Intelligence
- Performance Memory

## Allowed Actions

- produce
- adapt
- package
- QA
- prepare publish-ready assets
- capture performance after publish

## Must Not

- change offer truth
- widen claims
- publish without QA
- rewrite strategy

## Dependencies

- Marketing Pack
- Core Governance

## Handoff To

- QA
- Distribution
- Performance Memory

## QA Expectation

- every asset must stay inside the approved claim boundary

---

# 5. Operations Pack

## Purpose

Execute approved workflows, monitor runs, expose state, and keep orchestration observable.

## Owner

- Runtime / N8N
- Ops Lead

## Canonical Truth Source

- approved handoffs
- runtime registry
- execution logs

## Allowed Actions

- execute approved flows
- monitor queues
- report status
- route escalation

## Must Not

- decide canonical truth
- self-approve
- mutate policy
- bypass registry

## Dependencies

- Core Governance
- Business Truth

## Handoff To

- Human
- Governance Relay
- department owners

## QA Expectation

- every run is traceable and fail-closed

---

# 6. Customer Pack

## Purpose

Capture support issues, complaints, triage, escalation, and feedback loops.

## Owner

- CS / Support Lead

## Canonical Truth Source

- customer tickets
- resolved issue logs
- approved product truth

## Allowed Actions

- intake
- triage
- escalate
- summarize feedback

## Must Not

- rewrite offer truth
- invent resolutions
- bypass escalation
- mutate pricing or identity

## Dependencies

- Core Governance
- Business Truth
- Marketing Pack

## Handoff To

- Marketing
- Product
- Operations
- Human

## QA Expectation

- sensitive incidents are escalated with complete evidence

---

# 7. Pack Interaction Rule

No pack may own another pack’s truth.

No pack may bypass the registry to talk directly to a lower layer that it does not own.

Cross-pack handoff must use the canonical handoff contract.

---

# 8. Pack Readiness Rule

Each pack is only ready when:

- owner is explicit
- truth source is explicit
- allowed and forbidden actions are explicit
- dependencies are explicit
- handoff shape is explicit
- QA expectation is explicit

