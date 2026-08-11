import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type DepartmentGovernanceLoadState = "ready" | "blocked";

export type DepartmentGovernanceLoadResult =
  | {
      state: "ready";
      reason: "DEPARTMENT_GOVERNANCE_BUNDLE_LOADED";
      data: DepartmentGovernanceBundle;
    }
  | {
      state: "blocked";
      reason: string;
      data: null;
    };

export type DepartmentGovernanceBundle = {
  rootPath: string;
  migrationSqlPath: string;
  verificationQueriesPath: string;
  registryJsonPath: string;
  registryYamlPath: string;
  packsJsonPath: string;
  packsYamlPath: string;
  handoffJsonPath: string;
  handoffYamlPath: string;
  migrationSql: string;
  verificationQueriesSql: string;
  registryJson: DepartmentRegistryBundle;
  packsJson: DepartmentPacksBundle;
  handoffJson: DepartmentHandoffContract;
  registryYamlText: string;
  packsYamlText: string;
  handoffYamlText: string;
};

export type DepartmentRegistryBundle = {
  registry_schema_version: string;
  registry_id: string;
  registry_name: string;
  registry_status: string;
  registry_mode: string;
  registry_version: string;
  created_at: string;
  updated_at: string;
  source_of_truth: string;
  owner_role: string;
  department_records: DepartmentRegistryRecord[];
};

export type DepartmentRegistryRecord = {
  department_id: string;
  department_name: string;
  department_pack: string;
  department_pack_key: string;
  owner_role: string;
  owner_team: string;
  primary_purpose: string;
  canonical_truth_source: string;
  allowed_actions: string[];
  must_not_actions: string[];
  dependencies: string[];
  downstream_recipients: string[];
  current_state: string;
  handoff_required: boolean;
  qa_required: boolean;
  human_review_required: boolean;
  notes: string;
};

export type DepartmentPacksBundle = {
  department_pack_version: string;
  department_packs: Record<string, DepartmentPackRecord>;
};

export type DepartmentPackRecord = {
  owner: string[];
  canonical_truth_source: string[];
  allowed_actions: string[];
  must_not_actions: string[];
  dependencies: string[];
  handoff_to: string[];
  qa_expectation: string;
};

export type DepartmentHandoffContract = {
  handoff_schema_version: string;
  handoff_id: string;
  handoff_type: string;
  source_department: string;
  source_owner: string;
  target_department: string;
  target_owner: string;
  current_state: string;
  requested_next_state: string;
  source_artifacts: string[];
  source_truth: string;
  evidence_refs: string[];
  verified_facts: string[];
  assumptions: string[];
  risks: string[];
  blocked_conditions: string[];
  approval_required: boolean;
  approval_status: string;
  qa_required: boolean;
  qa_status: string;
  public_safe: boolean;
  handoff_allowed: boolean;
  requested_decision: string;
  next_actions: string[];
  next_owner_action: string;
  timestamp_created: string;
  timestamp_updated: string;
  required_handoff_fields: string[];
  ui_sections: string[];
  integration_targets: {
    n8n: {
      transport: string;
      required_fields: string[];
    };
    db: {
      storage: string;
      record_key: string;
      audit_fields: string[];
    };
    ui: {
      rendering: string;
      required_validation: string[];
    };
  };
};

function getDepartmentGovernanceRoot() {
  return path.resolve(process.cwd(), "__reference", "integration", "department-governance");
}

async function readUtf8File(filePath: string) {
  return readFile(filePath, "utf8");
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const text = await readUtf8File(filePath);
  return JSON.parse(text) as T;
}

export async function loadDepartmentGovernanceBundle(): Promise<DepartmentGovernanceLoadResult> {
  const rootPath = getDepartmentGovernanceRoot();
  const migrationSqlPath = path.resolve(process.cwd(), "__reference", "database", "department_governance_additive_migration.sql");
  const verificationQueriesPath = path.resolve(process.cwd(), "__reference", "database", "department_governance_verification_queries.sql");
  const registryJsonPath = path.resolve(rootPath, "department_registry.json");
  const registryYamlPath = path.resolve(rootPath, "department_registry.yaml");
  const packsJsonPath = path.resolve(rootPath, "department_packs.json");
  const packsYamlPath = path.resolve(rootPath, "department_packs.yaml");
  const handoffJsonPath = path.resolve(rootPath, "handoff_contract.json");
  const handoffYamlPath = path.resolve(rootPath, "handoff_contract.yaml");

  try {
    const [
      migrationSql,
      verificationQueriesSql,
      registryJson,
      packsJson,
      handoffJson,
      registryYamlText,
      packsYamlText,
      handoffYamlText
    ] = await Promise.all([
      readUtf8File(migrationSqlPath),
      readUtf8File(verificationQueriesPath),
      readJsonFile<DepartmentRegistryBundle>(registryJsonPath),
      readJsonFile<DepartmentPacksBundle>(packsJsonPath),
      readJsonFile<DepartmentHandoffContract>(handoffJsonPath),
      readUtf8File(registryYamlPath),
      readUtf8File(packsYamlPath),
      readUtf8File(handoffYamlPath)
    ]);

    return {
      state: "ready",
      reason: "DEPARTMENT_GOVERNANCE_BUNDLE_LOADED",
      data: {
        rootPath,
        migrationSqlPath,
        verificationQueriesPath,
        registryJsonPath,
        registryYamlPath,
        packsJsonPath,
        packsYamlPath,
        handoffJsonPath,
        handoffYamlPath,
        migrationSql,
        verificationQueriesSql,
        registryJson,
        packsJson,
        handoffJson,
        registryYamlText,
        packsYamlText,
        handoffYamlText
      }
    };
  } catch (error) {
    return {
      state: "blocked",
      reason: `DEPARTMENT_GOVERNANCE_BUNDLE_LOAD_FAILED:${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}

