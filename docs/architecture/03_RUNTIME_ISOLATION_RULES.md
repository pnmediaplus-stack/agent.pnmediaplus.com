# 03_RUNTIME_ISOLATION_RULES

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Locks runtime documents into runtime-only authority.

---

# RUNTIME MAY DEFINE

- execution sequence
- resolver behavior
- queue behavior
- runtime load checks
- automation safety conditions
- n8n runtime choreography

---

# RUNTIME MUST IMPORT

- PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
- ACTIVE_CONSTITUTION_SET
- STD_STATE_GATE_TAXONOMY
- STD_HANDOFF_ARTIFACT_STANDARD
- CAPABILITY_AUTHORITY_GRAPH

---

# RUNTIME MUST NOT DEFINE

- supreme law
- business authority matrix
- financial authority
- state/gate taxonomy
- role permission matrix
- final apply authority

---

# REQUIRED METADATA

```yaml
constitutional_layer: RUNTIME
authority_level: RUNTIME
redefinition_policy: EXTEND_ONLY
imports:
  - PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
  - STD_STATE_GATE_TAXONOMY
```

---

# VIOLATION EXAMPLES

Invalid:
- Execution Spec creates new PASS/BLOCKED taxonomy.
- Runtime doc says n8n may approve canonical artifact.
- Runtime resolver silently chooses newest file.

Valid:
- Runtime resolver blocks if registry says artifact is SHADOW.
- Runtime doc references state taxonomy by artifact_id.


---

# NEXT ACTIONS

## Immediate Next Step
- Patch runtime docs to import protocol instead of redefining protocol.

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
