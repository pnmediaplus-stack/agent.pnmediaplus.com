# 05_RESOLVER_RUNTIME_ALGORITHM

status: ACTIVE
layer: RUNTIME
authority_level: SUPREME
tier: TIER_2_5

---

# PURPOSE

Defines runtime behavior for canonical artifact resolution.

---

# RESOLVER INPUT

```json
{
  "artifact_id": "STD_HANDOFF_ARTIFACT_STANDARD",
  "required_layer": "PROTOCOL",
  "runtime_context": "GATEKEEPER_REVIEW"
}
```

---

# RESOLVER STEPS

1. Load ACTIVE_CANONICAL_REGISTRY
2. Find artifact_id
3. Verify artifact_status is runtime-loadable
4. Verify content_sha256 exists
5. Fetch canonical_path
6. Compute actual SHA
7. Compare actual SHA with registry SHA
8. Resolve dependencies
9. Verify no conflict queue entry blocks artifact
10. Return artifact package

---

# RESOLVER OUTPUT

```json
{
  "resolution_status": "RESOLVED",
  "artifact_id": "",
  "version": "",
  "content_sha256": "",
  "canonical_path": "",
  "dependencies": [],
  "runtime_load_allowed": true
}
```

---

# BLOCK OUTPUT

```json
{
  "resolution_status": "BLOCKED",
  "artifact_id": "",
  "blocking_rule": "",
  "required_action": ""
}
```

---

# FORBIDDEN FALLBACKS

Resolver MUST NOT:
- load newest file
- load filename match without registry
- ignore SHA mismatch
- load superseded artifact
- auto-resolve same-version drift

---

# NEXT ACTIONS

## Immediate Next Step
- Implement resolver pseudo-runtime in n8n or script form.

## Required Inputs
- Registry draft
- SHA values
- conflict queue

## Recommended Owner
- Architect

## Blocking Conditions
- Registry missing
- unresolved conflict queue
- SHA mismatch

## Suggested Next Package
- n8n Resolver Workflow Contract
