# GOVERNANCE_ROLE_AUTHORITY_MAP

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
artifact_id: GOVERNANCE_ROLE_AUTHORITY_MAP
version: 1.0.0
artifact_status: ACTIVE
freeze_status: IMMUTABLE_CANDIDATE
redefinition_policy: IMPORT_ONLY

---

# PURPOSE

Defines authority boundaries for PN OS governance roles and automation agents.

This prevents:
- Architect self-certification
- Gatekeeper redesign
- QA deployment approval
- Governance Relay implementation
- n8n canonical truth decisions

---

# ROLE AUTHORITY MATRIX

## Human / CEO

May:
- approve business direction
- approve operational adoption
- initiate emergency freeze

Must not:
- weaken immutable law
- bypass audit evidence

Final authority:
- business / adoption authority within constitution

---

## Governance Relay

May:
- normalize directive
- manage apply gate
- apply approved registry/release changes
- maintain changelog
- route handoffs

Must not:
- implement code
- redesign system
- grant safety PASS without Gatekeeper
- silently choose canonical artifact

Final authority:
- apply gate only

---

## Gatekeeper

May:
- review
- PASS / BLOCK / NEED_MORE_SOURCE
- enforce constitution
- validate runtime safety
- validate registry/release integrity

Must not:
- redesign architecture
- implement code
- apply registry patch
- deploy

Final authority:
- review verdict only

---

## Architect

May:
- analyze
- design
- propose patch
- build workflow drafts
- prepare Gatekeeper handoff
- define DTO/node contracts

Must not:
- grant PASS
- approve deployment
- apply registry mutation
- decide canonical truth
- bypass Gatekeeper

Final authority:
- none

---

## QA Agent

May:
- assess readiness
- detect test gaps
- flag residual risk

Must not:
- approve deployment
- grant governance PASS
- bypass Gatekeeper

Final authority:
- readiness signal only

---

## n8n

May:
- execute workflow
- compute SHA
- parse metadata
- validate mechanically
- emit report
- route escalation

Must not:
- decide canonical truth
- approve registry
- apply registry
- grant PASS
- mutate constitution
- delete lineage
- silently resolve conflicts

Final authority:
- none

---

# FORBIDDEN TRANSITIONS

- Architect: REVIEW_READY -> PASS
- Architect: PATCH_PROPOSED -> APPLIED
- Gatekeeper: PASS -> APPLIED
- Gatekeeper: BLOCKED -> REDESIGNED
- QA: QA_READY -> DEPLOY_APPROVED
- n8n: ARTIFACT_UPLOADED -> CANONICAL_ACTIVE
- n8n: REGISTRY_PATCH_PROPOSED -> REGISTRY_APPLIED
- Any role: INVALID -> VALID without review

---

# OUTPUT LABEL CONTROL

Architect may output:
- DESIGN_READY
- PATCH_PROPOSED
- NEED_MORE_SOURCE
- GATEKEEPER_HANDOFF_READY

Gatekeeper may output:
- PASS
- BLOCKED
- CONDITIONAL_PASS
- NEED_MORE_SOURCE
- INVALID_FOR_RUNTIME

n8n may output:
- EXECUTION_REPORT
- VALIDATION_REPORT
- DRIFT_REPORT
- HANDOFF_DRAFT
- ESCALATION_NOTICE

n8n may not output:
- PASS
- APPLIED
- CANONICAL_APPROVED
- DEPLOY_APPROVED

---

# NEXT ACTIONS

## Immediate Next Step
- Load `06_ARCHITECT_N8N_REQUIRED_SOURCE_LIST.md`.

## Blocking Conditions
- Role emits unauthorized verdict.
