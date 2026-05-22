# 07_N8N_GOVERNANCE_RUNTIME_STEP7.md

status: ACTIVE
layer: RUNTIME
authority_level: RUNTIME
freeze_phase: STEP_7

---

# PURPOSE

Defines how PN OS governance can scale into n8n without authority drift.

Core principle:

Registry = Authority
n8n = Executor

---

# N8N AUTHORITY LAW

n8n MAY:
- ingest artifacts
- compute hashes
- detect duplicates
- call validators
- route handoffs
- notify Gatekeeper
- generate reports

n8n MUST NOT:
- decide canonical truth
- self-approve registry changes
- override Gatekeeper
- mutate constitutional authority
- select newest file as canonical

---

# WORKFLOW A — ARTIFACT INTAKE

Trigger:
- new artifact uploaded

Steps:
1. receive file
2. compute SHA
3. extract metadata
4. classify artifact_status
5. detect duplicate filename
6. detect same-version different SHA
7. produce intake report

Output states:
- NEW_ARTIFACT
- DUPLICATE_SHA
- SAME_VERSION_DIFFERENT_SHA
- UNKNOWN_LINEAGE
- INVALID_METADATA

---

# WORKFLOW B — CANONICAL RESOLVER

Input:
- artifact_id

Steps:
1. load ACTIVE_CANONICAL_REGISTRY
2. resolve active version
3. fetch artifact
4. verify SHA
5. load required imports
6. return resolved package

n8n cannot change resolution outcome.

---

# WORKFLOW C — VALIDATION GATE

Checks:
- metadata schema present
- dependency integrity
- no forbidden override
- no missing protocol
- no capability violation
- no duplicate ACTIVE authority

Output:
- VALIDATION_PASS
- VALIDATION_BLOCKED
- NEED_MORE_SOURCE

---

# WORKFLOW D — HANDOFF BUILDER

Generates:
- Architect handoff
- Gatekeeper review package
- Governance Relay normalization package
- Human approval brief
- audit report

---

# WORKFLOW E — DRIFT MONITOR

Scheduled scan detects:
- duplicate authority
- same-version different SHA
- orphan files
- superseded file still active
- unregistered artifact
- role capability creep

---

# N8N SAFETY CONDITIONS

All workflows MUST:
- log inputs and outputs
- preserve original artifact
- never overwrite active registry directly
- create patch proposal instead of applying authority mutation

---

# STATUS

n8n_runtime_model: ESTABLISHED
automation_ready: AFTER_REGISTRY_KERNEL
authority_boundary: LOCKED
