# 10_PROTOCOL_MIGRATION_PATCH_TEMPLATES

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_5

---

# PURPOSE

Provides patch templates to migrate lower-layer docs into protocol compliance.

---

# ROLE OUTPUT PATCH

```yaml
authorized_verdicts:
  - DESIGN_READY
  - PATCH_PROPOSED
  - NEED_MORE_SOURCE
  - GATEKEEPER_HANDOFF_READY
forbidden_verdicts:
  - PASS
  - DEPLOY_APPROVED
  - CANONICAL_APPROVED
```

---

# GATEKEEPER OUTPUT PATCH

```yaml
authorized_verdicts:
  - PASS
  - BLOCKED
  - NEED_MORE_SOURCE
  - CONDITIONAL_PASS
  - INVALID_FOR_RUNTIME
forbidden_outputs:
  - CODE_APPLIED
  - REGISTRY_APPLIED
  - DEPLOYED
```

---

# QA OUTPUT PATCH

```yaml
authorized_verdicts:
  - QA_READY
  - QA_BLOCKED
  - NEED_MORE_EVIDENCE
  - RESIDUAL_RISK_REPORTED
forbidden_outputs:
  - PRODUCTION_CERTIFIED
  - DEPLOY_APPROVED
  - GOVERNANCE_PASS
```

---

# HANDOFF PATCH

```yaml
handoff_required_fields:
  - handoff_id
  - source_artifacts
  - registry_refs
  - reviewed_scope
  - verified_facts
  - risks
  - blocking_conditions
  - requested_decision
  - next_actions
```

---

# ESCALATION PATCH

```yaml
escalation_required_when:
  - missing_mandatory_source
  - duplicate_active_authority
  - same_version_different_sha
  - role_boundary_conflict
  - lower_layer_redefinition
  - registry_bypass
```


---

# NEXT ACTIONS

## Immediate Next Step
- Apply these patches to role packs, workflow specs, and runtime handoff templates.

## Required Inputs
- Tier 2 / 2.5 registry artifacts
- Tier 3 layer isolation rules
- Tier 4 capability authority rules
- Current STD_STATE_GATE_TAXONOMY
- Current STD_HANDOFF_ARTIFACT_STANDARD
- Current Gatekeeper / QA / Architect output formats

## Recommended Owner
- Architect drafts protocol enforcement
- Governance Relay normalizes protocol references
- Gatekeeper validates protocol compliance

## Blocking Conditions
- Runtime/workflow/role pack defines its own state taxonomy
- Unauthorized verdict labels appear
- Handoff schema missing required fields
- Gate labels conflict across artifacts
- Protocol artifacts not registry-resolved

## Suggested Next Package
- TIER_6_ARTIFACT_PACKAGE_RELEASE_ENFORCEMENT
