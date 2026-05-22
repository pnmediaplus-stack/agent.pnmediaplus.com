# ACTIVE_CONSTITUTION_SET

status: ACTIVE
layer: CONSTITUTION
authority_level: SUPREME
artifact_id: ACTIVE_CONSTITUTION_SET
version: 1.0.0
artifact_status: ACTIVE
freeze_status: IMMUTABLE_CANDIDATE
redefinition_policy: IMPORT_ONLY

---

# PURPOSE

Defines the active constitutional root set for PN OS Governance OS.

This file is the root trust anchor for:
- Gatekeeper review
- Architect design
- Governance Relay apply gate
- n8n governance automation
- registry resolver runtime

---

# ACTIVE CONSTITUTIONAL ROOT SET

## 1. PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE

Authority:
- SUPREME_SYSTEM_LAW

Status:
- ACTIVE
- IMMUTABLE

Must be loaded before:
- any review
- any architecture design
- any n8n workflow design
- any registry/resolver work

---

## 2. CONSTITUTIONAL_FREEZE_METADATA_STANDARD

Authority:
- FREEZE_METADATA_AUTHORITY

Status:
- ACTIVE
- IMMUTABLE_CANDIDATE

Purpose:
- defines required metadata
- defines freeze semantics
- defines artifact status lifecycle
- defines redefinition policy

---

## 3. ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP

Authority:
- REGISTRY_BOOTSTRAP_AUTHORITY

Status:
- ACTIVE_CANDIDATE

Purpose:
- seeds registry authority
- prevents filename-based canonicalization
- blocks newest-file-wins logic

---

## 4. GOVERNANCE_ROLE_AUTHORITY_MAP

Authority:
- ROLE_CAPABILITY_AUTHORITY

Status:
- ACTIVE

Purpose:
- prevents role creep
- defines Architect/Gatekeeper/Governance Relay/n8n boundaries

---

# IMPORT LAW

All lower layers must import this set.

Lower layers must not:
- redefine this set
- bypass this set
- mutate this set
- claim equal authority without registry approval

---

# AUTHORITY ORDER

1. PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE
2. ACTIVE_CONSTITUTION_SET
3. ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP
4. PROTOCOL AUTHORITY
5. CAPABILITY AUTHORITY
6. RUNTIME AUTHORITY
7. WORKFLOW AUTHORITY
8. IMPLEMENTATION DETAIL

---

# RUNTIME LOAD RULE

Architect n8n Builder must return `NEED_MORE_SOURCE` if this file is not provided.

---

# NEXT ACTIONS

## Immediate Next Step
- Load `03_CONSTITUTIONAL_FREEZE_METADATA_STANDARD.md`.

## Required Inputs
- This file
- Immutable System Directive

## Blocking Conditions
- Lower-layer artifact claims constitutional authority without importing this set.
