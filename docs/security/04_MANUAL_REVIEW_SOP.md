# 04_MANUAL_REVIEW_SOP

status: ACTIVE
layer: OPERATIONS
authority_level: CORE
tier: TIER_8

---

# PURPOSE

Defines manual review operations for governance runtime.

---

# REVIEW OWNERS

| Review Type | Owner |
|---|---|
| Registry conflict | Gatekeeper + Governance Relay |
| Patch design | Architect |
| Runtime safety | Gatekeeper |
| Release apply | Governance Relay + Human |
| Capability drift | Gatekeeper |
| Protocol drift | Gatekeeper |

---

# REVIEW FLOW

1. Receive report
2. Verify source evidence
3. Check registry refs
4. Confirm SHA
5. Review blocking rules
6. Decide:
   - PASS
   - BLOCK
   - ESCALATE
   - NEED_MORE_SOURCE

---

# REVIEW LAW

No report becomes authoritative merely because automation generated it.

Human review remains mandatory for:
- registry apply
- constitutional changes
- production rollout

---

# NEXT ACTIONS

## Immediate Next Step
- Train reviewers to use structured review forms only.

## Required Inputs
- Tier 1–7 outputs
- Active Canonical Registry
- Initial populated conflict queue
- n8n instance
- Governance storage location
- Human operators for review loop

## Recommended Owner
- Architect coordinates rollout phases
- Governance Relay owns operational apply-gate
- Gatekeeper validates runtime safety
- Human approves production enablement

## Blocking Conditions
- Registry unresolved conflicts
- Missing Gatekeeper review workflow
- Missing rollback drill
- Missing audit logging
- n8n automation not fail-closed
- Production mutation enabled before read-only validation

## Suggested Next Package
- TIER_9_PRODUCTION_GOVERNANCE_OS
