# 09_LAYER_MIGRATION_PATCH_TEMPLATES

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Provides metadata patches for enforcing layer isolation.

---

# RUNTIME PATCH TEMPLATE

```yaml
---
artifact_id: EXECUTION_SPEC
constitutional_layer: RUNTIME
authority_level: RUNTIME
redefinition_policy: EXTEND_ONLY
imports:
  - artifact_id: PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
    import_type: CONSTITUTIONAL_AUTHORITY
  - artifact_id: STD_STATE_GATE_TAXONOMY
    import_type: PROTOCOL_AUTHORITY
  - artifact_id: STD_HANDOFF_ARTIFACT_STANDARD
    import_type: PROTOCOL_AUTHORITY
runtime_override_allowed: false
lower_layer_redefinition_allowed: false
---
```

---

# WORKFLOW PATCH TEMPLATE

```yaml
---
artifact_id: WORKFLOW_ORCHESTRATION_DASHBOARD
constitutional_layer: WORKFLOW
authority_level: WORKFLOW
redefinition_policy: EXTEND_ONLY
imports:
  - artifact_id: STD_STATE_GATE_TAXONOMY
    import_type: PROTOCOL_AUTHORITY
  - artifact_id: RUNTIME_LOAD_ENFORCEMENT
    import_type: RUNTIME_AUTHORITY
runtime_load_allowed: true
lower_layer_redefinition_allowed: false
---
```

---

# ROLE PACK PATCH TEMPLATE

```yaml
---
artifact_id: BOT_PN_OS_ARCHITECT
constitutional_layer: CAPABILITY
authority_level: LOCAL
redefinition_policy: EXTEND_ONLY
imports:
  - artifact_id: PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
    import_type: CONSTITUTIONAL_AUTHORITY
  - artifact_id: STD_CANONICAL_ROLE_MAP
    import_type: CAPABILITY_AUTHORITY
  - artifact_id: CAPABILITY_AUTHORITY_GRAPH
    import_type: CAPABILITY_AUTHORITY
capability_boundary:
  may:
    - analyze
    - design
    - propose_patch
  must_not:
    - grant_pass
    - approve_deployment
    - bypass_gatekeeper
    - redefine_constitution
---
```

---

# SHADOW PATCH TEMPLATE

```yaml
---
artifact_status: SHADOW
runtime_load_allowed: false
shadow_reason:
  - lower_layer_redefinition_risk
  - unresolved_lineage
requires_review: true
---
```


---

# NEXT ACTIONS

## Immediate Next Step
- Use these patch templates to migrate lower-layer artifacts without rewriting body content.

## Required Inputs
- Active Canonical Registry draft
- Corpus metadata from Tier 1.5
- Registry population/conflict queue from Tier 2.5
- Current runtime/workflow/role pack files

## Recommended Owner
- Architect prepares enforcement design
- Governance Relay normalizes corpus changes
- Gatekeeper validates violations and blocks unsafe artifacts

## Blocking Conditions
- Lower-layer file redefines constitutional law
- Role pack claims authority outside capability graph
- Runtime spec defines state/gate taxonomy instead of importing it
- Workflow pack mutates protocol semantics

## Suggested Next Package
- TIER_4_CAPABILITY_AUTHORITY_ENFORCEMENT
