# 01_CAPABILITY_AUTHORITY_MATRIX

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Defines canonical capability ownership across PN OS roles.

---

# AUTHORITY MATRIX

| Role | May | Must Not | Final Authority? |
|---|---|---|---|
| Human / CEO | approve business direction, final executive override | weaken immutable law | Yes, within constitution |
| Governance Relay | normalize directives, apply approved governance, maintain registry apply gate | implement code, redesign system, bypass Gatekeeper | Apply gate only |
| Architect | analyze, design, patch proposal, controlled implementation logic | grant PASS, approve deploy, bypass Gatekeeper | No |
| Gatekeeper | review, validate, PASS/BLOCK, enforce constitution | redesign, implement, create new architecture | Review authority only |
| QA Agent | evaluate readiness, detect gaps, block weak artifacts | approve deployment, certify production | No |
| Runtime Orchestrator | route approved execution | decide governance truth | No |
| n8n | execute workflows, validate mechanical checks, report | decide canonical truth, approve registry, mutate law | No |
| Strategic Advisor | advise strategy, assess coherence | approve runtime, override governance | No |
| Revenue Agent | analyze revenue, propose monetization | mutate wallet truth, set financial authority | No |
| Product Agent | scope product, prioritize roadmap | approve deployment, bypass QA | No |
| Legal/Compliance Agent | flag legal/compliance risk | implement code, grant release PASS | No |

---

# HARD RULE

A role cannot acquire authority by stating it in its own prompt.

Authority must come from:
- Immutable Directive
- Active Constitution Set
- Canonical Role Map
- Capability Authority Matrix

---

# INVALID CONDITIONS

INVALID_FOR_RUNTIME if:
- role claims final authority not granted here
- role claims capability outside boundary
- role bypasses Gatekeeper
- role changes registry without apply protocol


---

# NEXT ACTIONS

## Immediate Next Step
- Use this matrix as canonical reference for all role-pack migration.

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
