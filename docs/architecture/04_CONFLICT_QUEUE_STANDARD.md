# 04_CONFLICT_QUEUE_STANDARD

status: ACTIVE
layer: ARTIFACT
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines how unresolved registry conflicts are isolated before approval.

---

# CONFLICT TYPES

- DUPLICATE_ACTIVE_AUTHORITY
- SAME_VERSION_DIFFERENT_SHA
- SAME_SHA_MULTIPLE_FILENAMES
- MISSING_ARTIFACT_ID
- MISSING_OWNER_AUTHORITY
- SUPERSESSION_AMBIGUITY
- LOWER_LAYER_REDEFINITION
- ROLE_CAPABILITY_OVERREACH

---

# CONFLICT QUEUE RECORD

```yaml
conflict_id:
artifact_id:
files_involved:
conflict_type:
severity:
blocking_rule:
recommended_action:
owner:
status:
```

---

# SEVERITY LEVELS

- INFO
- WARNING
- HIGH
- CRITICAL

---

# REQUIRED ACTIONS BY CONFLICT TYPE

## SAME_VERSION_DIFFERENT_SHA

Action:
- BLOCK
- compare content
- select active candidate
- mark others SHADOW or SUPERSEDED
- bump version if both are valid divergent descendants

---

## SAME_SHA_MULTIPLE_FILENAMES

Action:
- keep one canonical path
- classify others SHADOW_REFERENCE
- runtime_load_allowed: false

---

## LOWER_LAYER_REDEFINITION

Action:
- block runtime
- add import reference
- remove or override false authority claim through metadata

---

# NEXT ACTIONS

## Immediate Next Step
- Create conflict queue from the active candidate table.

## Required Inputs
- Duplicate inventory
- SHA comparison results
- Layer classification

## Recommended Owner
- Gatekeeper validates
- Governance Relay normalizes

## Blocking Conditions
- Critical conflict unresolved
- duplicate SUPREME authority

## Suggested Next Package
- Resolver Runtime Algorithm
