# 04_WORKFLOW_B_REGISTRY_RESOLVER

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for resolving artifacts through the Active Canonical Registry.

---

# INPUT

```json
{
  "artifact_id": "",
  "requested_context": "",
  "requesting_workflow": ""
}
```

---

# NODE SEQUENCE

1. Receive artifact_id
2. Load ACTIVE_CANONICAL_REGISTRY
3. Find active registry record
4. Fetch canonical artifact path
5. Compute SHA
6. Compare SHA with registry
7. Resolve dependencies
8. Check conflict queue
9. Emit resolution result

---

# OUTPUT

```json
{
  "workflow": "REGISTRY_RESOLVER",
  "artifact_id": "",
  "resolution_status": "",
  "version": "",
  "sha256": "",
  "canonical_path": "",
  "dependencies": [],
  "blocking_rule": ""
}
```

---

# RESOLUTION STATUS

- RESOLVED
- BLOCKED_SHA_MISMATCH
- BLOCKED_NOT_REGISTERED
- BLOCKED_SUPERSEDED
- BLOCKED_SHADOW
- BLOCKED_CONFLICT_QUEUE
- BLOCKED_DEPENDENCY_MISSING

---

# HARD RULE

This workflow resolves only.

It does not approve registry changes.

---

# NEXT ACTIONS

## Immediate Next Step
- Implement resolver using registry file as read-only input.

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
