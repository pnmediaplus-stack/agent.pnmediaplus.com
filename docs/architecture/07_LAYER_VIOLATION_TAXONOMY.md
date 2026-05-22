# 07_LAYER_VIOLATION_TAXONOMY

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Standardizes violation codes for layer isolation enforcement.

---

# VIOLATION CODES

## LAYER_MISSING

Artifact has no declared layer.

Severity:
- HIGH

---

## UPPER_LAYER_REDEFINITION

Lower layer defines upper-layer authority.

Severity:
- CRITICAL

---

## PROTOCOL_REDEFINITION

Non-protocol artifact defines state/gate/handoff/verdict schema.

Severity:
- HIGH

---

## ROLE_AUTHORITY_CREEP

Role pack claims authority outside capability graph.

Severity:
- HIGH

---

## RUNTIME_AUTHORITY_CREEP

Workflow or role pack claims runtime authority.

Severity:
- HIGH

---

## WORKFLOW_AS_CONSTITUTION

Workflow doc uses always-binding constitutional language.

Severity:
- CRITICAL

---

## IMPORT_MISSING

Lower-layer artifact uses upper-layer concepts without declaring imports.

Severity:
- MEDIUM

---

## REGISTRY_BYPASS

Artifact resolution occurs without registry.

Severity:
- CRITICAL

---

# REQUIRED OUTPUT

Every violation report must include:

- violation_code
- artifact_id
- file
- evidence_snippet
- severity
- recommended_fix
- blocking_status


---

# NEXT ACTIONS

## Immediate Next Step
- Use this taxonomy in Gatekeeper enforcement reports.

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
