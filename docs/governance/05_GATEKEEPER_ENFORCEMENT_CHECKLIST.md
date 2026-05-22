# 05_GATEKEEPER_ENFORCEMENT_CHECKLIST.md

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
phase: TIER_1_5

---

# PURPOSE

Gatekeeper checklist for enforcing Tier 1.5 migration.

---

# CHECKLIST

## 1. Metadata Presence

- [ ] artifact_id exists
- [ ] version exists
- [ ] artifact_status exists
- [ ] constitutional_layer exists
- [ ] authority_level exists
- [ ] freeze_status exists
- [ ] redefinition_policy exists
- [ ] owner_authority exists

Fail if missing:
- NOT_REVIEW_READY

---

## 2. Layer Validity

- [ ] layer is one of approved values
- [ ] layer matches document function
- [ ] lower layer does not claim upper authority

Fail if violated:
- INVALID_LAYER_CLASSIFICATION

---

## 3. Duplicate Authority Check

- [ ] no duplicate ACTIVE artifact_id
- [ ] no same-version different-content unresolved
- [ ] no shadow artifact marked active

Fail if violated:
- BLOCKED_BY_DUPLICATE_AUTHORITY

---

## 4. Redefinition Check

- [ ] runtime doc imports state taxonomy
- [ ] workflow doc imports protocol
- [ ] role pack imports role map
- [ ] no lower-layer redefinition found

Fail if violated:
- INVALID_FOR_RUNTIME

---

## 5. Capability Boundary Check

- [ ] role stays within capability graph
- [ ] no PASS authority where not allowed
- [ ] no APPLY authority where not allowed
- [ ] no runtime mutation authority where not allowed

Fail if violated:
- CAPABILITY_AUTHORITY_VIOLATION

---

## 6. Supersession Check

- [ ] superseded files declare superseded_by
- [ ] active files declare supersedes if replacing
- [ ] legacy files are not runtime-loadable

Fail if violated:
- SUPERSESSION_INCOMPLETE

---

# ALLOWED VERDICTS

- PASS_FOR_TIER_1_5
- CONDITIONAL_PASS_WITH_METADATA_PATCH
- BLOCKED_BY_DUPLICATE_AUTHORITY
- BLOCKED_BY_VERSION_DRIFT
- INVALID_FOR_RUNTIME
- NEED_MORE_SOURCE

---

# GATEKEEPER OUTPUT TEMPLATE

```text
Verdict:
Blocking Rules:
Verified Findings:
Required Fixes:
Residual Risks:
Review Scope:
```
