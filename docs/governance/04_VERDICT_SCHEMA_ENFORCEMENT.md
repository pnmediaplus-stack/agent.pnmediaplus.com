# 04_VERDICT_SCHEMA_ENFORCEMENT

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Controls review verdict labels across Architect, Gatekeeper, QA, Governance Relay, and automation outputs.

---

# CANONICAL VERDICTS

## Gatekeeper Verdicts

- PASS
- BLOCKED
- NEED_MORE_SOURCE
- CONDITIONAL_PASS
- INVALID_FOR_RUNTIME

## Architect Verdicts

- DESIGN_READY
- PATCH_PROPOSED
- NEED_MORE_SOURCE
- GATEKEEPER_HANDOFF_READY

## QA Verdicts

- QA_READY
- QA_BLOCKED
- NEED_MORE_EVIDENCE
- RESIDUAL_RISK_REPORTED

## Registry Verdicts

- REGISTRY_POPULATION_PASS
- REGISTRY_POPULATION_BLOCKED
- INVALID_REGISTRY_PATCH
- BLOCKED_BY_VERSION_DRIFT
- BLOCKED_BY_DUPLICATE_AUTHORITY

## Runtime Verdicts

- LOAD_ALLOWED
- LOAD_BLOCKED
- RESOLUTION_BLOCKED
- VALIDATION_BLOCKED

---

# VERDICT LAW

A role may only emit verdicts authorized for that role.

---

# FORBIDDEN VERDICTS

- SOFT_PASS
- PRODUCTION_READY without approval path
- DEPLOY_APPROVED by QA
- CANONICAL_APPROVED by n8n
- APPLIED by Gatekeeper
- PASS by Architect

---

# VIOLATION

Unauthorized verdict label:
- UNAUTHORIZED_VERDICT_LABEL


---

# NEXT ACTIONS

## Immediate Next Step
- Patch all role output sections to use only authorized verdict labels.

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
