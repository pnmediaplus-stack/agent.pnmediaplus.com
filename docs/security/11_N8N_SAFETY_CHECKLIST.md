# 11_N8N_SAFETY_CHECKLIST

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_7

---

# PURPOSE

Safety checklist before enabling any n8n governance workflow.

---

# CHECKLIST

## 1. Authority Boundary

- [ ] workflow says n8n is execution-only
- [ ] workflow does not approve canonical truth
- [ ] workflow does not apply registry patch
- [ ] workflow does not emit PASS

Fail:
- AUTOMATION_AUTHORITY_DRIFT

---

## 2. Registry Safety

- [ ] workflow reads registry
- [ ] workflow does not bypass registry
- [ ] SHA verification exists
- [ ] missing registry blocks execution

Fail:
- REGISTRY_BYPASS

---

## 3. Fail-Closed Behavior

- [ ] SHA mismatch blocks
- [ ] duplicate ACTIVE blocks
- [ ] missing metadata blocks
- [ ] unknown artifact blocks

Fail:
- UNSAFE_FALLBACK

---

## 4. Auditability

- [ ] every run emits report
- [ ] every block has reason
- [ ] every escalation has owner
- [ ] every handoff has next actions

Fail:
- AUDIT_GAP

---

## 5. Human/Gatekeeper Path

- [ ] Gatekeeper route exists
- [ ] Governance Relay route exists
- [ ] Human approval route exists where required

Fail:
- MISSING_REVIEW_PATH

---

# ENABLEMENT VERDICT

Allowed:
- N8N_DRAFT_READY
- N8N_TEST_READY
- N8N_BLOCKED
- N8N_RUNTIME_READY_AFTER_GATEKEEPER

---

# NEXT ACTIONS

## Immediate Next Step
- Run this checklist before enabling any workflow beyond draft mode.

## Required Inputs
- Tier 2 registry kernel
- Tier 2.5 registry population/resolver runtime
- Tier 3 layer isolation enforcement
- Tier 4 capability authority enforcement
- Tier 5 protocol gate/state enforcement
- Tier 6 artifact package/release enforcement
- n8n instance or workflow builder environment

## Recommended Owner
- Automation Architect designs n8n workflows
- Governance Relay owns apply-gate routing
- Gatekeeper validates automation safety
- Human approves runtime enablement

## Blocking Conditions
- Registry is not populated
- SHA validation unavailable
- Gatekeeper review path missing
- n8n attempts to decide canonical truth
- n8n applies release without approved gate

## Suggested Next Package
- TIER_8_RUNTIME_ROLLOUT_AND_OPERATIONS
