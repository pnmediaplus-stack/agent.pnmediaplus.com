# 064_N8N_WORKFLOW_BUILD_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** n8n workflow build roadmap  
**Purpose:** Define the governed order for building n8n workflows after validation, execution, and orchestration are complete.

---

# 0. Roadmap Rule

This roadmap only applies to workflow build work.

It must stay inside the canonical contracts completed in `061_MASTER_ROADMAP_v1.md`, `062_DEPARTMENT_EXECUTION_ROADMAP_v1.md`, and `063_WORKFLOW_ORCHESTRATION_ROADMAP_v1.md`.

If a workflow conflicts with canonical governance, stop and review.

---

# 1. Build Order

Run n8n build in this order:

1. Inventory workflow contracts
2. Map input and output between departments
3. Build read-only validation flows
4. Build dry-run flows
5. Build controlled live flows
6. Add monitoring and escalation

---

# 2. Build Rules

- n8n must not decide canonical truth
- n8n must not approve itself
- n8n must not mutate source of truth
- n8n must fail closed on missing fields, blocked states, or unknown ownership
- live workflows require explicit review before activation

---

# 3. Default Flow

- Marketing -> Media -> Operations -> Customer -> Business Truth
- Core Governance remains the escalation and reconciliation boundary

---

# 4. Exit Criteria

- workflow contracts are explicit
- read-only validation passes
- dry-runs match canonical handoff contracts
- live workflows stay controlled and observable
- drift and failures are reported, not auto-corrected

---

# 5. Stop Conditions

Stop and review if:

- a workflow tries to apply changes
- a runtime tries to approve itself
- a flow bypasses the handoff contract
- evidence, ownership, or target state is missing

## Phase Note

- Phase 064 closed on 2026-05-23 after Gatekeeper `PASS_WITH_MINOR_PATCH`.
- `phase064_n8n_workflow_contracts` is read-only, mutation false, authority false, and `controlled_live_observation` remains `BLOCKED_UNTIL_EXPLICIT_REVIEW`.
- Live activation stays intentionally blocked until explicit review and dependency readiness are confirmed.
