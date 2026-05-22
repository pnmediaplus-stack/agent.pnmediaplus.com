# 03_WORKFLOW_A_ARTIFACT_INTAKE

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for ingesting new governance artifacts.

---

# TRIGGER OPTIONS

- manual upload
- folder watch
- Git webhook
- scheduled scan

---

# NODE SEQUENCE

1. Trigger
2. Read file
3. Extract filename
4. Extract metadata header
5. Compute SHA256
6. Classify artifact
7. Check required fields
8. Emit intake report

---

# REQUIRED OUTPUT

```json
{
  "workflow": "ARTIFACT_INTAKE",
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

# CLASSIFICATIONS

- REGISTRY_READY
- NEEDS_METADATA_PATCH
- DUPLICATE_CANDIDATE
- SAME_VERSION_DIFFERENT_SHA
- SHADOW_CANDIDATE
- SUPERSEDED_REFERENCE
- INVALID_METADATA

---

# BLOCK CONDITIONS

- missing artifact_id
- missing artifact_status
- missing constitutional_layer
- cannot compute SHA
- same-version different SHA

---

# ROUTING

REGISTRY_READY:
- route to Registry Resolver

NEEDS_METADATA_PATCH:
- route to Architect / Governance Relay

SAME_VERSION_DIFFERENT_SHA:
- route to Gatekeeper

SHADOW_CANDIDATE:
- route to Governance Relay for classification

---

# NEXT ACTIONS

## Immediate Next Step
- Build Artifact Intake workflow first and test with copied sample files only.

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
