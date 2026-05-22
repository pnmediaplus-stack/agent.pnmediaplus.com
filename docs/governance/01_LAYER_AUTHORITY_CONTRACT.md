# 01_LAYER_AUTHORITY_CONTRACT

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Defines what each PN OS layer may own and what it must not redefine.

---

# LAYER 1 — CONSTITUTION

Owns:
- immutable system laws
- authority matrix
- financial law
- identity/ownership law
- execution law
- fail-fast law

Must NOT contain:
- role-specific behavior
- workflow-specific steps
- implementation details

---

# LAYER 2 — PROTOCOL

Owns:
- state taxonomy
- gate taxonomy
- handoff protocol
- verdict schema
- escalation schema

Must NOT contain:
- runtime execution details
- campaign/marketing workflow steps
- individual bot personality

---

# LAYER 3 — RUNTIME

Owns:
- execution sequencing
- queue behavior
- resolver runtime
- load enforcement
- runtime safety checks

Must NOT redefine:
- constitutional law
- state taxonomy
- gate taxonomy
- role authority

---

# LAYER 4 — WORKFLOW

Owns:
- domain flow
- n8n process choreography
- operational routing
- business-process sequence

Must NOT redefine:
- constitutional law
- protocol schema
- runtime authority

---

# LAYER 5 — CAPABILITY

Owns:
- agent role behavior
- allowed actions
- forbidden actions
- output posture

Must NOT redefine:
- constitutional law
- protocol state/gate
- runtime load behavior
- final approval authority

---

# LAYER 6 — IMPLEMENTATION

Owns:
- code patches
- local scripts
- technical adapters

Must NOT redefine:
- any upper-layer authority

---

# LAYER 7 — ARTIFACT

Owns:
- manifests
- release packs
- dependency maps
- validation package metadata

Must NOT redefine:
- constitution
- protocol
- runtime authority

---

# UNIVERSAL RULE

Every artifact must answer:

```text
What layer am I?
What do I import?
What am I forbidden to define?
```


---

# NEXT ACTIONS

## Immediate Next Step
- Use this contract to classify every artifact in the corpus.

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
