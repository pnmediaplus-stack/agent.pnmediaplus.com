# 02_ARTIFACT_RECLASSIFICATION_MATRIX.md

status: ACTIVE
layer: ARTIFACT
authority_level: CORE
phase: TIER_1_5

---

# PURPOSE

Provides a standard matrix for reclassifying duplicated and legacy artifacts.

---

# STATUS DEFINITIONS

| Status | Meaning | Runtime Load Allowed |
|---|---|---|
| ACTIVE | Current authority candidate | Yes |
| IMMUTABLE | Locked constitutional artifact | Yes |
| IMMUTABLE_CANDIDATE | Freeze candidate pending registry | Yes, with caution |
| SUPERSEDED | Replaced by newer artifact | No |
| LEGACY | Historical reference | No |
| SHADOW | Duplicate or unresolved variant | No |
| EXPERIMENTAL | Draft or test artifact | No |
| REVOKED | Explicitly invalidated | No |
| REFERENCE_ONLY | Informational only | No |

---

# RECLASSIFICATION RULES

## Same artifact, same version, same content

Action:
- keep one ACTIVE candidate
- classify others as DUPLICATE_REFERENCE or SHADOW
- preserve filename in lineage table

---

## Same artifact, same version, different content

Action:
- BLOCK
- do not choose automatically
- require Governance Relay decision

Classification:
- one may become ACTIVE only after review
- others become SHADOW or SUPERSEDED

---

## Older file explicitly superseded

Action:
- mark as SUPERSEDED or REFERENCE_ONLY

Required field:
superseded_by:

---

## Role pack with authority overreach

Action:
- classify as CAPABILITY
- add restriction metadata
- remove or override authority claim through metadata

---

## Runtime doc defining constitutional law

Action:
- classify as RUNTIME
- require import declaration
- flag body section as AUTHORITY_COLLISION_REVIEW_REQUIRED

---

# RECLASSIFICATION TABLE TEMPLATE

| artifact_id | filename | current signal | proposed_status | proposed_layer | action |
|---|---|---|---|---|---|
| STD_HANDOFF_ARTIFACT_STANDARD | 09-STD_HANDOFF... | latest handoff | ACTIVE | PROTOCOL | keep |
| STD_HANDOFF_ARTIFACT_STANDARD | 01-STD_HANDOFF... | superseded_by 09 | SUPERSEDED | PROTOCOL | archive |
| STD_STATE_GATE_TAXONOMY | duplicate variants | same version variants | REVIEW_REQUIRED | PROTOCOL | compare |
| STD_ROLE_MAP | duplicate variants | same version variants | REVIEW_REQUIRED | PROTOCOL | compare |
| BOT_GATEKEEPER | bot role pack | governance capability | ACTIVE_CANDIDATE | CAPABILITY | restrict |
| BOT_GOVERNANCE_RELAY | bot role pack | apply gate capability | ACTIVE_CANDIDATE | CAPABILITY | restrict |
| EXECUTION_SPEC | runtime behavior | runtime authority | ACTIVE_CANDIDATE | RUNTIME | import protocol |

---

# HARD BLOCKS

A file cannot be ACTIVE if:

- it has no artifact_id
- it has no artifact_status
- it claims same authority as another ACTIVE file
- it redefines higher-layer law
- it has ambiguous supersession
