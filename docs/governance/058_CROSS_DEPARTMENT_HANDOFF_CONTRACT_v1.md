# 058_CROSS_DEPARTMENT_HANDOFF_CONTRACT_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** Canonical cross-department handoff template for n8n / DB / UI  
**Purpose:** Define the required schema, validation rules, and integration mappings for all department-to-department transfers inside PN OS

---

# 0. Contract Principle

Every cross-department handoff must be explicit, evidence-backed, and state-gated.

If a handoff is missing metadata, it is invalid.

If a handoff implies authority it does not own, it is invalid.

If a handoff attempts to bypass a gate, it is invalid.

---

# 1. Handoff Types

Valid handoff types:

- briefing handoff
- analysis handoff
- approval handoff
- production handoff
- QA handoff
- publish handoff
- escalation handoff
- memory handoff

Each type must still obey the same core schema.

---

# 2. Required Handoff Fields

Every cross-department handoff must include:

- handoff_id
- source_department
- source_owner
- target_department
- target_owner
- current_state
- requested_next_state
- handoff_type
- source_artifacts
- source_truth
- evidence_refs
- verified_facts
- assumptions
- risks
- blocked_conditions
- approval_required
- approval_status
- qa_required
- qa_status
- public_safe
- handoff_allowed
- requested_decision
- next_actions
- next_owner_action
- timestamp_created
- timestamp_updated

If any field is missing, the handoff is governance-incomplete.

---

# 3. Validation Rules

## Rule 1 - Source Authority

The source department may only hand off what it actually owns.

## Rule 2 - Target Awareness

The target department must be named explicitly and must be a valid registry department.

## Rule 3 - Evidence Required

Every handoff must cite evidence or verified source artifacts.

## Rule 4 - No Assumption Promotion

Assumptions may be listed, but they may not be promoted to facts.

## Rule 5 - No Hidden Approval

Approval requirements must be explicit.

## Rule 6 - No Public-Safe Guessing

Public safety must be declared, not inferred.

## Rule 7 - State Gate

A handoff may not request a next state that violates the protocol/state model.

## Rule 8 - One Decision Per Handoff

Each handoff must ask for one primary decision or one bounded next action.

---

# 4. State Transition Rules

Allowed movement requires:

- owner authority
- evidence
- no conflict with higher authority
- required approvals
- required QA when applicable

Disallowed movement includes:

- draft to live without review
- internal_only to public_safe without proof
- qa_blocked to launch_authorized without remediation
- any upward transition with missing metadata

---

# 5. Department Handoff Patterns

## 5.1 Marketing to Media

Required payload:

- verified brief
- claim boundary
- proof boundary
- audience direction
- platform constraints
- asset requirements
- approval requirement

Media must respond with:

- asset plan
- production outputs
- blockers
- QA needs

## 5.2 Media to QA

Required payload:

- rendered assets
- caption drafts
- claim references
- platform mappings
- proof references

QA must respond with:

- PASS, BLOCK, or RETURN_TO_OWNER
- specific remediation notes

## 5.3 QA to Distribution

Required payload:

- QA-passed asset
- public_safe flag
- publish metadata
- timing constraints

Distribution must respond with:

- publish record
- URL
- timestamp
- platform trace

## 5.4 Performance Memory to Marketing

Required payload:

- publish record
- outcome metrics
- pattern insights
- weak signals

Marketing must respond with:

- future brief adjustments
- pattern adoption or rejection

---

# 6. Forbidden Handoffs

The following handoffs are invalid:

- handoff without source references
- handoff without next actions
- handoff without requested decision
- handoff that claims PASS before review
- handoff that bypasses QA when QA is required
- handoff from a department that does not own the truth being transferred
- handoff that mutates billing/auth/runtime truth indirectly

---

# 7. Handoff Record Schema

Recommended canonical schema:

```yaml
handoff_id:
handoff_type:
source_department:
source_owner:
target_department:
target_owner:
current_state:
requested_next_state:
source_artifacts:
source_truth:
evidence_refs:
verified_facts:
assumptions:
risks:
blocked_conditions:
approval_required:
approval_status:
qa_required:
qa_status:
public_safe:
handoff_allowed:
requested_decision:
next_actions:
next_owner_action:
timestamp_created:
timestamp_updated:
```

---

# 8. Routing Rule

Governance Relay routes the handoff.
Gatekeeper validates the handoff.
The target department owns execution of the next action.

No department may self-approve its own upward state transition if the protocol requires review.

---

# 9. Recovery Rule

If a handoff is rejected:

- return to source owner
- attach rejection reason
- preserve lineage
- resubmit only after remediation

Rejected handoffs do not vanish.
They remain part of the audit trail.

---

# 10. n8n Payload Template

Use this shape when emitting a handoff from n8n:

```yaml
handoff_id: ""
handoff_type: briefing_handoff
source_department: ""
source_owner: ""
target_department: ""
target_owner: ""
current_state: draft
requested_next_state: reviewing
source_artifacts: []
source_truth: ""
evidence_refs: []
verified_facts: []
assumptions: []
risks: []
blocked_conditions: []
approval_required: false
approval_status: not_requested
qa_required: false
qa_status: not_applicable
public_safe: false
handoff_allowed: false
requested_decision: ""
next_actions: []
next_owner_action: ""
timestamp_created: ""
timestamp_updated: ""
```

---

# 11. DB Record Template

Recommended relational fields:

| Field | Type | Notes |
|---|---|---|
| handoff_id | text / uuid | primary identifier |
| handoff_type | text | controlled enum |
| source_department | text | registry department id or name |
| source_owner | text | owner role |
| target_department | text | registry department id or name |
| target_owner | text | owner role |
| current_state | text | protocol state |
| requested_next_state | text | protocol state |
| source_artifacts | jsonb | array of artifact refs |
| source_truth | jsonb/text | normalized truth payload |
| evidence_refs | jsonb | array of evidence links |
| verified_facts | jsonb | normalized facts |
| assumptions | jsonb | assumptions list |
| risks | jsonb | risks list |
| blocked_conditions | jsonb | blocked conditions |
| approval_required | boolean | governance gate |
| approval_status | text | enum |
| qa_required | boolean | governance gate |
| qa_status | text | enum |
| public_safe | boolean | public boundary |
| handoff_allowed | boolean | pass/fail |
| requested_decision | text | decision text |
| next_actions | jsonb | list of follow-ups |
| next_owner_action | text | single next action |
| timestamp_created | timestamptz | creation time |
| timestamp_updated | timestamptz | last update |

---

# 12. UI Form Contract

The UI should render the handoff as these sections:

- source
- target
- current state
- requested next state
- source artifacts
- evidence
- assumptions
- risks
- approvals
- QA
- public safety
- next actions

UI rules:

- required fields must be visually marked
- invalid fields must block submit
- approval and QA states must be explicit
- no field may be silently inferred

---

# 13. JSON Shape Reference

```json
{
  "handoff_id": "",
  "handoff_type": "briefing_handoff",
  "source_department": "",
  "source_owner": "",
  "target_department": "",
  "target_owner": "",
  "current_state": "draft",
  "requested_next_state": "reviewing",
  "source_artifacts": [],
  "source_truth": "",
  "evidence_refs": [],
  "verified_facts": [],
  "assumptions": [],
  "risks": [],
  "blocked_conditions": [],
  "approval_required": false,
  "approval_status": "not_requested",
  "qa_required": false,
  "qa_status": "not_applicable",
  "public_safe": false,
  "handoff_allowed": false,
  "requested_decision": "",
  "next_actions": [],
  "next_owner_action": "",
  "timestamp_created": "",
  "timestamp_updated": ""
}
```
