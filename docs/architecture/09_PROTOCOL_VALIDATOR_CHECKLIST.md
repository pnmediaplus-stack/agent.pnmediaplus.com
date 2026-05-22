# 09_PROTOCOL_VALIDATOR_CHECKLIST

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Gatekeeper checklist for protocol compliance.

---

# CHECKLIST

## 1. State Compliance

- [ ] all state labels are canonical
- [ ] no lower-layer state invention
- [ ] states map to protocol owner

Fail:
- STATE_TAXONOMY_VIOLATION

---

## 2. Gate Compliance

- [ ] all gate labels are canonical
- [ ] no soft gates
- [ ] no execution-derived approval

Fail:
- GATE_TAXONOMY_VIOLATION

---

## 3. Verdict Compliance

- [ ] role uses authorized verdicts only
- [ ] Architect does not PASS
- [ ] QA does not deploy approve
- [ ] n8n does not canonical approve

Fail:
- UNAUTHORIZED_VERDICT_LABEL

---

## 4. Handoff Compliance

- [ ] required handoff fields exist
- [ ] next actions exist
- [ ] requested decision exists
- [ ] evidence fields exist

Fail:
- HANDOFF_SCHEMA_INCOMPLETE

---

## 5. Escalation Compliance

- [ ] escalation conditions declared
- [ ] fail-closed behavior exists
- [ ] escalation routing exists

Fail:
- ESCALATION_SCHEMA_MISSING

---

# ALLOWED VERDICTS

- PROTOCOL_PASS
- CONDITIONAL_PASS_WITH_PROTOCOL_PATCH
- BLOCKED_BY_PROTOCOL_DRIFT
- INVALID_FOR_RUNTIME
- NEED_MORE_SOURCE


---

# NEXT ACTIONS

## Immediate Next Step
- Run this checklist before any artifact can be registry runtime-loadable.

## Required Inputs
- Tier 2 / 2.5 registry artifacts
- Tier 3 layer isolation rules
- Tier 4 capability authority rules
- Current STD_STATE_GATE_TAXONOMY
- Current STD_HANDOFF_ARTIFACT_STANDARD
- Current Gatekeeper / QA / Architect output formats

## Recommended Owner
- Architect drafts protocol enforcement
- Governance Relay normalizes protocol references
- Gatekeeper validates protocol compliance

## Blocking Conditions
- Runtime/workflow/role pack defines its own state taxonomy
- Unauthorized verdict labels appear
- Handoff schema missing required fields
- Gate labels conflict across artifacts
- Protocol artifacts not registry-resolved

## Suggested Next Package
- TIER_6_ARTIFACT_PACKAGE_RELEASE_ENFORCEMENT
