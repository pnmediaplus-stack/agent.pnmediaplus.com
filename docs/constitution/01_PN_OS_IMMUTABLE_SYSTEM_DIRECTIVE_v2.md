# PN OS IMMUTABLE SYSTEM DIRECTIVE v2

status: ALWAYS_BINDING
layer: CONSTITUTION
authority_level: SUPREME
artifact_id: PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
version: 2.0.0
artifact_status: ACTIVE
freeze_status: IMMUTABLE
redefinition_policy: IMPORT_ONLY

---

# Unified Core Law for PN OS SaaS

Purpose:
This directive defines the non-negotiable system laws of PN OS.

All agents, developers, reviewers, and governance roles must obey this directive.

It may be extended or clarified by newer domain documents, but its core principles may not be weakened or overridden.

---

# I. SYSTEM POWER STRUCTURE

Roles:

- CEO = business vision and final executive override
- Governance Relay = directive normalization and final apply gate
- Architect = design and implementation logic
- Gatekeeper = runtime safety, QA, and constitutional enforcement

Rules:

- Architect must not bypass Gatekeeper
- Gatekeeper must not redesign the system
- Governance Relay must not implement code
- No role may weaken core law for speed

---

# II. AUTHORITY MATRIX

System authority is fixed as follows:

- WordPress / Control Plane = pricing, VAT, billing policy authority
- Supabase = SSOT for state, wallet truth, ledger truth, ownership truth as defined by table law
- Next.js API = ingress, orchestration, enforcement boundary
- UI = thin shell only
- n8n = execution only, never business authority

Forbidden:

- UI computes pricing, VAT, billing, quota, or execution authority
- API hardcodes pricing or VAT when authority belongs to Control Plane
- n8n decides business truth or financial truth
- client payload acts as authority
- read-model acts as truth outside its allowed role

---

# III. FINANCIAL IMMUTABLE LAW

Financial correctness has top priority.

Rules:

- Refund never recalculates
- All wallet mutation must go through Supabase RPC
- wallet_ledger is immutable financial truth
- wallets is runtime balance truth
- parse fail in financial logic must reject, never fallback to 0
- pricing policy originates from Control Plane and is resolved server-side
- Credits are display-only abstraction, not financial truth
- redirect authority for checkout must be server-owned
- idempotency must be explicit and deterministic

Forbidden:

- recalculate refund from current price
- UI billing logic
- client-side checkout composition
- wallet mutation outside approved RPC layer
- fallback that changes money truth

---

# IV. IDENTITY AND OWNERSHIP LAW

Rules:

- identity must come from trusted server-side ingress
- client-provided user_id, tenant, role, ownership are not authority
- ownership must be verified before action or delivery
- ambiguous identity mapping must block financial mutation
- browser state is not identity authority

Forbidden:

- trust client identity
- verify ownership after protected action
- infer ownership from catalog, visibility, or display layer

---

# V. DATA TRUTH LAW

Rules:

- Supabase tables hold truth according to defined ownership
- read-model, analytics, snapshots, and dashboards are not business authority unless explicitly defined
- wallets and wallet_ledger must not be swapped in read surfaces
- catalog is metadata, not ownership truth
- malformed financial/read-model rows must be rejected, not silently repaired in UI

---

# VI. EXECUTION LAW

Rules:

- execution must respect ingress and queue boundaries
- UI must not bypass queue or workers
- n8n executes only after the authoritative boundary has prepared the correct state
- runtime state transitions must stay within defined lifecycle rules

Forbidden:

- direct frontend to worker execution
- n8n writing business truth outside allowed boundary
- execution before required financial or authority checks

---

# VII. ENGINEERING SAFETY LAW

Rules:

- Thin Shell architecture is mandatory
- page.tsx remains assembly-oriented
- wrapped API contract is mandatory
- service-role access must use canonical singleton authority
- no pseudo-abstraction that hides singleton authority
- no hardcoded secret, endpoint, or authority domain
- no revival of previously known incident anti-patterns

---

# VIII. I18N AND PRESENTATION LAW

Rules:

- no hardcoded UI text
- EN and VI must maintain parity
- raw domain values must not leak through fallback UI
- unit labels must come from dictionary authority
- UI only displays authority-owned values and never computes them

---

# IX. DYNAMIC LAW LOADING LAW

AGENT_CONTEXT_INDEX is the mandatory routing authority for context loading.

Rules:

- agents must determine domain before deep review or implementation
- mandatory docs for that domain must be loaded before final judgment
- missing mandatory docs makes PASS or APPLY impossible

Priority:

1. Immutable System Directive v2
2. AGENT_CONTEXT_INDEX loading mandates
3. current domain docs
4. source code
5. decision history
6. user instruction
7. assumptions

---

# X. STEP-GATE LAW

All system changes must follow:

1. Source verified
2. Directive or plan clarified
3. Implementation labeled
4. Gatekeeper review enforced
5. Final apply gate cleared

Forbidden:

- code without sufficient source
- apply without Gatekeeper on safety-sensitive change
- skip mandatory docs
- fix later mentality for law-level risks

---

# XI. FAIL-FAST LAW

The system must stop when critical authority elements are missing.

Mandatory stop conditions:

- missing pricing authority source
- missing VAT authority source
- missing wallet mutation authority
- missing ownership validation
- missing idempotency identity
- missing redirect authority
- missing queue ingress authority
- missing refund snapshot dependency

Forbidden:

- temporary workaround
- hardcode for speed
- deploy first, review later

---

# XII. FINAL PRINCIPLE

A change is never considered safe merely because it works.

PN OS is considered operationally acceptable only when:

- money is correct
- identity is correct
- ownership is correct
- execution is deterministic
- authority boundaries are preserved
- auditability is preserved
- UI has zero business authority

---

# NEXT ACTIONS

## Immediate Next Step
- Load `02_ACTIVE_CONSTITUTION_SET.md`.

## Blocking Conditions
- Any downstream artifact attempts to weaken this directive.
