# Department Governance Bundle

This bundle is the machine-readable reference set for PN OS multi-department routing.

Use it as the shared source for:

- code
- docs
- registry resolution
- handoff templates
- department pack loading

## Bundle Contents

- `department_registry.yaml`
- `department_registry.json`
- `handoff_contract.yaml`
- `handoff_contract.json`
- `department_packs.yaml`
- `department_packs.json`

## Canonical Relationship

- `docs/constitution/` holds the human-readable constitutional laws
- `docs/governance/` holds the human-readable operating references
- `__reference/integration/department-governance/` holds the machine-readable shared bundle

If these drift, the registry bundle wins for code consumption and the docs should be updated to match.

