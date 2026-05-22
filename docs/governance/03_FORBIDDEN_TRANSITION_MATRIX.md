# 03_FORBIDDEN_TRANSITION_MATRIX

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Defines transitions that roles must not perform.

---

# FORBIDDEN TRANSITIONS

| Actor | Forbidden Transition | Reason |
|---|---|---|
| Architect | REVIEW_READY -> PASS | Architect cannot certify own work |
| Architect | PATCH_PROPOSED -> APPLIED | Requires Gatekeeper/Governance Relay/Human |
| Gatekeeper | BLOCKED -> REDESIGNED | Gatekeeper reviews, does not redesign |
| Gatekeeper | PASS -> CODE_APPLIED | Gatekeeper does not apply |
| QA Agent | QA_READY -> DEPLOY_APPROVED | QA is readiness reviewer, not deployment authority |
| Governance Relay | DRAFT -> IMPLEMENTED_CODE | Relay does not implement code |
| n8n | ARTIFACT_UPLOADED -> CANONICAL_ACTIVE | n8n cannot decide canonical truth |
| n8n | REGISTRY_PATCH_PROPOSED -> REGISTRY_APPLIED | n8n cannot apply registry |
| Workflow Agent | EXECUTION_SUCCESS -> GOVERNANCE_PASS | execution success is not governance pass |
| Any Role | INVALID -> VALID without review | invalidity must be reviewed |

---

# ALLOWED HIGH-LEVEL FLOW

```text
Architect proposes
→ Gatekeeper reviews
→ Governance Relay normalizes/apply-gates
→ Human approves if required
→ Runtime/n8n executes
```

---

# VIOLATION VERDICTS

- ROLE_TRANSITION_VIOLATION
- SELF_CERTIFICATION_VIOLATION
- APPLY_GATE_BYPASS
- AUTOMATION_AUTHORITY_DRIFT


---

# NEXT ACTIONS

## Immediate Next Step
- Use this matrix to audit role outputs and orchestration flows.

## Required Inputs
- Tier 3 Layer Isolation outputs
- Current BOT role packs
- Canonical Role Map
- Capability Authority Graph
- Gatekeeper / Governance Relay / Architect role files

## Recommended Owner
- Architect drafts capability enforcement
- Governance Relay normalizes role metadata
- Gatekeeper validates role boundary compliance

## Blocking Conditions
- Architect grants PASS
- Gatekeeper redesigns system
- QA approves deployment
- n8n decides canonical truth
- Any agent claims Human/Governance Relay apply authority without explicit mandate

## Suggested Next Package
- TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT
