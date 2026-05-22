# 01_CANONICAL_PROTOCOL_AUTHORITY_MAP

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Defines the single owner for each protocol concern.

---

# AUTHORITY MAP

| Protocol Concern | Canonical Owner | Lower-Layer Rule |
|---|---|---|
| State taxonomy | STD_STATE_GATE_TAXONOMY | Import only |
| Gate taxonomy | STD_STATE_GATE_TAXONOMY | Import only |
| Verdict schema | STD_STATE_GATE_TAXONOMY | Import only |
| Handoff schema | STD_HANDOFF_ARTIFACT_STANDARD | Import only |
| Escalation schema | STD_STATE_GATE_TAXONOMY | Import only |
| Artifact validation checklist | STD_ARTIFACT_VALIDATION_CHECKLIST | Import only |
| Pack manifest schema | STD_CANONICAL_PACK_MANIFEST | Import only |
| Dependency map schema | STD_CANONICAL_PACK_DEPENDENCY_MAP | Import only |

---

# PROTOCOL OWNERSHIP LAW

A lower-layer artifact may not become a protocol owner by repeating protocol language.

Authority comes from registry-resolved canonical protocol artifacts only.

---

# INVALID CONDITIONS

INVALID_FOR_RUNTIME if:
- role pack defines new verdict labels
- workflow defines new gate states
- runtime defines new handoff schema
- QA prompt invents readiness state outside taxonomy
- n8n workflow maps execution success to PASS


---

# NEXT ACTIONS

## Immediate Next Step
- Use this authority map to audit every output format in role/runtime/workflow artifacts.

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
