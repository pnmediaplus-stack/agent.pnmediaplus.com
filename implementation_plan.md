# Implementation Plan

## Phase 075 Campaign Planner Hardening

### Non-Negotiable Deterministic Contract Rule
- `campaign_goal`, `required_terms`, `validation_hints`, `paid_media_allowed`, and `campaign_duration_days` MUST be produced by deterministic parser/schema logic from:
  - the incoming user request
  - the governance registry / department pack contract
- These fields MUST NOT be inferred by the LLM.
- `campaign_brief` MUST remain the raw SSOT of the user request.
- `departmentPack` and campaign contract MUST come from registry/backend tenant scope, never from N8N guesswork.

### Fail-Closed Rules
- If scope, pack, or requirements are missing or contradictory, return `clarify_missing_scope` or `QA_REJECT`.
- Do not deliver a campaign packet when QA fails.

### Verification Required
- JSON parse the workflow export.
- Run `npm run build`.
- Test at least:
  - one `10 ngày / no-ads` case
  - one different goal/duration case
- Confirm no hardcoded `media CRM / 10 ngày` dependency remains.
