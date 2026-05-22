# 02_STATE_TAXONOMY_ENFORCEMENT

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Locks state taxonomy under canonical protocol authority.

---

# STATE OWNER

Canonical owner:
- STD_STATE_GATE_TAXONOMY

---

# LOWER-LAYER RULE

Runtime, workflow, role, QA, and n8n artifacts may only reference states imported from STD_STATE_GATE_TAXONOMY.

They must not create new state labels.

---

# CONTROLLED STATE CLASSES

## Artifact States

Examples:
- DRAFT
- REVIEW_READY
- BLOCKED
- PASS
- APPLY_READY
- APPLIED
- SUPERSEDED
- SHADOW
- REVOKED

## Runtime States

Examples:
- LOAD_ALLOWED
- LOAD_BLOCKED
- RESOLUTION_BLOCKED
- VALIDATION_BLOCKED

## Migration States

Examples:
- ACTIVE_CANDIDATE
- REVIEW_REQUIRED
- NEED_SHA
- CONFLICT_REVIEW

---

# RULE

If a new state is needed:
1. propose protocol extension
2. Gatekeeper reviews
3. Governance Relay applies
4. registry updates
5. lower layer imports

---

# FORBIDDEN

- ad hoc states in role output
- workflow-only gate labels
- runtime-generated PASS states
- undocumented state names


---

# NEXT ACTIONS

## Immediate Next Step
- Extract state labels from current role/workflow/runtime docs and compare against protocol owner.

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
