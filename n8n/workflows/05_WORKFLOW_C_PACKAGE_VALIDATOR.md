# 05_WORKFLOW_C_PACKAGE_VALIDATOR

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for validating release package completeness and safety.

---

# INPUT

```json
{
  "package_id": "",
  "package_path": "",
  "release_type": ""
}
```

---

# NODE SEQUENCE

1. Load release package
2. Check required files
3. Parse manifest
4. Parse dependency map
5. Resolve every artifact through registry
6. Check SHA match
7. Check status safety
8. Check validation checklist
9. Emit package validation report

---

# REQUIRED FILES

- MANIFEST.md
- DEPENDENCY_MAP.md
- VALIDATION_CHECKLIST.md
- CHANGELOG.md
- GATEKEEPER_HANDOFF.md
- NEXT_ACTIONS.md

---

# OUTPUT STATUS

- PACKAGE_VALID
- PACKAGE_BLOCKED
- PACKAGE_NEEDS_REVIEW
- PACKAGE_INVALID

---

# BLOCK CONDITIONS

- missing manifest
- missing dependency map
- unresolved artifact
- SHADOW artifact loaded as active
- SUPERSEDED artifact loaded as active
- SHA mismatch
- missing changelog

---

# NEXT ACTIONS

## Immediate Next Step
- Build validator after registry resolver is working.

## Required Inputs
- Tier 2 registry kernel
- Tier 2.5 registry population/resolver runtime
- Tier 3 layer isolation enforcement
- Tier 4 capability authority enforcement
- Tier 5 protocol gate/state enforcement
- Tier 6 artifact package/release enforcement
- n8n instance or workflow builder environment

## Recommended Owner
- Automation Architect designs n8n workflows
- Governance Relay owns apply-gate routing
- Gatekeeper validates automation safety
- Human approves runtime enablement

## Blocking Conditions
- Registry is not populated
- SHA validation unavailable
- Gatekeeper review path missing
- n8n attempts to decide canonical truth
- n8n applies release without approved gate

## Suggested Next Package
- TIER_8_RUNTIME_ROLLOUT_AND_OPERATIONS
