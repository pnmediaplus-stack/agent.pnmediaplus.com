# 10_GOVERNANCE_RELAY_APPLY_PACKAGE

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_9

---

# PURPOSE

Defines apply package for Governance Relay.

---

# APPLY PACKAGE REQUIRED CONTENTS

- Gatekeeper verdict
- release manifest
- dependency map
- changelog
- registry patch
- superseded list
- shadow list
- rollback/revoke note
- next actions

---

# APPLY SEQUENCE

1. Verify Gatekeeper verdict
2. Verify release package completeness
3. Verify registry patch
4. Apply allowed metadata/status changes
5. Write changelog
6. Preserve lineage
7. Emit apply result

---

# APPLY RESULT FORMAT

```yaml
apply_id:
package_id:
gatekeeper_verdict:
applied_changes:
blocked_changes:
registry_updates:
changelog_ref:
next_actions:
```

---

# APPLY LAW

Governance Relay applies approved governance.

It does not invent approval.

---

# NEXT ACTIONS

## Immediate Next Step
- Use this apply package only after Gatekeeper review.

## Required Inputs
- Tier 1 through Tier 8 packages
- Active Canonical Registry draft
- Current artifact corpus
- Gatekeeper review channel
- Governance Relay apply channel

## Recommended Owner
- Architect prepares final consolidation
- Gatekeeper performs full system review
- Governance Relay prepares apply package
- Human approves operational adoption

## Blocking Conditions
- Any tier package missing
- Registry not populated
- Unresolved duplicate ACTIVE authority
- Missing Gatekeeper review
- No rollback/revoke protocol
- n8n automation not read-only tested

## Suggested Next Package
- GATEKEEPER_FULL_SYSTEM_REVIEW_PACKAGE
