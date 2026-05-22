# 08_WORKFLOW_F_HANDOFF_BUILDER

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

n8n workflow for generating structured handoff drafts.

---

# INPUT SOURCES

- artifact intake report
- registry resolution report
- validation report
- drift report
- release gate report

---

# HANDOFF TYPES

- Gatekeeper Review Handoff
- Governance Relay Apply Handoff
- Architect Patch Handoff
- Human Approval Brief
- Drift Escalation Report

---

# REQUIRED HANDOFF FIELDS

- handoff_id
- source_artifacts
- registry_refs
- reviewed_scope
- verified_facts
- risks
- blocking_conditions
- requested_decision
- recommended_owner
- next_actions

---

# OUTPUT

```json
{
  "workflow": "HANDOFF_BUILDER",
  "handoff_type": "",
  "handoff_status": "DRAFT",
  "requested_decision": "",
  "next_owner": "",
  "blocking_conditions": []
}
```

---

# HARD RULE

n8n handoff is draft only.

Gatekeeper / Governance Relay / Human remain decision authorities.

---

# NEXT ACTIONS

## Immediate Next Step
- Use Handoff Builder to standardize all reports produced by other workflows.

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
