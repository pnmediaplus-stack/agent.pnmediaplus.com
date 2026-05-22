# 11_GOVERNANCE_RELAY_RELEASE_APPLY_PROTOCOL

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_6

---

# PURPOSE

Defines how Governance Relay applies approved release packages.

---

# RELAY MAY

- normalize release metadata
- apply approved registry changes
- mark superseded artifacts
- write changelog
- emit applied package record
- route next actions

---

# RELAY MUST NOT

- apply blocked release
- implement code
- bypass Gatekeeper
- silently change release contents
- delete lineage

---

# APPLY SEQUENCE

1. Receive Gatekeeper release verdict
2. Verify verdict allows apply
3. Verify manifest/dependency/checklist/changelog exist
4. Apply registry updates
5. Mark superseded/shadow artifacts
6. Write changelog
7. Emit APPLY_RESULT
8. Route next actions

---

# APPLY RESULT

```yaml
apply_id:
package_id:
package_version:
applied_by:
applied_at:
gatekeeper_verdict:
registry_changes:
superseded:
shadowed:
rejected:
next_actions:
```

---

# BLOCK CONDITIONS

Relay must block if:
- Gatekeeper verdict missing
- package malformed
- changelog missing
- registry conflict unresolved
- release contains blocked artifact

---

# NEXT ACTIONS

## Immediate Next Step
- Use this apply protocol after Gatekeeper release PASS.

## Required Inputs
- Tier 2 / 2.5 registry outputs
- Tier 3 layer isolation outputs
- Tier 4 capability authority outputs
- Tier 5 protocol enforcement outputs
- Current STD manifest / dependency / release / validation artifacts

## Recommended Owner
- Architect designs package/release structure
- Governance Relay normalizes release records
- Gatekeeper validates release safety

## Blocking Conditions
- Missing manifest
- Missing dependency map
- Missing validation checklist
- Missing changelog
- Release includes SHADOW or SUPERSEDED artifact as ACTIVE
- Release references artifact not registry-resolved

## Suggested Next Package
- TIER_7_N8N_GOVERNANCE_AUTOMATION_RUNTIME
