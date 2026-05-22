# 06_WORKFLOW_D_DRIFT_DETECTOR

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for scheduled governance drift detection.

---

# TRIGGER

Recommended:
- daily scheduled scan
- manual run before release
- Git change webhook

---

# NODE SEQUENCE

1. Load registry
2. Scan artifact folder
3. Compute SHA for registered artifacts
4. Detect unregistered artifacts
5. Detect duplicate artifact_id
6. Detect same-version different SHA
7. Detect superseded artifact still active
8. Detect role/capability label violations
9. Emit drift report

---

# DRIFT TYPES

- DUPLICATE_ACTIVE_AUTHORITY
- SAME_VERSION_DIFFERENT_SHA
- SHA_MISMATCH
- UNREGISTERED_ARTIFACT
- SUPERSEDED_STILL_ACTIVE
- SHADOW_RUNTIME_LOAD
- ROLE_AUTHORITY_CREEP
- PROTOCOL_LABEL_DRIFT

---

# OUTPUT

```json
{
  "workflow": "DRIFT_DETECTOR",
  "scan_id": "",
  "severity": "",
  "drift_items": [],
  "blocking_items": [],
  "recommended_route": ""
}
```

---

# SEVERITY

- INFO
- WARNING
- HIGH
- CRITICAL

Critical drift must route to Gatekeeper.

---

# NEXT ACTIONS

## Immediate Next Step
- Schedule Drift Detector only after manual validation passes.

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
