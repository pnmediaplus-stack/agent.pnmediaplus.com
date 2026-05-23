import "server-only";

const PUBLIC_SCHEMA = "public";

type JsonObject = Record<string, unknown>;

type DepartmentGovernanceSnapshot = {
  registry: JsonObject | null;
  packs: JsonObject[];
  handoffs: JsonObject[];
};

type DepartmentGovernanceSourceFiles = {
  registry_json: string;
  packs_json: string;
  handoff_contract_json: string;
  migration_sql: string;
  verification_queries_sql: string;
};

type DepartmentGovernanceDbLoadResult =
  | {
      state: "ready";
      reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_LOADED";
      data: {
        snapshot: DepartmentGovernanceSnapshot;
        bundleVersion: string;
        sourceFiles: DepartmentGovernanceSourceFiles;
      };
    }
  | {
      state: "blocked";
      reason: string;
      data: null;
    };

type SupabaseConfig = {
  url: string;
  key: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!url || !key) return null;
  return { url, key };
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeJsonArray(value: unknown): JsonObject[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isJsonObject);
}

function normalizeSnapshot(value: unknown): DepartmentGovernanceSnapshot | null {
  if (!isJsonObject(value)) return null;

  const registry = isJsonObject(value.registry) ? value.registry : null;
  const packs = normalizeJsonArray(value.packs);
  const handoffs = normalizeJsonArray(value.handoffs);

  return { registry, packs, handoffs };
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function createBundleVersion(snapshot: DepartmentGovernanceSnapshot) {
  const registryVersion = stringField(snapshot.registry?.registry_version);
  const registrySchemaVersion = stringField(snapshot.registry?.registry_schema_version);

  if (!registryVersion || !registrySchemaVersion) {
    return null;
  }

  return [registryVersion, registrySchemaVersion, "public_snapshot_v1"].join(":");
}

async function fetchDepartmentGovernanceSnapshot(): Promise<DepartmentGovernanceDbLoadResult> {
  const config = getSupabaseConfig();

  if (!config) {
    return {
      state: "blocked",
      reason: "DEPARTMENT_GOVERNANCE_PUBLIC_READ_ENV_MISSING",
      data: null
    };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/rpc/department_governance_snapshot`);
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "Accept-Profile": PUBLIC_SCHEMA,
        "Content-Profile": PUBLIC_SCHEMA
      },
      body: "{}"
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        state: "blocked",
        reason: `DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_RPC_FAILED:${response.status}:${body || response.statusText}`,
        data: null
      };
    }

    const snapshot = normalizeSnapshot(await response.json());

    if (!snapshot) {
      return {
        state: "blocked",
        reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_INVALID_SHAPE",
        data: null
      };
    }

    if (!snapshot.registry) {
      return {
        state: "blocked",
        reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_REGISTRY_MISSING",
        data: null
      };
    }

    if (snapshot.packs.length === 0) {
      return {
        state: "blocked",
        reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_PACKS_EMPTY",
        data: null
      };
    }

    const bundleVersion = createBundleVersion(snapshot);

    if (!bundleVersion) {
      return {
        state: "blocked",
        reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_VERSION_MISSING",
        data: null
      };
    }

    return {
      state: "ready",
      reason: "DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_LOADED",
      data: {
        snapshot,
        bundleVersion,
        sourceFiles: {
          registry_json: "public.department_governance_snapshot().registry",
          packs_json: "public.department_governance_snapshot().packs",
          handoff_contract_json: "public.department_governance_snapshot().handoffs",
          migration_sql: "not_exposed_by_public_read_surface",
          verification_queries_sql: "not_exposed_by_public_read_surface"
        }
      }
    };
  } catch (error) {
    return {
      state: "blocked",
      reason: `DEPARTMENT_GOVERNANCE_PUBLIC_SNAPSHOT_FETCH_FAILED:${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}

export async function loadDepartmentGovernanceDbBundle(): Promise<DepartmentGovernanceDbLoadResult> {
  return fetchDepartmentGovernanceSnapshot();
}
