# 053_DEPARTMENT_AUTHORITY_MATRIX_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Department authority matrix for PN OS multi-department operations  
**Purpose:** Define who owns what across departments so routing, approval, and handoff stay deterministic

---

# 0. Authority Rule

Departments own their own work products.
They do not own each other’s truth.

When department boundaries conflict, the higher authority and canonical source win.

---

# 1. Department Authority Matrix

| Department | Owns | May | Must Not | Final Authority |
|---|---|---|---|---|
| Executive / Human | business direction, final adoption, exceptions | approve, freeze, override strategically | weaken immutable law | final business authority |
| Governance Relay | routing, apply-gate, state normalization | normalize directives, maintain handoff integrity | implement code, approve deployment | apply gate only |
| Chief Marketing Agent | marketing orchestration, sequencing, department activation | decompose marketing work, route to specialists, audit output | bypass QA, mutate billing/auth, self-launch | strategic marketing coordination |
| Marketing Strategy / PMM | positioning, offer translation, GTM packets | convert product truth into governed marketing truth | invent offer truth, change price authority | package translation only |
| Market Intel | research, trend analysis, audience pain analysis | gather signals, summarize evidence, surface risks | fabricate market proof, claim certainty without evidence | insight only |
| Growth | CTA logic, soft conversion, inbound routing | recommend conversion flow, propose distribution actions | redefine price, override claims, launch unapproved campaigns | growth recommendations only |
| Content & Distribution | calendar, platform sequencing, content orchestration | draft briefs, sequence content, adapt to platform | publish without QA, invent truth, bypass approval | content sequencing only |
| Story & Narrative | hook, narrative, emotional framing | craft message framing from verified truth | overclaim, distort proof, invent authority | narrative framing only |
| Systems Proof | workflow proof, operational visualization, CRM realism | turn validated operations into marketing-safe proof | fake enterprise visuals, fake dashboards, fake metrics | proof visualization only |
| Production / Creative | image, motion, caption, packaging execution | produce assets from approved brief | change strategy, decide truth, launch content | asset execution only |
| QA | claim validation, readiness, anti-hype enforcement | PASS/BLOCK/RETURN, flag gaps, require fixes | approve business direction, bypass proof | readiness signal only |
| Distribution Intelligence | platform adaptation, timing, routing strategy | optimize where/when/how content is distributed | publish without QA, fabricate performance | distribution optimization only |
| Performance Memory | performance logging, pattern learning, historical memory | store outcomes, surface patterns, recommend improvement | retroactively rewrite truth, override governance | memory only |
| Finance / Billing | package truth, payment flows, wallet/ledger truth | own billing logic and financial truth | let UI compute money truth, let marketing set pricing | financial authority only |
| Auth / Identity | session, identity, ownership truth | own identity resolution and auth boundaries | let marketing infer identity or tenant | identity authority only |
| Runtime / N8N | execution, routing, mechanical workflow | execute approved flows, report status | decide canonical truth, self-approve | runtime execution only |

---

# 2. Cross-Department Routing Rules

## Rule 1 - Marketing To QA

Marketing output must pass QA before public release.

## Rule 2 - Marketing To Distribution

Distribution can only consume approved, public-safe marketing artifacts.

## Rule 3 - Marketing To Finance

Marketing must not set billing truth.
Pricing and package truth stay with Finance or canonical billing source.

## Rule 4 - Marketing To Auth

Marketing must not infer or mutate identity.
Any identity dependency goes back to Auth.

## Rule 5 - Marketing To Runtime

Marketing may request execution, but runtime owns execution mechanics.

## Rule 6 - Marketing To Human

Human review is mandatory when claims, launch, pricing, compliance, or risk thresholds are crossed.

---

# 3. Conflict Resolution Order

1. Human authority
2. core constitution
3. departmental owner for the truth domain
4. chief coordination layer
5. specialist output

If a Marketing artifact conflicts with Billing or Auth, Marketing yields.

If a Marketing artifact conflicts with QA, Marketing fixes and resubmits.

---

# 4. Department Handoff Requirement

Every inter-department handoff must include:

- owner
- department
- source of truth
- current state
- requested next state
- proof references
- approval requirement
- blocked actions
- next owner
- next required action

If a handoff lacks metadata, it is invalid.

---

# 5. Anti-Overlap Rule

No department may self-assign authority outside its matrix row.

This prevents:

- Marketing setting billing truth
- QA acting as executive approval
- Runtime deciding canonical truth
- Content redefining offer truth
- Growth rewriting legal or pricing truth

