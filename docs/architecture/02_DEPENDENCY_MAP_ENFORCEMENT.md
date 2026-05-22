# 02_DEPENDENCY_MAP_ENFORCEMENT

status: ACTIVE
layer: ARTIFACT
authority_level: CORE
tier: TIER_6

---

# PURPOSE

Defines dependency map rules for release packages.

---

# DEPENDENCY TYPES

## requires

Hard dependency. Missing dependency blocks release.

## imports

Authority dependency. Missing import blocks runtime.

## compatible_with

Compatibility boundary. Mismatch requires review.

## supersedes

Lineage replacement relation.

## blocked_by

Known blockers that prevent release.

---

# DEPENDENCY RECORD

```yaml
artifact_id:
requires:
  - artifact_id:
    version:
    content_sha256:
imports:
  - artifact_id:
    import_type:
compatible_with:
  - artifact_id:
    version_range:
supersedes:
  - artifact_id:
    version:
blocked_by:
  - condition:
```

---

# DEPENDENCY LAW

All dependencies must resolve through registry.

No release may reference:
- raw filename only
- unresolved shadow artifact
- superseded artifact as active
- missing SHA artifact

---

# INVALID CONDITIONS

- MISSING_REQUIRED_DEPENDENCY
- UNRESOLVED_IMPORT
- CIRCULAR_DEPENDENCY
- SHADOW_DEPENDENCY
- SUPERSEDED_ACTIVE_REFERENCE
- VERSION_INCOMPATIBILITY

---

# NEXT ACTIONS

## Immediate Next Step
- Generate dependency maps for Tier 1–5 packages and validate registry refs.

## Required Inputs
- Tier 2 / 2.5 registry outputs
- Tier 3 layer isolation outputs
- Tier 4 capability authority outputs
- Tier 5 protocol enforcement outputs
- Current STD manifest / dependency / release / validation artifacts

## Recommended Owner
- Architect designs package/release structure
- Governance Relay normalizes release records
- Gatekeeper validates release safety

## Blocking Conditions
- Missing manifest
- Missing dependency map
- Missing validation checklist
- Missing changelog
- Release includes SHADOW or SUPERSEDED artifact as ACTIVE
- Release references artifact not registry-resolved

## Suggested Next Package
- TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME
