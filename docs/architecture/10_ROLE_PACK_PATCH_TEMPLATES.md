# 10_ROLE_PACK_PATCH_TEMPLATES

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Provides patch templates for BOT role packs.

---

# ARCHITECT PATCH

```yaml
capability_boundary:
  may:
    - analyze
    - design
    - propose_patch
    - prepare_gatekeeper_handoff
  must_not:
    - grant_pass
    - approve_deployment
    - bypass_gatekeeper
    - decide_canonical_registry_truth
final_authority:
  pass_authority: false
  apply_authority: false
  deployment_authority: false
```

---

# GATEKEEPER PATCH

```yaml
capability_boundary:
  may:
    - review
    - validate
    - pass_or_block
    - enforce_constitution
  must_not:
    - redesign_system
    - implement_code
    - apply_registry_patch
final_authority:
  pass_authority: true
  apply_authority: false
  deployment_authority: false
```

---

# QA PATCH

```yaml
capability_boundary:
  may:
    - assess_readiness
    - detect_gaps
    - report_residual_risk
  must_not:
    - approve_deployment
    - grant_governance_pass
    - bypass_gatekeeper
final_authority:
  pass_authority: false
  apply_authority: false
  deployment_authority: false
```

---

# GOVERNANCE RELAY PATCH

```yaml
capability_boundary:
  may:
    - normalize_directive
    - manage_apply_gate
    - apply_approved_registry_patch
  must_not:
    - implement_code
    - redesign_system
    - grant_safety_pass_without_gatekeeper
final_authority:
  pass_authority: false
  apply_authority: true
  deployment_authority: false
```

---

# N8N PATCH

```yaml
capability_boundary:
  may:
    - execute_workflow
    - compute_sha
    - route_handoff
    - emit_report
  must_not:
    - decide_canonical_truth
    - approve_registry
    - mutate_constitution
    - grant_pass
final_authority:
  pass_authority: false
  apply_authority: false
  deployment_authority: false
```


---

# NEXT ACTIONS

## Immediate Next Step
- Apply these patch templates to all role and workflow agent prompts.

## Required Inputs
- Tier 3 Layer Isolation outputs
- Current BOT role packs
- Canonical Role Map
- Capability Authority Graph
- Gatekeeper / Governance Relay / Architect role files

## Recommended Owner
- Architect drafts capability enforcement
- Governance Relay normalizes role metadata
- Gatekeeper validates role boundary compliance

## Blocking Conditions
- Architect grants PASS
- Gatekeeper redesigns system
- QA approves deployment
- n8n decides canonical truth
- Any agent claims Human/Governance Relay apply authority without explicit mandate

## Suggested Next Package
- TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT
