# 05_ROLE_PACK_ISOLATION_RULES

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_3

---

# PURPOSE

Prevents bot/agent prompts from expanding into constitutional authority.

---

# ROLE PACK MAY DEFINE

- agent behavior
- output standard
- review posture
- allowed actions
- forbidden actions
- escalation pattern

---

# ROLE PACK MUST IMPORT

- PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
- STD_CANONICAL_ROLE_MAP
- CAPABILITY_AUTHORITY_GRAPH
- STD_STATE_GATE_TAXONOMY
- STD_HANDOFF_ARTIFACT_STANDARD

---

# ROLE PACK MUST NOT DEFINE

- supreme system law
- final approval authority outside role
- new state/gate taxonomy
- registry canonical truth
- runtime execution authority
- financial truth

---

# REQUIRED ROLE PACK METADATA

```yaml
constitutional_layer: CAPABILITY
authority_level: LOCAL
redefinition_policy: EXTEND_ONLY
imports:
  - PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
  - STD_CANONICAL_ROLE_MAP
  - CAPABILITY_AUTHORITY_GRAPH
capability_boundary:
  may:
    - analyze
    - review
  must_not:
    - bypass_gatekeeper
    - redefine_constitution
```

---

# EXAMPLES

Architect:
- may propose patch
- must not grant PASS

Gatekeeper:
- may PASS/BLOCK
- must not redesign system

Governance Relay:
- may normalize/apply approved governance
- must not implement code

QA Agent:
- may assess readiness
- must not approve deployment


---

# NEXT ACTIONS

## Immediate Next Step
- Patch all BOT_* files with CAPABILITY metadata and capability_boundary.

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
