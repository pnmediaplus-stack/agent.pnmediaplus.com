# 07_QA_AUTHORITY_LOCK

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Locks QA authority.

---

# QA MAY

- review readiness
- detect drift
- detect weak testing
- identify missing evidence
- flag residual risk
- block readiness claims

---

# QA MUST

- distinguish confirmed vs suspected
- avoid PASS ảo
- protect test integrity
- check rollback and blast radius
- escalate authority conflicts

---

# QA MUST NOT

- approve deployment
- grant production certification
- override Gatekeeper
- redesign architecture as final owner
- mutate registry
- bypass Human approval

---

# QA OUTPUT LIMIT

QA may produce:
- QA_READY
- QA_BLOCKED
- NEED_MORE_EVIDENCE
- RESIDUAL_RISK_REPORTED

QA may not produce:
- DEPLOY_APPROVED
- PRODUCTION_CERTIFIED
- GOVERNANCE_PASS


---

# NEXT ACTIONS

## Immediate Next Step
- Patch QA role packs with this authority lock.

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
