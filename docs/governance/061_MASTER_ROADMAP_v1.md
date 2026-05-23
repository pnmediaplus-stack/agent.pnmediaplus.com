# 061_MASTER_ROADMAP_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Master roadmap for the PN OS multi-department rollout  
**Purpose:** Define the canonical phase order for turning PN OS from scaffolded references into a governed multi-department operating system

---

# 0. Roadmap Rule

This roadmap is the top-level phase map.

All department-specific roadmaps must import it and stay inside its phase order.

If a local roadmap conflicts with this one, this one wins.

---

# 1. Roadmap Principle

Build in this order:

1. freeze and classify corpus
2. populate registry
3. lock protocol and handoff contracts
4. seed department packs
5. expose read-only API surfaces
6. render read-only admin views
7. connect DB-backed reads
8. wire cross-department handoffs
9. enable read-only n8n validation
10. only then expand operational surfaces

Do not jump ahead just because a later phase feels easier to build.

---

# 2. Phase 1 - Corpus Freeze and Canonical Reference Lock

## Goal

Freeze the authoritative corpus and make the reference bundle the single source for schema and policy derivation.

## Inputs

- constitutional docs
- protocol docs
- current corpus inventory
- `__reference/integration/department-governance/`
- `__reference/database/`

## Outputs

- canonical source bundle
- reference index entries
- classified artifacts
- no duplicate ACTIVE authority

## Exit Criteria

- docs and reference point to the same truth
- no phase roadmap depends on undefined source files

## Gatekeeper Trigger

- duplicate ACTIVE candidates
- ambiguous authority
- lower-layer redefinition

---

# 3. Phase 2 - Registry Population

## Goal

Create the canonical registry for departments, packs, and handoff relationships.

## Inputs

- `department_registry.json`
- `department_packs.json`
- `handoff_contract.json`
- `department_governance_additive_migration.sql`
- `department_governance_verification_queries.sql`

## Outputs

- database schema
- seeded registry rows
- seeded pack rows
- seeded handoff relationships
- verification pass/fail report

## Exit Criteria

- registry is queryable
- pack definitions are queryable
- handoff relationships are queryable
- verification queries pass

## Gatekeeper Trigger

- schema conflict
- integrity failure
- unexpected authority overlap

## Phase Note

- Phase 2 closed on 2026-05-22 after canonical seed application and full verification PASS.
- Verified PASS coverage: 6 departments, 6 packs, 28 handoff edges, FK / dependency integrity, required fields, namespace isolation.
- Next phase opened: Phase 3 - Protocol and Handoff Lock.

---

# 4. Phase 3 - Protocol and Handoff Lock

## Goal

Lock the canonical handoff schema and the protocol boundaries so departments cannot invent their own transfer language.

## Inputs

- `058_CROSS_DEPARTMENT_HANDOFF_CONTRACT_v1.md`
- protocol standards
- registry output from Phase 2

## Outputs

- canonical handoff contract
- state-gated transition rules
- validator-ready field set

## Exit Criteria

- all cross-department transfer shapes share the same contract
- no department defines its own handoff schema

## Gatekeeper Trigger

- missing source references
- requested decision absent
- state escalation without evidence

---

# 5. Phase 4 - Department Pack Seeding

## Goal

Materialize department packs as canonical operating units.

## Inputs

- `059_DEPARTMENT_PACKS_v1.md`
- department registry
- handoff contract

## Outputs

- Core Governance Pack
- Business Truth Pack
- Marketing Pack
- Media Pack
- Operations Pack
- Customer Pack

## Exit Criteria

- each department has a declared owner
- each department has a canonical truth source
- each department has allowed / forbidden actions
- each department has dependencies and handoff targets

## Gatekeeper Trigger

- department self-promotes authority
- pack claims cross-domain truth ownership

---

# 6. Phase 5 - Read-Only API Surfaces

## Goal

Expose read-only, fail-closed APIs for governance data.

## Inputs

- department governance loader
- registry bundle
- pack bundle
- handoff bundle
- SQL migration / verification artifacts

## Outputs

- `/api/department-governance`
- normalized bundle response
- bundle fingerprint
- blocked-state behavior

## Exit Criteria

- API is server-side
- API is read-only
- API is fail-closed
- API can be used as a stable source for UI

## Gatekeeper Trigger

- API introduces mutation
- API changes source of truth
- API bypasses loader/bundle contract

---

# 7. Phase 6 - Read-Only Admin Views

## Goal

Render the governance data for humans without adding authority or mutation paths.

## Inputs

- approved API response
- i18n keys
- UI shell

## Outputs

- registry view
- pack view
- handoff view
- technical view
- blocked view

## Exit Criteria

- view is read-only
- blocked state fails closed
- no edit/save/approve/publish controls exist

## Gatekeeper Trigger

- any mutable UI control
- any hidden write path
- any authority drift in rendering

---

# 8. Phase 7 - DB-Backed Read Path

## Goal

Move the API from bundle-only read to DB-backed read while keeping the bundle as the canonical reference.

## Inputs

- populated registry tables
- verification pass
- approved DB schema

## Outputs

- read-only DB-backed API
- deterministic fallback behavior
- stable source comparison

## Exit Criteria

- DB-backed read matches canonical bundle
- blocked state still fails closed
- source fingerprint remains stable

## Gatekeeper Trigger

- DB and bundle diverge
- read path can mutate
- fallback fabricates truth

## Phase Note

- Phase 3 / Phase 7 implementation is currently blocked by Supabase PostgREST schema exposure.
- Chosen path: build approved public read-only views/RPC for the DB read surface instead of exposing the full `department_governance` schema directly.
- Reason: keeps the read surface narrower, avoids widening authority, and preserves the DB-backed read contract without opening the entire schema.
- Phase 7 closed on 2026-05-22 after public read surface deployment and API readiness PASS.
- Verified PASS coverage: `public.department_governance_snapshot()` available, `GET /api/department-governance` returns `200 ready`, 6 packs loaded, 28 handoffs loaded.
- Next phase opened: Phase 8 - Cross-Department Handoffs.

---

# 9. Phase 8 - Cross-Department Handoffs

## Goal

Connect Marketing, Media, Operations, Customer, and Business Truth with the canonical handoff contract.

## Inputs

- registry
- pack bundles
- handoff contract
- UI/API read surfaces

## Outputs

- governed handoff records
- routed state transitions
- clear owner transitions

## Exit Criteria

- handoff from one department to another is deterministic
- no department bypasses the contract

## Gatekeeper Trigger

- missing metadata
- no requested decision
- state conflict

## Phase Note

- Phase 8 closed on 2026-05-22 after the canonical `Media <-> Operations` handoff was added and verification PASS.
- `phase8_handoff_flow` now passes with the required `Media <-> Operations` pair reflected directly in the canonical snapshot.
- `Marketing -> Operations` remains a separate canonical path and does not act as a substitute.
- Next phase opened: Phase 9 - Read-Only Validation Automation.

---

# 10. Phase 9 - Read-Only Validation Automation

## Goal

Let n8n and other runtime tools validate, detect drift, and emit reports without applying authority.

## Inputs

- registry
- packs
- handoff contract
- verification queries

## Outputs

- validation reports
- drift reports
- escalation notices
- read-only checks

## Exit Criteria

- automation does not decide canonical truth
- automation does not apply registry changes
- automation remains read-only and fail-closed

## Gatekeeper Trigger

- runtime tries to approve itself
- runtime tries to apply changes

## Phase Note

- Phase 9 closed on 2026-05-22 after read-only validation automation was added and verification PASS.
- `phase9_validation_report` is read-only, emits drift/escalation notices only in response JSON, and keeps `read_only: true` / `mutation_allowed: false`.
- Drift findings are `0` and escalation notices are `0` in the current validation pass.
- Next phase opened: Phase 10 - Operational Expansion.

---

# 11. Phase 10 - Operational Expansion

## Goal

Only after all earlier phases are stable, expand into richer operational surfaces.

## Eligible Expansions

- additional department packs
- search/filter views
- metrics and summaries
- workflow dashboards
- performance memory links

## Hard Rule

This phase is not a license to loosen governance.

It is only for expanding already governed capability.

## Phase Note

- Phase 10 closed on 2026-05-22 after operational expansion surfaces were added and verification PASS.
- `phase10_operational_expansion` is read-only, keeps `mutation_allowed: false`, and exposes search/filter, metrics, summaries, workflow dashboards, and performance memory links without changing governance authority.
- `performance_memory_links` is currently empty, but the surface is ready and governed.
- Master Roadmap phases 1-10 are now completed; future work must use department-specific roadmaps or new governed expansions, not a restart of this master sequence.

---

# 12. Department Roadmap Dependency

| Department Roadmap | Must Follow |
|---|---|
| Marketing Roadmap | Master Roadmap phases 1-10 |
| Media Roadmap | Master Roadmap phases 1-10 |
| Operations Roadmap | Master Roadmap phases 1-10 |
| Customer Roadmap | Master Roadmap phases 1-10 |

---

# 13. Stop Conditions

Stop the roadmap progression and request review if:

- source bundle drifts from docs
- registry is incomplete
- pack definitions are incomplete
- handoff contract is incomplete
- API stops being read-only
- UI gains mutation controls
- runtime begins to decide truth
