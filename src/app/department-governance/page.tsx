import { createHash } from "node:crypto";
import { DepartmentGovernanceView } from "@/components/department-governance/DepartmentGovernanceView";
import { loadDepartmentGovernanceBundle } from "@/lib/department-governance-loader";

export const dynamic = "force-dynamic";

function stableJson(value: unknown) {
  return JSON.stringify(value);
}

function createBundleFingerprint(value: unknown) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

export default async function DepartmentGovernancePage() {
  const loaded = await loadDepartmentGovernanceBundle();

  if (loaded.state === "blocked") {
    return (
      <DepartmentGovernanceView
        response={{
          ok: false,
          state: "blocked",
          reason: loaded.reason,
          bundle_version: null,
          data: null
        }}
      />
    );
  }

  const bundle = loaded.data;
  const payload = {
    registry: bundle.registryJson,
    packs: bundle.packsJson,
    handoff_contract: bundle.handoffJson,
    migration_sql_text: bundle.migrationSql,
    verification_queries_sql_text: bundle.verificationQueriesSql
  };

  return (
    <DepartmentGovernanceView
      response={{
        ok: true,
        state: "ready",
        reason: loaded.reason,
        bundle_version: [
          bundle.registryJson.registry_version,
          bundle.packsJson.department_pack_version,
          bundle.handoffJson.handoff_schema_version
        ].join(":"),
        bundle_fingerprint: createBundleFingerprint(payload),
        source_of_truth: "__reference/integration/department-governance",
        source_files: {
          registry_json: "__reference/integration/department-governance/department_registry.json",
          packs_json: "__reference/integration/department-governance/department_packs.json",
          handoff_contract_json: "__reference/integration/department-governance/handoff_contract.json",
          migration_sql: "__reference/database/department_governance_additive_migration.sql",
          verification_queries_sql: "__reference/database/department_governance_verification_queries.sql"
        },
        data: payload
      }}
    />
  );
}
