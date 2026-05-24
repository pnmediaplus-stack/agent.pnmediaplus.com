import "server-only";

import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

type Phase068State = "ready" | "blocked";

type Phase068Package = {
  package_id: string;
  package_name: string;
  package_state: Phase068State;
  version: string;
  solution_boundary: string;
  deployment_template_ref: string;
  activation_status: "REVIEW_REQUIRED" | "BLOCKED";
  license_boundary: string;
  support_tier: string;
  support_boundary: string;
  update_boundary: string;
  escalation_boundary: string;
  billing_boundary: string;
  included_surfaces: string[];
  excluded_surfaces: string[];
  mutation_allowed: false;
  authority_granted: false;
};

type Phase068WorkspaceScaffold = {
  workspace_id: string;
  organization_id: string;
  organization_key: string;
  organization_name: string;
  role: string;
  state: Phase068State;
  reason: string;
  isolated_by_organization: true;
  mutation_allowed: false;
};

type Phase068LicenseSupportBoundary = {
  state: Phase068State;
  license_model: string;
  support_model: string;
  escalation_boundary: string;
  billing_boundary: string;
  activation_boundary: string;
  mutation_allowed: false;
};

export type Phase068ProductPortalCore = {
  state: Phase068State;
  reason: string;
  roadmap_ref: "docs/governance/068_PRODUCT_PORTAL_COMMERCIAL_PACKAGING_ROADMAP_v1.md";
  source_of_truth_unchanged: true;
  wordpress_out_of_scope: true;
  public_signup_allowed: false;
  mutation_allowed: false;
  authority_granted: false;
  identity_shell: {
    state: Phase068State;
    user_id: string | null;
    email: string | null;
    reason: string;
  };
  tenant_shell: {
    state: Phase068State;
    active_organization_id: string | null;
    active_organization_name: string | null;
    active_role: string | null;
    memberships_count: number;
    reason: string;
  };
  package_catalog: Phase068Package[];
  workspace_scaffold: Phase068WorkspaceScaffold | null;
  workspace_flow: {
    step_id: string;
    state: Phase068State;
    owner: string;
    description: string;
  }[];
  license_support_boundary: Phase068LicenseSupportBoundary;
  stop_conditions: {
    condition_id: string;
    triggered: boolean;
    message: string;
  }[];
  blocker: string | null;
};

function createPackage(
  packageId: string,
  packageName: string,
  solutionBoundary: string,
  deploymentTemplateRef: string,
  includedSurfaces: string[],
  excludedSurfaces: string[]
): Phase068Package {
  return {
    package_id: packageId,
    package_name: packageName,
    package_state: "ready",
    version: "068.v1",
    solution_boundary: solutionBoundary,
    deployment_template_ref: deploymentTemplateRef,
    activation_status: "REVIEW_REQUIRED",
    license_boundary: "Entitlement preview only. No license is issued from this portal.",
    support_tier: "Internal support review required before customer-facing enablement.",
    support_boundary: "Support scope is displayed for review and does not open a support workflow.",
    update_boundary: "Updates require explicit versioned package review.",
    escalation_boundary: "Commercial, legal, or customer-facing changes escalate to Human/Gatekeeper review.",
    billing_boundary: "Billing, checkout, invoicing, and paid activation are out of scope.",
    included_surfaces: includedSurfaces,
    excluded_surfaces: excludedSurfaces,
    mutation_allowed: false,
    authority_granted: false
  };
}

function createBlockedPackage(packageId: string, packageName: string): Phase068Package {
  return {
    package_id: packageId,
    package_name: packageName,
    package_state: "blocked",
    version: "068.v1",
    solution_boundary: "Blocked until tenant context is ready.",
    deployment_template_ref: "pending / incomplete",
    activation_status: "BLOCKED",
    license_boundary: "pending / incomplete",
    support_tier: "pending / incomplete",
    support_boundary: "pending / incomplete",
    update_boundary: "pending / incomplete",
    escalation_boundary: "pending / incomplete",
    billing_boundary: "pending / incomplete",
    included_surfaces: [],
    excluded_surfaces: ["pending / incomplete"],
    mutation_allowed: false,
    authority_granted: false
  };
}

function createCatalog(tenantReady: boolean): Phase068Package[] {
  if (!tenantReady) {
    return [
      createBlockedPackage("068.package.portal_core", "Product Portal Core"),
      createBlockedPackage("068.package.commercial_packaging", "Commercial Packaging"),
      createBlockedPackage("068.package.workspace_onboarding", "Workspace Onboarding")
    ];
  }

  return [
    createPackage(
      "068.package.portal_core",
      "Product Portal Core",
      "Identity shell, tenant shell, and governed workspace frame.",
      "template://phase068/product_portal_core/v1",
      ["Supabase Auth identity shell", "Organization membership display", "Read-only workspace frame"],
      ["Public signup", "Self-service activation", "WordPress dependency"]
    ),
    createPackage(
      "068.package.commercial_packaging",
      "Commercial Packaging",
      "Package catalog, solution packaging, support boundary, and update boundary.",
      "template://phase068/commercial_packaging/v1",
      ["Read-only package catalog", "License boundary display", "Support boundary display"],
      ["Billing mutation", "License issuance", "Auto-upgrade path"]
    ),
    createPackage(
      "068.package.workspace_onboarding",
      "Workspace Onboarding",
      "Customer workspace scaffold isolated by organization.",
      "template://phase068/workspace_onboarding/v1",
      ["Tenant workspace shell", "Organization isolation", "Membership role display"],
      ["Workspace creation mutation", "Self-activation", "Cross-tenant access"]
    )
  ];
}

function createWorkspaceFlow(tenantReady: boolean) {
  return [
    {
      step_id: "068.workspace.identity",
      state: "ready" as const,
      owner: "Portal Auth",
      description: "Supabase Auth session is required before portal shell access."
    },
    {
      step_id: "068.workspace.tenant",
      state: tenantReady ? ("ready" as const) : ("blocked" as const),
      owner: "Portal Organization Membership",
      description: tenantReady ? "Active organization membership scopes the workspace." : "Active membership is required before workspace display."
    },
    {
      step_id: "068.workspace.catalog",
      state: tenantReady ? ("ready" as const) : ("blocked" as const),
      owner: "Product Portal",
      description: tenantReady ? "Package catalog is readable inside tenant context." : "Package catalog remains blocked without tenant context."
    }
  ];
}

function createLicenseSupportBoundary(tenantReady: boolean): Phase068LicenseSupportBoundary {
  return {
    state: tenantReady ? "ready" : "blocked",
    license_model: tenantReady ? "Read-only entitlement preview. No license issuance in Phase 068." : "pending / incomplete",
    support_model: tenantReady ? "Internal support boundary display only. No support ticket mutation." : "pending / incomplete",
    escalation_boundary: "Commercial, legal, and customer-facing support changes require Human/Gatekeeper review.",
    billing_boundary: "Billing and paid plan activation are out of scope for this UI pass.",
    activation_boundary: "Package activation remains review-required and cannot self-activate.",
    mutation_allowed: false
  };
}

function stopCondition(conditionId: string, triggered: boolean, message: string) {
  return {
    condition_id: conditionId,
    triggered,
    message
  };
}

export async function loadPhase068ProductPortalCore(headers: Headers | HeadersInit): Promise<Phase068ProductPortalCore> {
  const accessToken = readPortalAccessToken(headers);
  const user = await verifySupabaseAccessToken(accessToken);
  const orgContext = user && accessToken ? await loadPortalOrganizationContext(accessToken, user.id) : null;
  const activeMembership = orgContext?.state === "ready" ? orgContext.active_membership : null;
  const identityReady = Boolean(user);
  const tenantReady = Boolean(activeMembership);
  const catalog = createCatalog(tenantReady);
  const workspaceFlow = createWorkspaceFlow(tenantReady);
  const licenseSupportBoundary = createLicenseSupportBoundary(tenantReady);
  const workspaceScaffold = activeMembership
    ? {
        workspace_id: `workspace:${activeMembership.organization_key}`,
        organization_id: activeMembership.organization_id,
        organization_key: activeMembership.organization_key,
        organization_name: activeMembership.organization_name,
        role: activeMembership.role,
        state: "ready" as const,
        reason: "PHASE068_WORKSPACE_SCAFFOLD_READY",
        isolated_by_organization: true as const,
        mutation_allowed: false as const
      }
    : null;
  const stopConditions = [
    stopCondition("phase068.stop.identity_missing", !identityReady, "Portal identity session is required."),
    stopCondition("phase068.stop.tenant_missing", !tenantReady, orgContext?.reason ?? "Portal organization membership is required."),
    stopCondition("phase068.stop.public_signup", false, "Public signup is out of scope."),
    stopCondition("phase068.stop.wordpress_dependency", false, "WordPress is out of scope for canonical portal core."),
    stopCondition("phase068.stop.package_self_activation", false, "Packages must not self-activate.")
  ];
  const blocker = stopConditions.find((condition) => condition.triggered)?.message ?? null;

  return {
    state: blocker ? "blocked" : "ready",
    reason: blocker ? "PHASE068_PRODUCT_PORTAL_CORE_BLOCKED" : "PHASE068_PRODUCT_PORTAL_CORE_READY",
    roadmap_ref: "docs/governance/068_PRODUCT_PORTAL_COMMERCIAL_PACKAGING_ROADMAP_v1.md",
    source_of_truth_unchanged: true,
    wordpress_out_of_scope: true,
    public_signup_allowed: false,
    mutation_allowed: false,
    authority_granted: false,
    identity_shell: {
      state: identityReady ? "ready" : "blocked",
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      reason: identityReady ? "PHASE068_IDENTITY_SHELL_READY" : "PHASE068_IDENTITY_SHELL_BLOCKED"
    },
    tenant_shell: {
      state: tenantReady ? "ready" : "blocked",
      active_organization_id: activeMembership?.organization_id ?? null,
      active_organization_name: activeMembership?.organization_name ?? null,
      active_role: activeMembership?.role ?? null,
      memberships_count: orgContext?.state === "ready" ? orgContext.memberships.length : 0,
      reason: tenantReady ? "PHASE068_TENANT_SHELL_READY" : "PHASE068_TENANT_SHELL_BLOCKED"
    },
    package_catalog: catalog,
    workspace_scaffold: workspaceScaffold,
    workspace_flow: workspaceFlow,
    license_support_boundary: licenseSupportBoundary,
    stop_conditions: stopConditions,
    blocker
  };
}
