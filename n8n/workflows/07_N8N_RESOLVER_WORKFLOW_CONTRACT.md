# 07_N8N_RESOLVER_WORKFLOW_CONTRACT

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
tier: TIER_2_5

---

# PURPOSE

Defines n8n workflow contract for registry population and resolver runtime.

---

# CORE LAW

n8n executes.

n8n does not decide canonical truth.

---

# WORKFLOW 1 — Registry Population

Trigger:
- artifact upload or folder scan

Steps:
1. Read artifact
2. Extract metadata
3. Compute SHA
4. Compare against candidate table
5. Classify conflict
6. Emit registry patch proposal

Output:
- REGISTRY_POPULATION_REPORT

---

# WORKFLOW 2 — Resolver Runtime

Trigger:
- artifact_id resolution request

Steps:
1. Read registry
2. Find active artifact
3. Fetch artifact
4. Verify SHA
5. Check conflict queue
6. Return resolved package or block

Output:
- RESOLVED_ARTIFACT_PACKAGE
- RESOLUTION_BLOCKED

---

# WORKFLOW 3 — Drift Monitor

Trigger:
- scheduled scan

Steps:
1. scan registry entries
2. recompute SHA
3. compare registry SHA
4. check duplicate ACTIVE
5. check orphan files
6. emit drift report

Output:
- DRIFT_REPORT

---

# REQUIRED N8N SAFETY

n8n MUST NOT:
- directly apply registry mutation
- approve active candidate
- delete files
- resolve conflict silently

---

# NEXT ACTIONS

## Immediate Next Step
- Convert these workflow contracts into n8n nodes after registry draft exists.

## Required Inputs
- Registry draft
- file source
- SHA node/script
- conflict queue

## Recommended Owner
- Automation Architect

## Blocking Conditions
- Registry not established
- no SHA computation
- no Gatekeeper review path

## Suggested Next Package
- Runtime Resolver Test Plan
