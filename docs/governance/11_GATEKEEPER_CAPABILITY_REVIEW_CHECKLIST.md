# 11_GATEKEEPER_CAPABILITY_REVIEW_CHECKLIST

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Gatekeeper checklist for role capability enforcement.

---

# CHECKLIST

## 1. Role Identity

- [ ] role_id exists
- [ ] role imports STD_CANONICAL_ROLE_MAP
- [ ] role imports CAPABILITY_AUTHORITY_MATRIX

Fail:
- ROLE_IDENTITY_INCOMPLETE

---

## 2. Capability Boundary

- [ ] may defined
- [ ] must_not defined
- [ ] final_authority declared
- [ ] no implicit authority expansion

Fail:
- CAPABILITY_BOUNDARY_MISSING

---

## 3. Forbidden Authority

- [ ] Architect does not grant PASS
- [ ] Gatekeeper does not redesign
- [ ] QA does not approve deploy
- [ ] Governance Relay does not implement code
- [ ] n8n does not decide canonical truth

Fail:
- ROLE_AUTHORITY_CREEP

---

## 4. Transition Safety

- [ ] role does not perform forbidden transitions
- [ ] role escalates when required
- [ ] role does not self-certify

Fail:
- ROLE_TRANSITION_VIOLATION

---

## 5. Output Labels

- [ ] role output uses permitted verdict/status only
- [ ] role does not use unauthorized PASS/APPLY labels

Fail:
- UNAUTHORIZED_VERDICT_LABEL

---

# ALLOWED VERDICTS

- CAPABILITY_PASS
- CONDITIONAL_PASS_WITH_ROLE_PATCH
- BLOCKED_BY_ROLE_CREEP
- BLOCKED_BY_FORBIDDEN_TRANSITION
- INVALID_FOR_RUNTIME
- NEED_MORE_SOURCE

---

# REVIEW OUTPUT TEMPLATE

```text
Verdict:
Role Reviewed:
Capability Boundary:
Forbidden Transition Check:
Authority Creep Findings:
Required Patch:
Residual Risk:
```


---

# NEXT ACTIONS

## Immediate Next Step
- Use this checklist before any role pack becomes runtime-loadable.

## Required Inputs
- Tier 3 Layer Isolation outputs
- Current BOT role packs
- Canonical Role Map
- Capability Authority Graph
- Gatekeeper / Governance Relay / Architect role files

## Recommended Owner
- Architect drafts capability enforcement
- Governance Relay normalizes role metadata
- Gatekeeper validates role boundary compliance

## Blocking Conditions
- Architect grants PASS
- Gatekeeper redesigns system
- QA approves deployment
- n8n decides canonical truth
- Any agent claims Human/Governance Relay apply authority without explicit mandate

## Suggested Next Package
- TIER_5_PROTOCOL_GATE_STATE_ENFORCEMENT
