# 05_PROTOCOL_STANDARDIZATION_STEP5.md

status: ACTIVE
layer: PROTOCOL
authority_level: CORE
freeze_phase: STEP_5

---

# PURPOSE

Defines unified protocol surfaces for PN OS.

This prevents:
- handoff inconsistency
- state duplication
- gate mismatch
- verdict drift

---

# CANONICAL PROTOCOL SURFACES

## 1. State Taxonomy

Owned by:
- STD_STATE_GATE_TAXONOMY

May be imported by:
- Execution Spec
- QA Agent
- Gatekeeper
- Orchestration Dashboard
- Handoff Contract

Must NOT be redefined by:
- role packs
- workflow packs
- runtime plans

---

## 2. Gate Taxonomy

Owned by:
- STD_STATE_GATE_TAXONOMY

Allowed examples:
- DRAFT
- REVIEW_READY
- BLOCKED
- PASS
- APPLY_READY
- APPLIED
- REVOKED

---

## 3. Handoff Schema

Owned by:
- STD_HANDOFF_ARTIFACT_STANDARD

Required fields:
- artifact_id
- source_files
- reviewed_scope
- verified_facts
- risks
- decision_request
- gatekeeper_questions
- residual_risks

---

## 4. Verdict Schema

Allowed:
- PASS
- BLOCKED
- CONDITIONAL_PASS
- NEED_MORE_SOURCE
- INVALID_FOR_RUNTIME

Forbidden:
- soft pass
- implied pass
- operationally acceptable without evidence

---

## 5. Escalation Schema

Required escalation causes:
- missing authority source
- missing pricing authority
- missing ownership verification
- duplicate canonical authority
- lower-layer redefinition
- same-version different SHA
- unsafe runtime execution

---

# MACHINE-READABLE DTO

```json
{
  "artifact_id": "",
  "artifact_status": "",
  "constitutional_layer": "",
  "authority_level": "",
  "state": "",
  "gate": "",
  "verdict": "",
  "required_imports": [],
  "blocked_reasons": [],
  "evidence": []
}
```

---

# IMPORT RULE

Protocol consumers MUST reference canonical protocol artifacts.

They MUST NOT duplicate protocol definitions inline.

---

# STATUS

protocol_standardization: ESTABLISHED
handoff_contract_guard: ACTIVE
state_gate_guard: ACTIVE
