# 06_ROLLBACK_REVOKE_PROTOCOL

status: ACTIVE
layer: ARTIFACT
authority_level: CORE
tier: TIER_6

---

# PURPOSE

Defines rollback and revoke rules for release packages.

---

# ROLLBACK VS REVOKE

## Rollback

Use when:
- applied release must return to previous valid version
- previous artifact remains valid

## Revoke

Use when:
- artifact is unsafe
- artifact authority is invalid
- artifact must not be runtime-loaded

---

# REQUIRED ROLLBACK RECORD

```yaml
rollback_id:
package_id:
target_previous_version:
reason:
affected_artifacts:
required_registry_changes:
gatekeeper_required: true
```

---

# REQUIRED REVOKE RECORD

```yaml
revoke_id:
artifact_id:
version:
content_sha256:
reason:
severity:
runtime_load_allowed: false
replacement_artifact:
gatekeeper_required: true
```

---

# EMERGENCY BLOCK

If constitutional or protocol release causes unsafe authority drift:
- mark release BLOCKED
- mark affected artifact REVOKED or SHADOW
- disable runtime_load_allowed
- escalate to Gatekeeper + Governance Relay

---

# NEXT ACTIONS

## Immediate Next Step
- Attach rollback/revoke notes to every release package.

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
