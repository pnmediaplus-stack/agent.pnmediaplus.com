# 01_N8N_AUTHORITY_BOUNDARY

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_7

---

# PURPOSE

Defines hard boundaries for n8n in PN OS governance automation.

---

# N8N MAY

- ingest artifacts
- compute SHA256
- parse metadata
- validate registry references
- detect duplicate candidates
- check release package completeness
- generate reports
- route handoffs
- notify Gatekeeper / Governance Relay / Human

---

# N8N MUST NOT

- decide canonical truth
- choose ACTIVE artifact
- approve registry patch
- apply registry patch
- grant PASS
- approve deployment
- mutate constitutional law
- delete lineage artifacts
- auto-resolve same-version different-SHA conflicts

---

# SAFE OUTPUTS

n8n may emit:

- ARTIFACT_INTAKE_REPORT
- SHA_REPORT
- REGISTRY_RESOLUTION_REPORT
- VALIDATION_REPORT
- DRIFT_REPORT
- RELEASE_GATE_REPORT
- HANDOFF_DRAFT
- ESCALATION_NOTICE

---

# UNSAFE OUTPUTS

n8n must never emit:

- CANONICAL_APPROVED
- REGISTRY_APPLIED
- GOVERNANCE_PASS
- DEPLOY_APPROVED
- CONSTITUTION_UPDATED
- ARTIFACT_DELETED

---

# FAIL-CLOSED RULE

If n8n cannot determine safety, it must output:

```text
EXECUTION_BLOCKED
```

not:
```text
BEST_EFFORT_CONTINUE
```

---

# NEXT ACTIONS

## Immediate Next Step
- Use this boundary as the first node note in every n8n workflow.

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
