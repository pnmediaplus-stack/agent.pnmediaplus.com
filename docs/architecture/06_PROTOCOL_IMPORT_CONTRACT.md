# 06_PROTOCOL_IMPORT_CONTRACT

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Defines how lower-layer artifacts import upper-layer authority without redefining it.

---

# REQUIRED IMPORT BLOCK

Every lower-layer artifact must include:

```yaml
imports:
  - artifact_id: PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
    import_type: CONSTITUTIONAL_AUTHORITY
  - artifact_id: STD_STATE_GATE_TAXONOMY
    import_type: PROTOCOL_AUTHORITY
```

---

# IMPORT TYPES

- CONSTITUTIONAL_AUTHORITY
- PROTOCOL_AUTHORITY
- RUNTIME_AUTHORITY
- CAPABILITY_AUTHORITY
- ARTIFACT_DEPENDENCY

---

# IMPORT RULES

Imported artifact:
- remains authority
- must not be copied as new authority
- must be resolved by registry
- must be loaded by artifact_id, not filename

---

# FORBIDDEN

- inline duplicate of full upper-layer law without import declaration
- redefining imported terms
- changing meaning of imported state/gate labels
- using imported authority to claim new role power

---

# SAFE EXTENSION

Allowed:
- "This workflow uses PASS/BLOCKED as defined by STD_STATE_GATE_TAXONOMY."

Forbidden:
- "This workflow defines PASS/BLOCKED as..."


---

# NEXT ACTIONS

## Immediate Next Step
- Apply import block to every RUNTIME, WORKFLOW, CAPABILITY, and IMPLEMENTATION artifact.

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
