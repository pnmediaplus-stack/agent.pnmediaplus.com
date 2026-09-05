# KO-04 — ICP & Customer Evidence Pack v1.0
## Purpose
Separate observed customer evidence from personas, frameworks, sales copy and Agent-generated assumptions.

## Evidence Units
```yaml
customer_evidence:
  source_id:
  source_type:
  directness:
  date:
  decision_scope:
  proposition:
  verbatim_customer_language:
  affected_role:
  context:
  epistemic_status:
  freshness:
  conflicts: []
```

## Allowed Sources
Customer interviews, CRM records, verified support/conversation records and documented sales interactions, subject to privacy and source authority.

## Not Automatically Evidence
Sales scripts, suggested benefits, persona templates, marketing copy and Agent summaries.

## Customer Profile Output
```yaml
customer_profile:
  segment:
  firmographic_context:
  buyer_roles: []
  jobs_to_be_done: []
  triggers: []
  objections: []
  customer_language: []
  evidence_used: []
  evidence_status:
  confidence_level:
  unresolved_questions: []
```

## Acceptance Rule
A customer quote may be preserved verbatim, but a conclusion generalized from it remains `INFERRED` or `HYPOTHESIZED` according to evidence breadth.
