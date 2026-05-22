# 10_GATEKEEPER_RELEASE_REVIEW_FORM

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_6

---

# PURPOSE

Standard Gatekeeper review form for release packages.

---

# REVIEW FORM

## Scope

Package:
Version:
Release type:

---

## Files Reviewed

- MANIFEST:
- DEPENDENCY_MAP:
- VALIDATION_CHECKLIST:
- CHANGELOG:
- GATEKEEPER_HANDOFF:

---

## Registry Verification

- All artifacts resolve:
- SHA matched:
- runtime_load_allowed valid:

---

## Dependency Verification

- required deps:
- imports:
- circular deps:
- superseded refs:

---

## Layer / Capability / Protocol Verification

- layer violations:
- role creep:
- protocol drift:
- handoff schema complete:

---

## Release Risk

- constitutional impact:
- protocol impact:
- runtime impact:
- capability impact:
- artifact lineage impact:

---

## Verdict

Allowed:
- RELEASE_PASS
- RELEASE_BLOCKED
- CONDITIONAL_PASS_WITH_FIXES
- NEED_MORE_SOURCE
- INVALID_RELEASE_PACKAGE

---

## Required Fixes

- 

---

## Residual Risk

- 

---

# NEXT ACTIONS

## Immediate Next Step
- Use this review form for every package before APPLY_READY.

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
