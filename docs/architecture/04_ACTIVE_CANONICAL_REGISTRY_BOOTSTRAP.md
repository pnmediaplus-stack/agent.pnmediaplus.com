# ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP

status: ACTIVE_CANDIDATE
layer: ARTIFACT
authority_level: SUPREME
artifact_id: ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP
version: 0.1.0
artifact_status: ACTIVE_CANDIDATE
freeze_status: EVOLVING
redefinition_policy: IMPORT_ONLY

---

# PURPOSE

Seeds the canonical registry authority before the full registry is populated.

This bootstrap prevents:
- filename authority
- newest upload authority
- latest modified authority
- ad-hoc canonical selection
- n8n deciding canonical truth

---

# CORE LAW

Registry is authority.

Filesystem is storage only.

Filename is metadata only.

Upload time is not authority.

Newest file is not authority.

---

# BOOTSTRAP REGISTRY TABLE

| artifact_id | active_candidate | version | layer | authority_level | status | runtime_load_allowed | review_status |
|---|---|---|---|---|---|---|---|
| PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE | 01_PN_OS_IMMUTABLE_SYSTEM_DIRECTIVE_v2.md | 2.0.0 | CONSTITUTION | SUPREME | ACTIVE | true | ROOT |
| ACTIVE_CONSTITUTION_SET | 02_ACTIVE_CONSTITUTION_SET.md | 1.0.0 | CONSTITUTION | SUPREME | ACTIVE | true | ROOT |
| CONSTITUTIONAL_FREEZE_METADATA_STANDARD | 03_CONSTITUTIONAL_FREEZE_METADATA_STANDARD.md | 1.0.0 | CONSTITUTION | CORE | ACTIVE | true | ROOT |
| ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP | 04_ACTIVE_CANONICAL_REGISTRY_BOOTSTRAP.md | 0.1.0 | ARTIFACT | SUPREME | ACTIVE_CANDIDATE | true | BOOTSTRAP |
| GOVERNANCE_ROLE_AUTHORITY_MAP | 05_GOVERNANCE_ROLE_AUTHORITY_MAP.md | 1.0.0 | CAPABILITY | CORE | ACTIVE | true | ROOT |

---

# REGISTRY BOOTSTRAP LIMITATION

This file is not the final registry.

It is a seed used until:

- SHA values are computed
- full artifact corpus is inventoried
- duplicate conflicts are classified
- Gatekeeper reviews active candidates
- Governance Relay applies registry patch

---

# FORBIDDEN

Architect n8n Builder must not:
- choose canonical artifact by filename
- choose canonical artifact by latest date
- mark ACTIVE without Gatekeeper/Relay process
- delete duplicate artifact
- silently resolve SHA conflicts

---

# NEXT ACTIONS

## Immediate Next Step
- Load `05_GOVERNANCE_ROLE_AUTHORITY_MAP.md`.

## Blocking Conditions
- Any workflow attempts to canonicalize without registry reference.
