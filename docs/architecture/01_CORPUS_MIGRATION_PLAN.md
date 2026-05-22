# 01_CORPUS_MIGRATION_PLAN.md

status: ACTIVE
layer: CONSTITUTION
authority_level: CORE
phase: TIER_1_5

---

# PURPOSE

Defines how to migrate the existing PN OS governance corpus into the freeze metadata system.

---

# MIGRATION PRINCIPLE

Do not delete lineage.

Do not rewrite entire documents.

Do not merge all documents into one monolith.

Patch only the metadata header and authority classification.

---

# MIGRATION ORDER

## Stage 1 — Constitutional Core

Patch first:

- PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
- ACTIVE_CONSTITUTION_SET
- STD_STATE_GATE_TAXONOMY
- STD_HANDOFF_ARTIFACT_STANDARD
- STD_CANONICAL_ROLE_MAP

Required metadata:

artifact_id:
version:
artifact_status:
constitutional_layer: CONSTITUTION or PROTOCOL
authority_level: SUPREME or CORE
freeze_status: IMMUTABLE or IMMUTABLE_CANDIDATE
redefinition_policy: IMPORT_ONLY
owner_authority:
last_reviewed_by:

---

## Stage 2 — Protocol Standards

Patch next:

- STD_CANONICAL_PROMPT_FRAMEWORK
- STD_ARTIFACT_VALIDATION_CHECKLIST
- STD_CANONICAL_PACK_MANIFEST
- STD_CANONICAL_PACK_DEPENDENCY_MAP
- STD_CANONICAL_PACK_RELEASE
- STD_GOVERNANCE_APPENDIX

Expected layer:
- PROTOCOL or ARTIFACT

---

## Stage 3 — Runtime / Execution Docs

Patch after protocol:

- EXECUTION_SPEC
- Runtime handoff docs
- Orchestration dashboard docs
- System master index

Expected layer:
- RUNTIME or WORKFLOW

Rule:
Runtime docs MUST import protocol. They MUST NOT redefine protocol.

---

## Stage 4 — Capability / Bot Role Packs

Patch role prompts:

- Architect
- Gatekeeper
- Governance Relay
- QA Agent
- Marketing agents
- Product agents
- Revenue agents
- Legal agents

Expected layer:
- CAPABILITY

Rule:
Role packs define behavior only. They MUST NOT define constitutional truth.

---

## Stage 5 — Legacy / Shadow / Superseded Files

Reclassify:

- duplicate same-version files
- exported variants
- `(1)` suffix files
- older numbered files
- reference-only packs

Expected statuses:
- SUPERSEDED
- LEGACY
- SHADOW
- REFERENCE_ONLY

---

# MIGRATION PATCH RULE

Only add or update frontmatter-style metadata.

Do not alter body content unless:
- it directly claims false ACTIVE authority
- it contradicts an upper-layer authority
- it lacks superseded notice

---

# REQUIRED MIGRATION OUTPUT

For each artifact, produce:

- artifact_id
- current filename
- proposed status
- proposed layer
- proposed authority level
- supersedes / superseded_by
- migration note
- risk

---

# STOP CONDITIONS

Stop migration and request review if:

- same artifact_id has two ACTIVE candidates
- same version has different body content
- lower-layer file defines constitutional law
- role pack claims final PASS or APPLY authority
- runtime file defines new gate taxonomy
