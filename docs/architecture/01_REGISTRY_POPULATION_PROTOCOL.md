# 01_REGISTRY_POPULATION_PROTOCOL

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines how artifacts enter the canonical registry population pipeline.

---

# POPULATION FLOW

1. Inventory artifact
2. Extract metadata
3. Assign or verify artifact_id
4. Compute SHA256
5. Determine candidate status
6. Detect conflicts
7. Add clean entries to registry draft
8. Add unresolved entries to conflict queue
9. Submit registry patch proposal to Gatekeeper

---

# IMPORTANT DISTINCTION

Population means:
- artifact is known
- artifact has metadata
- artifact has hash
- artifact is ready for review

Population does NOT mean:
- artifact is approved
- artifact is canonical
- artifact is runtime-loadable

---

# POPULATION CLASSIFICATIONS

- REGISTRY_READY
- NEEDS_METADATA_PATCH
- DUPLICATE_SAME_SHA
- SAME_VERSION_DIFFERENT_SHA
- MISSING_OWNER_AUTHORITY
- LOWER_LAYER_REDEFINITION_RISK
- SUPERSEDED_REFERENCE
- SHADOW_UNRESOLVED

---

# REQUIRED POPULATION RECORD

Each artifact must produce:

artifact_id:
version:
filename:
canonical_path_candidate:
content_sha256:
artifact_status_candidate:
constitutional_layer:
authority_level:
freeze_status:
owner_authority:
runtime_load_allowed_candidate:
conflict_status:
review_required:

---

# NEXT ACTIONS

## Immediate Next Step
- Apply this population flow to the current corpus and generate `02_INITIAL_ACTIVE_CANDIDATE_TABLE.md`.

## Required Inputs
- Current artifact filenames
- Existing metadata headers
- SHA256 values

## Recommended Owner
- Architect

## Blocking Conditions
- No file inventory
- Cannot compute SHA
- Ambiguous artifact_id

## Suggested Next Package
- Registry Conflict Queue
