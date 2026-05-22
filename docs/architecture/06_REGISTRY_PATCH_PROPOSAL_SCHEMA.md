# 06_REGISTRY_PATCH_PROPOSAL_SCHEMA

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines the safe proposal format for changing registry contents.

Registry changes must be proposed before they are applied.

---

# PATCH PROPOSAL SCHEMA

```yaml
proposal_id:
proposal_type:
submitted_by:
affected_artifacts:
change_summary:
registry_entries_to_add:
registry_entries_to_update:
registry_entries_to_deactivate:
conflicts_resolved:
conflicts_remaining:
gatekeeper_review_required: true
governance_relay_apply_required: true
```

---

# PROPOSAL TYPES

- ADD_ACTIVE_ARTIFACT
- SUPERSEDE_ARTIFACT
- MARK_SHADOW
- REVOKE_ARTIFACT
- UPDATE_SHA
- UPDATE_DEPENDENCY
- RESOLVE_CONFLICT

---

# REQUIRED REVIEW

All registry patch proposals require:
- Gatekeeper review
- Governance Relay normalization
- Human/apply gate if constitutional layer affected

---

# INVALID PATCH

Patch invalid if:
- it silently changes ACTIVE artifact
- it removes audit lineage
- it deletes shadow artifact without archive
- it changes SHA without version note

---

# NEXT ACTIONS

## Immediate Next Step
- Use this schema for every registry mutation proposal.

## Required Inputs
- Candidate table
- conflict queue
- resolver output

## Recommended Owner
- Governance Relay

## Blocking Conditions
- No Gatekeeper review
- Missing conflict disposition
- Constitutional artifact change without explicit review

## Suggested Next Package
- Gatekeeper Registry Review Checklist
