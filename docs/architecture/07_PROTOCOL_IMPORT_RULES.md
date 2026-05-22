# 07_PROTOCOL_IMPORT_RULES

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Defines how lower layers import protocol authority.

---

# REQUIRED IMPORT BLOCK

```yaml
imports:
  - artifact_id: STD_STATE_GATE_TAXONOMY
    import_type: PROTOCOL_AUTHORITY
    imports:
      - state_taxonomy
      - gate_taxonomy
      - verdict_schema
      - escalation_schema

  - artifact_id: STD_HANDOFF_ARTIFACT_STANDARD
    import_type: PROTOCOL_AUTHORITY
    imports:
      - handoff_schema
```

---

# IMPORT LAW

Imported protocol:
- must be resolved by registry
- must not be copied as new authority
- must not be modified locally
- must not be partially reinterpreted

---

# SAFE USAGE

Allowed:
- "This artifact uses PASS as defined by STD_STATE_GATE_TAXONOMY."

Forbidden:
- "This artifact defines PASS as..."

---

# IMPORT FAILURE

If required protocol import is missing:
- BLOCKED_BY_PROTOCOL_IMPORT_GAP


---

# NEXT ACTIONS

## Immediate Next Step
- Add protocol import blocks to Architect, Gatekeeper, QA, Governance Relay, n8n, runtime and workflow files.

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
