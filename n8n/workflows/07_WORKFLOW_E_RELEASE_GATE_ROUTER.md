# 07_WORKFLOW_E_RELEASE_GATE_ROUTER

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for routing release packages through proper gates.

---

# CORE LAW

n8n routes gates.

n8n does not grant gates.

---

# INPUT

```json
{
  "package_id": "",
  "validation_status": "",
  "gatekeeper_verdict": "",
  "requested_transition": ""
}
```

---

# NODE SEQUENCE

1. Receive release package status
2. Verify validation status
3. Check requested transition
4. Check allowed transition owner
5. Route to Gatekeeper / Governance Relay / Human
6. Emit gate routing report

---

# ROUTING RULES

DRAFT -> REVIEW_READY:
- allowed route to Gatekeeper

REVIEW_READY -> PASS/BLOCKED:
- Gatekeeper only

PASS -> APPLY_READY:
- Governance Relay only

APPLY_READY -> APPLIED:
- Governance Relay / Human only

---

# FORBIDDEN

- n8n setting PASS
- n8n setting APPLIED
- n8n bypassing Gatekeeper
- n8n applying registry patch

---

# NEXT ACTIONS

## Immediate Next Step
- Connect Release Gate Router to Package Validator output only.

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
