import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "yaml";

export type MarketingAgentLoaderState = "ready" | "blocked";

export type MarketingAgentRegistryResult =
  | {
      state: "ready";
      reason: "MARKETING_AGENT_REGISTRY_LOADED";
      data: MarketingAgentRegistry;
    }
  | {
      state: "blocked";
      reason: string;
      data: null;
    };

export type CapabilityBoundary = {
  may: string[];
  must: string[];
  must_not: string[];
  escalation_required_when: string[];
};

export type FinalAuthority = {
  pass_authority: boolean;
  apply_authority: boolean;
  deployment_authority: boolean;
  registry_apply_authority: boolean;
  financial_authority: boolean;
};

export type MarketingAgentDefinition = {
  role_id: string;
  role_name: string;
  constitutional_layer: string;
  authority_level: string;
  imports: string[];
  capability_boundary: CapabilityBoundary;
  final_authority: FinalAuthority;
};

export type MarketingAgentRegistry = {
  status: string;
  source_basis: string[];
  tier_4_guardrails: string[];
  tier_9_guardrails: string[];
  agents: MarketingAgentDefinition[];
};

export async function loadMarketingAgentRegistry(): Promise<MarketingAgentRegistryResult> {
  const rootPath = path.resolve(process.cwd(), "docs", "governance");
  const registryYamlPath = path.resolve(rootPath, "070_MARKETING_AGENT_REGISTRY.yaml");

  try {
    const yamlText = await readFile(registryYamlPath, "utf8");
    const registry = yaml.parse(yamlText) as MarketingAgentRegistry;

    // --- Strict Invariant Validation ---
    
    // 1. Status exists
    if (!registry.status) {
      throw new Error("Missing 'status' in registry.");
    }

    // 2. Exactly 7 agents
    if (!registry.agents || registry.agents.length !== 7) {
      throw new Error(`Expected exactly 7 agents, found ${registry.agents?.length || 0}`);
    }

    // 3. Each agent invariants
    for (const agent of registry.agents) {
      if (!agent.role_id) {
        throw new Error("An agent is missing 'role_id'.");
      }

      if (!agent.capability_boundary || !agent.capability_boundary.may || !agent.capability_boundary.must || !agent.capability_boundary.must_not || !agent.capability_boundary.escalation_required_when) {
        throw new Error(`Agent ${agent.role_id} is missing full capability_boundary definition.`);
      }

      const auth = agent.final_authority;
      if (!auth || auth.pass_authority !== false || auth.apply_authority !== false || auth.deployment_authority !== false || auth.registry_apply_authority !== false || auth.financial_authority !== false) {
        throw new Error(`Agent ${agent.role_id} must have all final_authority flags set strictly to false.`);
      }
    }

    return {
      state: "ready",
      reason: "MARKETING_AGENT_REGISTRY_LOADED",
      data: registry
    };

  } catch (error) {
    return {
      state: "blocked",
      reason: `MARKETING_AGENT_REGISTRY_LOAD_FAILED:${error instanceof Error ? error.message : String(error)}`,
      data: null
    };
  }
}
