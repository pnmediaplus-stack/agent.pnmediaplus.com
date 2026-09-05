# KO-01 MACHINE-READABLE DECISION SCHEMA v1.0 — LOCKED

```yaml
ko_01_decision:
  decision_id: string
  proposition: string

  decision_readiness:
    enum:
      - INSUFFICIENT_INFORMATION
      - SUFFICIENT_FOR_HYPOTHESIS
      - SUFFICIENT_FOR_DECISION
      - CONFLICTING_EVIDENCE
      - EVIDENCE_EXPIRED

  confidence_level:
    enum:
      - HIGH
      - MEDIUM
      - LOW
      - UNDETERMINED

  decision_scope:
    industry: [string]
    geography: [string]
    customer_segment: [string]
    product_or_service: [string]
    campaign_context: string
    time_validity:
      valid_from: string|null
      valid_until: string|null

  evidence_used:
    - evidence_id: string
      proposition_supported: string
      source: string
      source_type: string
      authority: string
      epistemic_status:
        enum:
          - VERIFIED
          - SUPPORTED
          - HYPOTHESIZED
          - INFERRED
          - UNKNOWN
      scope: object
      observed_at: string|null
      valid_until: string|null
      limitations: [string]

  reasoning_chain:
    required: true
    steps: [string]

  assumptions: [string]
  unresolved_questions: [string]

  required_action:
    enum:
      - STOP
      - RESEARCH
      - ASK_USER
      - ESCALATE
      - PROCEED_AS_HYPOTHESIS
      - PROCEED

  escalation_required: boolean

  mandatory_escalation_reason:
    enum:
      - commercial_authority_required
      - public_high_risk_claim
      - conflicting_high_material_evidence
      - product_capability_uncertain
      - decision_cannot_be_tested_safely
      - human_approval_required_by_assignment
      - null
```

## Validation Laws

```text
confidence_level MUST NOT modify decision_readiness.

VERIFIED input evidence MUST NOT automatically set the final proposition
to VERIFIED if the final proposition requires new Agent reasoning.

decision_scope is mandatory for material decisions.

If mandatory escalation is triggered:
  escalation_required = true
  required_action = ESCALATE
```
