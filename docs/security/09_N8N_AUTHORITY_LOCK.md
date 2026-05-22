# 09_N8N_AUTHORITY_LOCK

status: ACTIVE
layer: CAPABILITY
authority_level: CORE
tier: TIER_4

---

# PURPOSE

Locks n8n as execution-only.

---

# N8N MAY

- execute workflow
- call approved APIs
- compute SHA
- validate mechanical checks
- route handoffs
- emit reports
- run scheduled drift scans

---

# N8N MUST

- use registry-resolved artifacts
- preserve audit logs
- fail closed on authority conflict
- report unresolved conflicts
- keep execution deterministic

---

# N8N MUST NOT

- decide canonical truth
- apply registry changes
- approve governance changes
- mutate constitutional law
- bypass API / authority boundaries
- treat successful execution as PASS
- silently resolve duplicate artifacts

---

# N8N OUTPUT LIMIT

n8n may produce:
- EXECUTION_REPORT
- VALIDATION_REPORT
- DRIFT_REPORT
- REGISTRY_PATCH_PROPOSAL

n8n may not produce:
- CANONICAL_APPROVED
- REGISTRY_APPLIED
- GOVERNANCE_PASS
- DEPLOY_APPROVED


---

# NEXT ACTIONS

## Immediate Next Step
- Patch n8n workflow specs to declare execution-only authority.

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
