# 02_GOVERNANCE_AUTOMATION_TOPOLOGY

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

Defines the full n8n governance automation topology.

---

# WORKFLOW MAP

```text
Artifact Intake
  ↓
SHA Generation
  ↓
Metadata Parser
  ↓
Registry Resolver
  ↓
Conflict Classifier
  ↓
Package Validator
  ↓
Drift Detector
  ↓
Release Gate Router
  ↓
Handoff Builder
  ↓
Notification / Escalation
```

---

# WORKFLOW OWNERSHIP

| Workflow | Owner | Authority |
|---|---|---|
| Artifact Intake | n8n | Execution only |
| Registry Resolver | n8n + Registry | Registry is authority |
| Package Validator | n8n | Mechanical validation |
| Drift Detector | n8n | Detection only |
| Release Gate Router | n8n | Routing only |
| Handoff Builder | n8n | Draft generation only |
| Apply Gate | Governance Relay | Apply authority |
| Review Gate | Gatekeeper | Review authority |

---

# STORAGE TARGETS

Recommended:
- registry source: Git / controlled storage / governance folder
- reports: `/reports`
- handoffs: `/handoffs`
- drift logs: `/drift`
- release package outputs: `/release_packages`

---

# AUTOMATION LAW

Every automation must produce an audit artifact.

No silent validation.

No silent apply.

---

# NEXT ACTIONS

## Immediate Next Step
- Implement topology as separate workflows, not one monolithic n8n flow.

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
