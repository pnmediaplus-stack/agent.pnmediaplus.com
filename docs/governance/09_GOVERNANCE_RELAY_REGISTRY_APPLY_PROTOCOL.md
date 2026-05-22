# 09_GOVERNANCE_RELAY_REGISTRY_APPLY_PROTOCOL

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines how Governance Relay applies approved registry changes.

---

# RELAY MAY

- normalize registry patch format
- apply approved ACTIVE entries
- mark superseded files
- mark shadow files
- record conflict resolution
- produce registry changelog

---

# RELAY MUST NOT

- choose active artifact without review
- override Gatekeeper block
- delete lineage
- mutate constitutional law
- apply unresolved conflict

---

# APPLY SEQUENCE

1. Receive Gatekeeper-reviewed registry patch
2. Verify verdict permits apply
3. Apply registry entry changes
4. Preserve superseded/shadow records
5. Write registry changelog
6. Emit updated registry package

---

# REGISTRY CHANGELOG RECORD

```yaml
change_id:
applied_by:
applied_at:
affected_artifacts:
previous_status:
new_status:
gatekeeper_verdict:
notes:
```

---

# NEXT ACTIONS

## Immediate Next Step
- Apply only registry patches with Gatekeeper approval.

## Required Inputs
- Gatekeeper verdict
- registry patch proposal
- conflict queue disposition

## Recommended Owner
- Governance Relay

## Blocking Conditions
- Gatekeeper block
- unresolved conflict
- missing changelog

## Suggested Next Package
- Runtime Resolver Test Plan
