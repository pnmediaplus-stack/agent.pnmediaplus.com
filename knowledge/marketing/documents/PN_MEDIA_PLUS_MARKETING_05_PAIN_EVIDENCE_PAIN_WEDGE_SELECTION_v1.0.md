# KO-05 — Pain Evidence & Pain Wedge Selection v1.0
## Decision Contract
Select one pain wedge that is specific enough to test and grounded enough to communicate without overstating prevalence.

## Pain Schema
```yaml
pain:
  internal_statement:
  customer_language:
  evidence: []
  affected_role:
  frequency_evidence:
  severity_evidence:
  business_consequence:
  product_fit:
  commercial_relevance:
  epistemic_status:
```

## Selection Criteria
Severity, frequency, awareness, evidence strength, product fit, commercial relevance and customer-language match.

## Output
```yaml
pain_wedge_decision:
  selected_pain:
  customer_language:
  affected_customer:
  frequency_evidence:
  severity_evidence:
  product_fit:
  commercial_relevance:
  epistemic_status:
  competing_pains: []
  confidence:
  decision_readiness:
  next_required_action:
```

## Gate 02
Weak evidence may produce a `PAIN_HYPOTHESIS` for testing, never a canonical market truth.
