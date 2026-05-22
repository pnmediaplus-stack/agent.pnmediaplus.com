# ARCHITECT_N8N_REQUIRED_SOURCE_LIST

status: ACTIVE
layer: RUNTIME
authority_level: CORE
artifact_id: ARCHITECT_N8N_REQUIRED_SOURCE_LIST
version: 1.0.0
artifact_status: ACTIVE
freeze_status: EVOLVING
redefinition_policy: EXTEND_ONLY

---

# PURPOSE

Defines the exact source files required before Architect n8n Builder may design any workflow.

This prevents source-light workflow design.

---

# GLOBAL REQUIRED SOURCES FOR ARCHITECT N8N BUILDER

Always provide:

1. `01_PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE_v2.md`
2. `02_ACTIVE_CONSTITUTION_SET.md`
3. `03_CONSTITUTIONAL_FREEZE_METADATA_STANDARD.md`
4. `04_ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP.md`
5. `05_GOVERNANCE_ROLE_AUTHORITY_MAP.md`

---

# WORKFLOW A — ARTIFACT INTAKE

Required additional sources:

6. `PN_OS_TIER_2_5_REGISTRY_POPULATION_RESOLVER_RUNTIME.zip`
7. `PN_OS_TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME.zip`

Recommended additional sources:

8. `PN_OS_TIER_3_LAYER_ISOLATION_ENFORCEMENT.zip`
9. `PN_OS_TIER_4_CAPABILITY_AUTHORITY_ENFORCEMENT.zip`
10. `PN_OS_TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT.zip`

Required sample artifacts:

11. One file missing metadata
12. One superseded artifact
13. One duplicate/candidate artifact
14. One canonical candidate artifact

---

# WORKFLOW B — REGISTRY RESOLVER

Required additional sources:

6. `PN_OS_TIER_2_CANONICAL_REGISTRY_KERNEL.zip`
7. `PN_OS_TIER_2_5_REGISTRY_POPULATION_RESOLVER_RUNTIME.zip`
8. `PN_OS_TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME.zip`

Required sample artifacts:

9. Active candidate registry table
10. Conflict queue sample
11. Artifact with SHA match
12. Artifact with SHA mismatch
13. Superseded artifact sample

---

# WORKFLOW C — PACKAGE VALIDATOR

Required additional sources:

6. `PN_OS_TIER_6_ARTIFACT_PACKAGE_RELEASE_ENFORCEMENT.zip`
7. `PN_OS_TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME.zip`

Required sample artifacts:

8. Release package sample
9. MANIFEST.md sample
10. DEPENDENCY_MAP.md sample
11. VALIDATION_CHECKLIST.md sample
12. CHANGELOG.md sample

---

# WORKFLOW D — DRIFT DETECTOR

Required additional sources:

6. `PN_OS_TIER_2_5_REGISTRY_POPULATION_RESOLVER_RUNTIME.zip`
7. `PN_OS_TIER_3_LAYER_ISOLATION_ENFORCEMENT.zip`
8. `PN_OS_TIER_4_CAPABILITY_AUTHORITY_ENFORCEMENT.zip`
9. `PN_OS_TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT.zip`
10. `PN_OS_TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME.zip`

Required sample artifacts:

11. Registry sample
12. Duplicate ACTIVE sample
13. Role creep sample
14. Protocol drift sample

---

# WORKFLOW E — RELEASE GATE ROUTER

Required additional sources:

6. `PN_OS_TIER_4_CAPABILITY_AUTHORITY_ENFORCEMENT.zip`
7. `PN_OS_TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT.zip`
8. `PN_OS_TIER_6_ARTIFACT_PACKAGE_RELEASE_ENFORCEMENT.zip`
9. `PN_OS_TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME.zip`

Required sample artifacts:

10. Gatekeeper verdict sample
11. Governance Relay apply package sample
12. Release package sample

---

# RULE

If required source is missing, Architect n8n Builder must output:

`NEED_MORE_SOURCE`

and must list exact missing files.

---

# NEXT ACTIONS

## Immediate Next Step
- Provide this pack to Architect n8n Builder together with workflow-specific Tier packages.

## Blocking Conditions
- Architect n8n Builder proceeds without exact required source list.
