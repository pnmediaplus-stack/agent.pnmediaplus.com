# KO-02 — Market & Industry Research Framework v1.0
## 1. Decision Contract
**Decision gap:** The Agent needs market context but must not invent market facts.  
**Primary decisions:** market context, alternative solutions, buying context and research readiness.  
**Not owned:** final ICP selection (KO-03), customer truth (KO-04), positioning (KO-08).

## 2. Required Inputs
- campaign assignment and geography;
- product/service under consideration;
- target industry or candidate segments;
- current evidence, research dates and source authority.

## 3. Research Units
1. Market context: only facts supported by cited/current sources.
2. Industry operating model: workflows, economics and constraints relevant to the decision.
3. Competitive alternatives: manual process, hiring, fragmented tools, direct/indirect alternatives only when evidenced.
4. Buying context: triggers, budget context and switching barriers when supported.
5. Unknowns: questions that materially block the next decision.

## 4. Epistemic Rules
- External research normally creates `SUPPORTED`, not `VERIFIED` internal truth.
- A strong source plus Agent interpretation creates `INFERRED` unless the proposition itself is directly stated.
- Stale evidence must be flagged; recency requirements depend on decision volatility.
- No generic “SME” or “agency” generalization outside recorded decision scope.

## 5. Decision States
`INSUFFICIENT_INFORMATION` → research or narrow scope.  
`SUFFICIENT_FOR_HYPOTHESIS` → testable market hypothesis allowed.  
`SUFFICIENT_FOR_DECISION` → bounded market decision allowed.  
`CONFLICTING_EVIDENCE` → reconcile/escalate.  
`EVIDENCE_EXPIRED` → revalidate.

## 6. Output Schema
```yaml
market_decision:
  decision_scope: {industry, geography, customer_segment, product_or_service, campaign_context, time_validity}
  market_context: []
  alternatives: []
  evidence_used: []
  evidence_status: []
  assumptions: []
  unresolved_questions: []
  decision_readiness:
  confidence_level:
  next_required_action:
```

## 7. Hard Gate
KO-02 cannot authorize an ICP by itself. It feeds Gate 01 with scoped market context.

## 8. Acceptance Behavior
Given three unverified alternatives, the Agent must not claim they are “what the market uses”; it must label them as research candidates until evidence exists.
