# 10_N8N_DATA_CONTRACTS

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_7

---

# PURPOSE

Defines machine-readable DTOs for n8n governance automation.

---

# ARTIFACT_INTAKE_REPORT

```json
{
  "artifact_id": "",
  "filename": "",
  "sha256": "",
  "metadata_status": "",
  "classification": "",
  "blocking_conditions": [],
  "next_route": ""
}
```

---

# REGISTRY_RESOLUTION_REPORT

```json
{
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

# VALIDATION_REPORT

```json
{
  "package_id": "",
  "validation_status": "",
  "passed_checks": [],
  "failed_checks": [],
  "blocking_rules": [],
  "warnings": []
}
```

---

# DRIFT_REPORT

```json
{
  "scan_id": "",
  "severity": "",
  "drift_items": [],
  "blocking_items": [],
  "recommended_route": ""
}
```

---

# GATE_ROUTING_REPORT

```json
{
  "package_id": "",
  "current_state": "",
  "requested_transition": "",
  "allowed_owner": "",
  "routing_status": "",
  "next_owner": ""
}
```

---

# HANDOFF_DRAFT

```json
{
  "handoff_id": "",
  "handoff_type": "",
  "requested_decision": "",
  "verified_facts": [],
  "risks": [],
  "blocking_conditions": [],
  "next_actions": []
}
```

---

# NEXT ACTIONS

## Immediate Next Step
- Use these DTOs as n8n Set node schemas.

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
