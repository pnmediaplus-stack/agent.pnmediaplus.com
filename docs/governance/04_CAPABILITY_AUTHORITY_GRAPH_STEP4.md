# 04_CAPABILITY_AUTHORITY_GRAPH_STEP4.md

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
freeze_phase: STEP_4

---

# PURPOSE

Defines canonical capability ownership for PN OS agents and governance roles.

This prevents:
- role expansion drift
- agent overreach
- QA becoming architect
- Gatekeeper redesigning system
- Architect bypassing review

---

# CAPABILITY OWNERSHIP MATRIX

| Capability | Canonical Owner | Notes |
|---|---|---|
| Business final override | CEO / Human | May approve direction, not bypass immutable law |
| Directive normalization | Governance Relay | May normalize/apply governance, must not implement code |
| System design / patch logic | Architect | May propose/design/code patch, must not grant PASS |
| Runtime safety / QA enforcement | Gatekeeper | May PASS/BLOCK, must not redesign |
| Readiness QA | QA Agent | May assess readiness, must not approve deployment |
| Strategic planning | Strategic Advisor | May advise, must not mutate runtime |
| Revenue orchestration | Revenue Orchestration | May plan revenue, must not mutate financial truth |
| Product orchestration | Product Orchestration | May scope product direction, must not bypass gates |
| Legal/compliance review | Legal Compliance | May flag compliance risk, must not implement |
| n8n workflow execution | n8n | Execution only, never business/financial authority |

---

# TRANSITION AUTHORITY MATRIX

| Actor | May Transition | Must Not Transition |
|---|---|---|
| Architect | DRAFT -> PATCH_PROPOSED | REVIEW_READY -> PASS |
| Gatekeeper | REVIEW_READY -> PASS/BLOCKED | PATCH_PROPOSED -> CODE_APPLIED |
| Governance Relay | APPROVED -> APPLY_READY | BLOCKED -> PASS |
| Human | APPLY_READY -> APPLY_APPROVED | INVALID -> VALID without review |
| QA Agent | DRAFT -> QA_READY / QA_BLOCKED | QA_READY -> PRODUCTION_APPROVED |
| n8n | EXECUTION_READY -> EXECUTED | decide canonical authority |

---

# ROLE BOUNDARY LAW

No role may:
- weaken immutable law
- self-promote authority
- bypass Gatekeeper on safety-sensitive change
- treat execution success as governance PASS

---

# CAPABILITY STATUS VALUES

- MAY
- MUST
- MUST_NOT
- REVIEW_ONLY
- EXECUTION_ONLY
- FINAL_APPLY_ONLY

---

# INVALID CONDITIONS

INVALID_FOR_RUNTIME if:
- a role pack claims authority not listed here
- QA grants final deployment approval
- Gatekeeper rewrites architecture
- Architect grants PASS
- n8n resolves canonical truth

---

# STATUS

capability_graph: ESTABLISHED
role_creep_guard: ACTIVE
