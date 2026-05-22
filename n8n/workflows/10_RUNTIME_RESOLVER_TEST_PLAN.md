# 10_RUNTIME_RESOLVER_TEST_PLAN

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines test cases for registry resolver runtime.

---

# TEST CASES

## Test 1 — Valid Artifact Resolution

Input:
- valid artifact_id

Expected:
- RESOLVED
- SHA match
- runtime_load_allowed true

---

## Test 2 — Missing Artifact

Input:
- unknown artifact_id

Expected:
- BLOCKED
- blocking_rule: ARTIFACT_NOT_REGISTERED

---

## Test 3 — SHA Mismatch

Input:
- artifact with registry SHA not matching file SHA

Expected:
- BLOCKED
- blocking_rule: SHA_MISMATCH

---

## Test 4 — Superseded Artifact

Input:
- superseded artifact_id/path

Expected:
- BLOCKED
- blocking_rule: SUPERSEDED_ARTIFACT

---

## Test 5 — Duplicate Active

Input:
- registry has two ACTIVE records for same artifact_id

Expected:
- BLOCKED
- blocking_rule: DUPLICATE_ACTIVE_AUTHORITY

---

## Test 6 — Missing Dependency

Input:
- artifact imports missing protocol

Expected:
- BLOCKED
- blocking_rule: MISSING_DEPENDENCY

---

# PASS CONDITION

Resolver test passes only when:
- all block cases block
- valid artifact resolves
- no fallback loading occurs

---

# NEXT ACTIONS

## Immediate Next Step
- Run resolver tests after registry draft exists.

## Required Inputs
- Registry draft
- sample artifacts
- conflict queue
- resolver implementation

## Recommended Owner
- Architect and Gatekeeper

## Blocking Conditions
- no registry draft
- no SHA validation
- no dependency resolver

## Suggested Next Package
- TIER_3_LAYER_ISOLATION_ENFORCEMENT
