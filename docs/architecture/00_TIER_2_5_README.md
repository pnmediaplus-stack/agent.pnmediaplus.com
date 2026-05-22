# PN OS TIER 2.5 — REGISTRY POPULATION + RESOLVER RUNTIME

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Tier 2.5 turns the Tier 2 Canonical Registry Kernel from a standard into an operational population and resolver process.

Tier 2.5 answers:

- How do we populate the registry?
- How do we compute SHA?
- How do we classify conflicts?
- How does resolver behave at runtime?
- How does n8n safely automate the process?

---

# CORE PRINCIPLE

Registry population is not the same as registry approval.

Population may be automated.

Approval must remain governed.

---

# DELIVERABLES

1. Registry Population Protocol
2. Initial Active Candidate Table
3. SHA Generation Workflow
4. Conflict Queue Standard
5. Resolver Runtime Algorithm
6. Registry Patch Proposal Schema
7. n8n Resolver Workflow Contract
8. Gatekeeper Registry Review Checklist
9. Governance Relay Registry Apply Protocol
10. Runtime Resolver Test Plan

---

# TIER 2.5 SUCCESS CONDITION

Tier 2.5 is complete when:

- every candidate artifact has artifact_id
- every candidate has SHA
- conflicts are isolated into queue
- resolver can return deterministic result
- Gatekeeper can review registry population
- Governance Relay can apply approved registry patch

---

# NEXT ACTIONS

## Immediate Next Step
- Run registry population against current corpus.

## Required Inputs
- Full artifact folder or file list
- SHA values
- duplicate inventory
- active candidate list

## Recommended Owner
- Architect prepares population
- Governance Relay normalizes registry patch
- Gatekeeper validates

## Blocking Conditions
- Missing source files
- Missing SHA
- Same-version different-content conflict

## Suggested Next Package
- TIER_3_LAYER_ISOLATION_ENFORCEMENT
