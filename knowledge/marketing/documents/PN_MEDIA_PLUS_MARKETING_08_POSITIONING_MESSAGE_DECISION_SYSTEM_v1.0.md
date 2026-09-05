# KO-08 — Positioning & Message Decision System v1.0
This KO contains four explicit Decision Modules to avoid becoming a black-box “super document”.

## 08A — Value Proposition Decision
Inputs: selected ICP, pain wedge, verified capability and value mechanism.  
Output: a bounded value proposition; outcomes beyond evidence remain hypotheses.

## 08B — Positioning Decision
Lifecycle: `DRAFT → HYPOTHESIZED → TESTING → SUPPORTED → APPROVED → RETIRED`.  
A campaign test cannot automatically promote a positioning to `APPROVED`.

## 08C — Message Architecture Decision
Message must expose audience, pain, value mechanism, proof type and action context. Hooks are outputs of this reasoning, not starting inputs.

## 08D — Claim & Proof Boundary
Claim strength must not exceed proof strength. Product demo proves a capability, not necessarily a revenue outcome.

## Decision Output
```yaml
message_decision:
  value_proposition:
  positioning_status:
  audience_scope:
  pain_wedge:
  message_pillars: []
  approved_claims: []
  prohibited_claims: []
  proof_available: []
  assumptions: []
  decision_readiness:
  confidence_level:
```

## Gate 04
Any public/high-risk claim with insufficient proof is blocked or escalated to human authority.
