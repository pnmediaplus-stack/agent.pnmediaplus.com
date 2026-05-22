# 02_ROLE_BOUNDARY_CONTRACT

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Defines mandatory capability contract fields for all PN OS role packs.

---

# REQUIRED ROLE CONTRACT

```yaml
role_id:
role_name:
constitutional_layer: CAPABILITY
authority_level: LOCAL
imports:
  - STD_CANONICAL_ROLE_MAP
  - CAPABILITY_AUTHORITY_MATRIX
capability_boundary:
  may:
  must:
  must_not:
  escalation_required_when:
final_authority:
  pass_authority: false
  apply_authority: false
  deployment_authority: false
```

---

# MAY

Actions the role is allowed to perform.

---

# MUST

Duties the role must perform when invoked.

---

# MUST_NOT

Hard prohibitions.

---

# ESCALATION_REQUIRED_WHEN

Conditions where the role must stop and escalate.

---

# FINAL_AUTHORITY

Must explicitly declare whether the role has:

- pass_authority
- apply_authority
- deployment_authority
- registry_apply_authority
- financial_authority

Default:
false

---

# DEFAULT DENY RULE

If authority is not explicitly granted:
- it is denied


---

# NEXT ACTIONS

## Immediate Next Step
- Add this role contract to every BOT_* prompt.

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
