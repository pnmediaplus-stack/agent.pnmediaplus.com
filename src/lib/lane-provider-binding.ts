type LaneKind = "text" | "image";

type ProviderCatalogRow = {
  provider_code?: unknown;
  public_metadata?: unknown;
};

type LaneBinding = {
  provider: string;
  model: string;
};

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function objectField(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayField(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function normalizeCapability(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function matchesLaneCapability(lane: LaneKind, capability: unknown) {
  const normalized = normalizeCapability(capability);

  if (!normalized) {
    return false;
  }

  if (lane === "text") {
    return normalized === "text" || normalized === "chat" || normalized === "completion" || normalized === "prompt";
  }

  return normalized === "image" || normalized === "vision" || normalized === "generation";
}

export function resolveLaneProviderBinding(
  providers: ProviderCatalogRow[],
  lane: LaneKind,
  preferredModel: string,
  expectedProvider?: string
): LaneBinding | null {
  const targetModel = stringField(preferredModel);
  if (!targetModel) {
    return null;
  }

  for (const row of providers) {
    const providerCode = stringField(row.provider_code);
    if (!providerCode) {
      continue;
    }

    if (expectedProvider && providerCode !== expectedProvider) {
      continue;
    }

    const metadata = objectField(row.public_metadata);
    const models = arrayField(metadata.models);

    for (const model of models) {
      const modelObject = objectField(model);
      const code = stringField(modelObject.code);
      const capability = modelObject.capability;

      if (code === targetModel && matchesLaneCapability(lane, capability)) {
        return {
          provider: providerCode,
          model: code
        };
      }
    }
  }

  return null;
}
