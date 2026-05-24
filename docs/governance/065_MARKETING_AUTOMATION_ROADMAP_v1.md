# 065_MARKETING_AUTOMATION_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** marketing automation roadmap  
**Purpose:** Define the governed order for turning approved marketing execution surfaces into queued, observable automation flows.

---

# 0. Roadmap Rule

This roadmap only applies to automation work that follows the department execution layer and the workflow build layer.

It must stay inside the canonical contracts completed in `061_MASTER_ROADMAP_v1.md`, `062_DEPARTMENT_EXECUTION_ROADMAP_v1.md`, `063_WORKFLOW_ORCHESTRATION_ROADMAP_v1.md`, and `064_N8N_WORKFLOW_BUILD_ROADMAP_v1.md`.

If automation conflicts with canonical governance, stop and review.

---

# 1. Automation Order

Run marketing automation in this order:

1. Queueable action inventory
2. Auto-post contract mapping
3. Lead funnel stage mapping
4. Dry-run automation paths
5. Controlled queued execution
6. Monitoring and escalation

---

# 2. Automation Rules

- automation must not decide canonical truth
- automation must not approve itself
- automation must not mutate source of truth
- automation must fail closed on missing fields, blocked states, or unknown ownership
- live automation requires explicit review before activation

---

# 3. Default Flow

- Marketing -> Media -> Operations -> Customer -> Business Truth
- Core Governance remains the escalation and reconciliation boundary

---

# 4. Exit Criteria

- queueable actions are explicit
- auto-post candidates are bounded
- lead funnel transitions are mapped
- dry-runs match canonical handoff contracts
- live queue execution stays controlled and observable
- drift and failures are reported, not auto-corrected

---

# 5. Stop Conditions

Stop and review if:

- an automation tries to publish without review
- a queue tries to approve itself
- a flow bypasses the handoff contract
- evidence, ownership, or target state is missing

## Phase Note

- Phase 064 closed on 2026-05-23 after Gatekeeper `PASS_WITH_MINOR_PATCH`.
- `phase064_n8n_workflow_contracts` is read-only, mutation false, authority false, and `controlled_live_observation` remains `BLOCKED_UNTIL_EXPLICIT_REVIEW`.
- Phase 065 starts from queueable marketing automation, auto-post contracts, and lead funnel routing only after governed contracts are explicit.
- Phase 065 scaffold completed on 2026-05-23; `phase065_marketing_automation` is read-only, fail-closed, and `controlled_queued_execution` remains `BLOCKED_UNTIL_EXPLICIT_REVIEW`.
