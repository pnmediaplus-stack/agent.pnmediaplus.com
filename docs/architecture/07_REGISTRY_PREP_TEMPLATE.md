# 07_REGISTRY_PREP_TEMPLATE.md

status: ACTIVE
layer: ARTIFACT
authority_level: CORE
phase: TIER_1_5

---

# PURPOSE

Prepares the corpus for Tier 2 Canonical Registry Kernel.

This is NOT the registry yet.

This is the staging table used to build the registry safely.

---

# REGISTRY PREP TABLE

| artifact_id | active_candidate | version | layer | authority_level | status | notes |
|---|---|---|---|---|---|---|
| PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE | TBD | 2.0.0 | CONSTITUTION | SUPREME | ACTIVE | Supreme law |
| ACTIVE_CONSTITUTION_SET | ACTIVE_CONSTITUTION_SET_STEP1.md | 1.0.0 | CONSTITUTION | SUPREME | ACTIVE_CANDIDATE | Root trust |
| CONSTITUTIONAL_FREEZE_METADATA_STANDARD | CONSTITUTIONAL_FREEZE_METADATA_STANDARD_STEP2.md | 1.0.0 | CONSTITUTION | CORE | ACTIVE_CANDIDATE | Metadata standard |
| STD_STATE_GATE_TAXONOMY | TBD | 1.0.0 | PROTOCOL | CORE | REVIEW_REQUIRED | Duplicate variants exist |
| STD_HANDOFF_ARTIFACT_STANDARD | 09-STD_HANDOFF_ARTIFACT_STANDARD_v1.0-9-.md | 1.0.0 | PROTOCOL | CORE | ACTIVE_CANDIDATE | 01 variant superseded |
| STD_CANONICAL_ROLE_MAP | TBD | 1.0.0 | PROTOCOL | CORE | REVIEW_REQUIRED | Duplicate variants exist |
| STD_CANONICAL_PROMPT_FRAMEWORK | TBD | 1.0.0 | PROTOCOL | CORE | REVIEW_REQUIRED | Multiple variants exist |
| EXECUTION_SPEC | 11-EXECUTION_SPEC-5-.md | TBD | RUNTIME | RUNTIME | ACTIVE_CANDIDATE | Must import protocol |
| BOT_PN_OS_GATEKEEPER | 01-BOT_PN_OS_GATEKEEPER_v1.0-1-.md | 1.0.0 | CAPABILITY | LOCAL | ACTIVE_CANDIDATE | Must not redesign |
| BOT_PN_OS_GOVERNANCE_RELAY | 02-BOT_PN_OS_GOVERNANCE_RELAY_v1.0-1-.md | 1.0.0 | CAPABILITY | LOCAL | ACTIVE_CANDIDATE | Must not implement |
| BOT_PN_OS_ARCHITECT | 15-BOT_PN_OS_ARCHITECT_v1.0-3-.txt | 1.0.0 | CAPABILITY | LOCAL | ACTIVE_CANDIDATE | Must not grant PASS |

---

# FIELDS TO ADD IN TIER 2

Tier 2 registry must add:

- content_sha256
- canonical_path
- supersedes
- superseded_by
- approved_by
- approved_at
- registry_status
- runtime_load_allowed

---

# BLOCKERS BEFORE TIER 2

Tier 2 must not start until:

- active candidates identified
- unresolved duplicates listed
- superseded artifacts classified
- Gatekeeper checklist exists
- Governance Relay apply protocol exists
