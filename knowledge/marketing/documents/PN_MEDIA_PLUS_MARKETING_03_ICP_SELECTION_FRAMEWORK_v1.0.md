# KO-03 — ICP Selection Framework v1.0
## Decision Contract
Choose which segment is `PRIORITY`, `TEST` or `HOLD`; do not fabricate numeric precision from weak evidence.

## Inputs
KO-02 market context; KO-04 customer evidence; KO-06 product truth; campaign constraints.

## Criteria
- problem intensity;
- product fit;
- commercial feasibility;
- purchase readiness;
- reachable audience;
- evidence strength.

`HIGH/MEDIUM/LOW` evidence labels are preferred to false decimal scores when quantitative evidence is absent.

## Decision Output
```yaml
icp_decision:
  selected_segment:
  rejected_segments: []
  decision_criteria: []
  evidence_used: []
  evidence_status: []
  assumptions: []
  confidence_level:
  decision_readiness:
  unresolved_questions: []
  next_required_action:
```

## Gate 01
A canonical segment requires sufficient scoped customer and product-relevance evidence. Otherwise output `TEST_DECISION` or `HYPOTHESIS_ONLY`.

## Prohibited Behavior
- “15–50 employees” cannot become an approved ICP solely because it appears plausible.
- One customer case cannot be generalized to a whole market without scope/evidence controls.
