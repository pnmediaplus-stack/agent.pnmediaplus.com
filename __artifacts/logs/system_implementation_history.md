# System Implementation History

Repository: `pn-os-ai-department` Phase 1 internal MVP
Last updated: 2026-05-20

## Purpose

This file is the working handoff log for the Next.js build of PN OS AI Department.

Use it as a fast onboarding summary for a new chatbot or engineer who needs to understand:

- what the system is
- what has already been built
- what is still mock-only
- what layer owns what
- what stage the project is in right now

## Current Stage

Phase 1 internal MVP is in place.

Current status:

- Next.js thin-shell UI is built and running locally
- mock-first mode is active
- frontend i18n layer exists and is used by components
- language toggle EN/VI exists in the header
- hydration warning from root layout was hardened with `suppressHydrationWarning` on both `html` and `body`
- database schema package and verification queries have been drafted for Supabase/Postgres
- n8n runtime is not implemented here and remains owned by another department
- Supabase is not connected unless env vars are provided

## System Ownership Model

### Next.js

Owns:

- routes and pages
- UI shell
- dashboards
- task inbox views
- registry views
- approval console UI
- audit viewer UI
- media pipeline board UI
- frontend-safe API mocks
- browser/UI verification

Does not own:

- orchestration runtime
- workflow execution
- publish/launch automation
- production runtime logic

### n8n

Owns:

- workflow execution
- routing
- automation callbacks
- runtime orchestration

Not owned by Next.js.

### Supabase/Postgres

Owns:

- registry state
- audit store
- entities
- approvals
- workflow runs
- chat threads/messages
- audit logs
- handoff packets

### Human

Owns:

- final approval
- publish decisions
- launch decisions
- scope decisions
- security/public access decisions

## Repo Structure Notes

Important folders:

- `docs/` = constitutional and governance layer
- `__reference/` = implementation memory and working references
- `__artifacts/` = outputs, logs, handoffs, workflow exports, QA evidence
- `n8n/` = runtime-owned reference area, not frontend-owned

Priority rule:

`docs/ > __reference/ > implementation`

## What Has Been Built

### Next.js frontend

Built routes:

- `/dashboard`
- `/chat`
- `/departments`
- `/agents`
- `/tasks`
- `/artifacts`
- `/workflows`
- `/qa-reviews`
- `/gates`
- `/approvals`
- `/n8n-runs`
- `/audit-logs`
- `/media-pipeline`

UI patterns already in place:

- admin-style shell
- sidebar navigation
- status badges
- task table
- approval panel
- audit log table
- workflow run table
- media pipeline board
- empty states and loading states

### i18n

Frontend i18n exists under:

- `src/lib/i18n/`

Key properties:

- flat translation keys only
- EN and VI modules kept in sync
- components load translations internally with `useI18n()`
- language toggle exists in the header
- locale persists in `localStorage`

### Mock-safe backend contracts

Safe mock API routes exist for:

- `POST /api/n8n/human-task-intake`
- `POST /api/n8n/state-update-request`
- `POST /api/n8n/audit-log-append`

These are frontend-safe wrappers only.

### Database schema package

The Phase 1 database package has been prepared in:

- `__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA.sql`

It is additive and meant for Supabase/Postgres.

Matching dry-run checks are in:

- `__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA_verification_queries.sql`

### Documentation scaffold

Repo documentation scaffold exists for:

- `docs/`
- `__reference/`
- `__artifacts/`
- `n8n/`

## What the App Actually Uses Today

Frontend data is still mostly mock-first.

Mock entities currently model:

- departments
- agents
- tasks
- artifacts
- workflow runs
- QA reviews
- gates
- approvals
- chat threads
- chat messages
- audit logs
- media pipeline stages

The current frontend renders against mock data, but the DB schema package now matches the app shape closely enough to move toward real registry reads later.

## Current Verification Status

Verified locally:

- `npm run build` passes
- local route rendering works
- sidebar navigation works
- language toggle is visible
- audit logs page exists
- mock n8n API routes return safe mock responses when env is missing

Known debug history:

- hydration mismatch warning on root layout was reduced by adding `suppressHydrationWarning` to `body`
- browser extensions can still cause transient DOM mismatch noise in dev, but the root shell is now hardened

## Current Limitations

Still not done:

- no real n8n runtime integration
- no real Supabase connection unless env vars are supplied
- no production deployment
- no automatic publish
- no automatic launch
- no autonomous runtime

## Files That Matter Most

Start here when reloading context:

- [README.md](D:/Projects/agent.pnmediaplus.com/README.md)
- [__artifacts/README.md](D:/Projects/agent.pnmediaplus.com/__artifacts/README.md)
- [__reference/README.md](D:/Projects/agent.pnmediaplus.com/__reference/README.md)
- [src/app/layout.tsx](D:/Projects/agent.pnmediaplus.com/src/app/layout.tsx)
- [src/components/layout/AppShell.tsx](D:/Projects/agent.pnmediaplus.com/src/components/layout/AppShell.tsx)
- [src/components/layout/Header.tsx](D:/Projects/agent.pnmediaplus.com/src/components/layout/Header.tsx)
- [src/components/layout/Sidebar.tsx](D:/Projects/agent.pnmediaplus.com/src/components/layout/Sidebar.tsx)
- [src/lib/i18n/I18nProvider.tsx](D:/Projects/agent.pnmediaplus.com/src/lib/i18n/I18nProvider.tsx)
- [src/lib/i18n/useI18n.ts](D:/Projects/agent.pnmediaplus.com/src/lib/i18n/useI18n.ts)
- [src/lib/mock-data.ts](D:/Projects/agent.pnmediaplus.com/src/lib/mock-data.ts)
- [__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA.sql](D:/Projects/agent.pnmediaplus.com/__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA.sql)
- [__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA_verification_queries.sql](D:/Projects/agent.pnmediaplus.com/__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA_verification_queries.sql)
- [n8n/workflows/WORKFLOW-A.json](D:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-A.json)
- [n8n/workflows/WORKFLOW-C.json](D:/Projects/agent.pnmediaplus.com/n8n/workflows/WORKFLOW-C.json)

## Timeline Summary

### Phase 1 scaffold

- built the Next.js app shell
- created dashboard and all required Phase 1 routes
- added mock data
- added safe mock API routes for n8n contracts

### i18n hardening

- created flat-key i18n scaffold
- removed hardcoded visible UI strings where needed
- added EN/VI language toggle
- split `n8n.*` namespace for `/n8n-runs`

### UX stabilization

- improved sidebar
- improved loading and empty states
- tightened state badge consistency
- improved approval panel clarity
- improved task table and audit log readability
- improved responsive behavior for narrow screens

### Hydration fix

- resolved the root layout hydration warning by suppressing hydration differences on `html` and `body`

### Database packaging

- compared app schema needs against the reference database architecture
- produced an additive Supabase/Postgres SQL package
- added verification queries for dry-run review

### n8n workflow hardening

- fixed `WORKFLOW-A` audit logging so it matches the `pn_os_ai_department.audit_logs` schema
- rewrote `WORKFLOW-C` into a package validator aligned with the package validator spec
- removed `WORKFLOW-B` to avoid duplicate runtime paths and spec drift

### B/C logic audit lock

- verified current on-disk `WORKFLOW-B.json` wiring is connected and not orphaned
- tested `WORKFLOW-B` payload handling: webhook input is accepted, but the node logic still acts as a pass-through state update shell and does not yet enforce the state transition matrix
- tested `WORKFLOW-C` payload handling: valid package payloads resolve to `PACKAGE_VALID`, and blocking payloads correctly produce `PACKAGE_BLOCKED` with SHA/status mismatch reasons
- locked the current review state in this handoff log so future chats can distinguish `wiring verified` from `business logic complete`
- no runtime orchestration changes were made in this audit pass

### Next.js control-plane guard

- shifted state transition guard responsibility to Next.js API at `src/app/api/n8n/state-update-request/route.ts`
- route now blocks invalid or no-op lifecycle transitions before forwarding anything to n8n
- allowed requests forward to n8n with an explicit control-plane decision envelope
- this keeps `WORKFLOW-B` as a relay shell only and preserves the runtime ownership boundary
- smoke test result: forbidden transition `DRAFT -> APPROVED` now returns `409`, while allowed transitions no longer crash the route and instead surface downstream n8n transport problems as `502`

### API control plane envelope completion

- standardized `src/app/api/n8n/human-task-intake/route.ts` to match the control-plane envelope used by the other n8n API routes
- all Phase 1 Next.js control-plane routes now return a consistent `ok / mocked / route / status / message / data|error / receivedAt` envelope
- mock-safe behavior is preserved when `N8N_WEBHOOK_BASE_URL` is missing
- downstream n8n transport failures are surfaced as `502 Bad Gateway` instead of raw `500`

### Zero-trust authority enforcement

- added a mock control-plane secret gate to `src/lib/state-transition-guard.ts`
- state transitions now require `X-Control-Plane-Secret` and HUMAN authority at the API boundary before any n8n forwarding
- `src/components/tasks/TaskTable.tsx` now attaches the control-plane header and human actor identity so task actions fail closed instead of being silently blocked
- Phase 1 Task Inbox actions are now aligned with zero-trust control-plane behavior

### Server-side auth rework

- removed `NEXT_PUBLIC_*` control-plane secret usage from the client bundle
- introduced server-only cookie session auth via `pn_cp_session` and `CONTROL_PLANE_SECRET`
- added `middleware.ts` to mint an HttpOnly control-plane session cookie for the browser shell
- Task Inbox now uses `credentials: include` and fails closed when the session cookie is missing or invalid

### Auth smoke regression and final freeze

- added `src/__tests__/auth-smoke.test.ts` as a lightweight regression smoke file for control-plane auth
- verified regression coverage for `401 MISSING_CONTROL_PLANE_SESSION` and `403 FORBIDDEN_ACTOR`
- validated the smoke file with `npm run test:auth-smoke` against a fresh local Next server
- kept the control-plane boundary zero-trust and mock-first without expanding identity auth scope
- acknowledged Human final authority approval of the Phase 1 state
- system freeze date recorded as `2026-05-20`
- PHASE 1 HOÀN THÀNH TOÀN DIỆN VÀ AN TOÀN.

### Phase 1 closed

- PHASE 1 CLOSED
- HttpOnly control-plane session cookie enforced for browser-shell access
- API boundary returns fail-closed `401 / 403` before any state guard or n8n forwarding
- `n8n` remains frozen as execution-only and does not own canonical truth or publish authority
- control plane remains server-side auth only, with no `NEXT_PUBLIC_*` control-plane secret exposure

### Phase 2 closed

- PHASE 2 CLOSED
- Phase 2 content pipeline schema, QA gate, and publish gate are locked as canonical
- `content_items`, `agent_tasks`, `assets`, `qa_reviews`, and `performance_records` remain the only approved Phase 2 tables
- `performance_records` is enforced as post-publish only
- Phase 2 Dashboard UI was approved as the accepted operating baseline
- Transition to Phase 3 is now authorized at the governance level

### Phase 2 live verified

- PHASE 2 LIVE DATA VERIFIED SUCCESSFULLY.
- Dashboard now resolves against `public.phase2_*` Supabase views
- Live runtime no longer depends on mock canonical data for Phase 2 dashboard rendering

### Phase 3 closed

- PHASE 3 CLOSED
- Phase 3 read-only operational scaffold has been live-verified on top of the Phase 2 baseline
- No new write paths, publish authority, or n8n runtime changes were introduced
- Phase 3 remains backward compatible with Phase 2 and fail-closed when dependency data is unavailable

### BYOK broker security validated

- BYOK BROKER E2E SECURITY VALIDATED
- Mock-key 401 rejection is accepted as the expected security behavior for the provider boundary test
- `pn_vault` remains isolated behind public wrapper RPCs and server-side broker scope only
- No raw API key egress, no plaintext secret response, and no n8n raw key exposure were observed
- Phase 3 BYOK security flow is approved as PASS at the security boundary

### Phase 3 security package

- Secret custody is server-side only
- Vault encryption is AES-256-GCM with one-time reference tokens
- Public wrapper RPCs are the only exposed bridge into `pn_vault`
- Next.js broker executes the LLM call server-side and discards plaintext immediately after use
- Failure modes remain fail-closed for missing credential, expired token, invalid scope, or provider reject

### Phase 4 read-only observability UI verified and accepted

- PHASE 4 READ-ONLY OBSERVABILITY UI VERIFIED AND ACCEPTED.
- Phase 4 live rendering is fail-closed by design and does not synthesize runtime data
- The five public read-model views are aligned with the loader contract and render safely
- `PHASE4_EXECUTION_METRICS_EMPTY` remains a valid blocked state until upstream emits snapshot rows
- No runtime mutation, retry action, publish authority, BYOK change, or n8n change was introduced

### Phase 5 live reflection verified and accepted

- PHASE 5 LIVE REFLECTION VERIFIED AND ACCEPTED.
- Signed runtime ingress passed through Next.js canonical control plane and append-only RPC
- Phase 4 now reflects real runtime execution facts from the governance runtime read model
- Duplicate idempotency remained correctly blocked as part of the append-only guard rail
- No raw secret egress, no BYOK boundary drift, and no UI mutation path were introduced

## What A New Chatbot Should Do First

1. Read this file.
2. Read `src/lib/i18n/`.
3. Read `src/lib/mock-data.ts`.
4. Read `src/app/layout.tsx` and `src/components/layout/`.
5. Read `__reference/database/PN_OS_AI_DEPARTMENT_PHASE1_APP_SCHEMA.sql`.
6. Check whether the current task is frontend-only, docs-only, or database-packaging-only.
7. Do not cross the runtime ownership boundary into n8n orchestration.

## Safe Next Steps

- add more frontend-only polish if requested
- wire real Supabase reads only after env approval
- keep n8n runtime work outside this repo ownership boundary
- append future milestones here as new dated entries

## Handoff Note

If you hand this repo to a new chatbot, give it this file first.
It should then understand that the project is currently at:

- Phase 1 internal MVP
- frontend complete enough for local use
- mock-first by default
- DB schema packaged but not yet proven against live production data
- runtime orchestration still owned elsewhere
