# 11_OPERATIONAL_METRICS

status: ACTIVE
layer: OPERATIONS
authority_level: CORE
tier: TIER_8

---

# PURPOSE

Defines metrics for governance runtime health.

---

# REQUIRED METRICS

## Registry Metrics

- active artifact count
- shadow artifact count
- unresolved conflict count
- SHA mismatch count

## Runtime Metrics

- workflow success rate
- workflow block rate
- escalation frequency
- report generation latency

## Governance Metrics

- Gatekeeper review turnaround
- release validation turnaround
- rollback drill success rate
- audit completion rate

## Drift Metrics

- drift incidents per week
- critical drift count
- role creep detections
- protocol drift detections

---

# METRIC LAW

Metrics are operational signals only.

Metrics are not governance authority.

---

# NEXT ACTIONS

## Immediate Next Step
- Start collecting baseline metrics during read-only rollout.

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
