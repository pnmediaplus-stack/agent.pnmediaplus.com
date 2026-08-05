export const PORTAL_ACCESS_COOKIE = "pn_portal_access_token";
export const PORTAL_REFRESH_COOKIE = "pn_portal_refresh_token";

type SupabaseAuthConfig = {
  url: string;
  anonKey: string;
};

type SupabaseLoginResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
  };
};

type PortalUser = {
  id: string;
  email: string;
};

type PortalOrganizationRow = {
  organization_id?: unknown;
  organization_key?: unknown;
  organization_name?: unknown;
  status?: unknown;
  metadata?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

type PortalMembershipRow = {
  membership_id?: unknown;
  organization_id?: unknown;
  organization_key?: unknown;
  organization_name?: unknown;
  user_id?: unknown;
  role?: unknown;
  status?: unknown;
  invited_by_user_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
};

export type PortalOrganization = {
  organization_id: string;
  organization_key: string;
  organization_name: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
};

export type PortalOrganizationMembership = {
  membership_id: string;
  organization_id: string;
  organization_key: string;
  organization_name: string;
  user_id: string;
  role: string;
  status: string;
  invited_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PortalOrganizationContextLoadResult =
  | {
      state: "ready";
      reason: "PORTAL_ORGANIZATION_CONTEXT_LOADED";
      organizations: PortalOrganization[];
      memberships: PortalOrganizationMembership[];
      active_membership: PortalOrganizationMembership;
    }
  | {
      state: "blocked";
      reason: string;
      organizations: [];
      memberships: [];
      active_membership: null;
    };

function getSupabaseAuthConfig(): SupabaseAuthConfig | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((part) => part.trim());
  const match = cookies.find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export function readPortalAccessToken(headers: HeadersInit | Headers) {
  return getCookieValue(new Headers(headers).get("cookie"), PORTAL_ACCESS_COOKIE);
}

export function readPortalRefreshToken(headers: HeadersInit | Headers) {
  return getCookieValue(new Headers(headers).get("cookie"), PORTAL_REFRESH_COOKIE);
}

export async function loginWithSupabasePassword(email: string, password: string) {
  const config = getSupabaseAuthConfig();

  if (!config) {
    return {
      state: "blocked" as const,
      status: 503,
      reason: "PORTAL_AUTH_SUPABASE_ENV_MISSING"
    };
  }

  const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: config.anonKey,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      state: "blocked" as const,
      status: response.status === 400 ? 401 : response.status,
      reason: `PORTAL_AUTH_LOGIN_FAILED:${response.status}:${body || response.statusText}`
    };
  }

  const payload = (await response.json().catch(() => null)) as SupabaseLoginResponse | null;

  if (!payload?.access_token || !payload.refresh_token) {
    return {
      state: "blocked" as const,
      status: 502,
      reason: "PORTAL_AUTH_LOGIN_INVALID_RESPONSE"
    };
  }

  return {
    state: "ready" as const,
    status: 200,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 3600,
    user: {
      id: payload.user?.id ?? "",
      email: payload.user?.email ?? email
    }
  };
}

export async function verifySupabaseAccessToken(accessToken: string | null): Promise<PortalUser | null> {
  if (!accessToken) return null;
  const config = getSupabaseAuthConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/user`, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    });

    if (!response.ok) return null;

    const user = (await response.json().catch(() => null)) as { id?: string; email?: string } | null;
    if (!user?.id || !user.email) return null;

    return {
      id: user.id,
      email: user.email
    };
  } catch {
    return null;
  }
}

export async function refreshSupabaseToken(refreshToken: string | null) {
  if (!refreshToken) return null;
  const config = getSupabaseAuthConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!response.ok) return null;

    const payload = (await response.json().catch(() => null)) as SupabaseLoginResponse | null;
    if (!payload?.access_token || !payload.refresh_token || !payload.user?.id || !payload.user.email) {
      return null;
    }

    return {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
      expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : 3600,
      user: {
        id: payload.user.id,
        email: payload.user.email
      }
    };
  } catch {
    return null;
  }
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectField(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeOrganization(row: PortalOrganizationRow): PortalOrganization | null {
  const organizationId = stringField(row.organization_id);
  const organizationKey = stringField(row.organization_key);
  const organizationName = stringField(row.organization_name);
  const status = stringField(row.status);

  if (!organizationId || !organizationKey || !organizationName || !status) return null;

  return {
    organization_id: organizationId,
    organization_key: organizationKey,
    organization_name: organizationName,
    status,
    metadata: objectField(row.metadata),
    created_at: stringField(row.created_at),
    updated_at: stringField(row.updated_at)
  };
}

function normalizeMembership(row: PortalMembershipRow): PortalOrganizationMembership | null {
  const membershipId = stringField(row.membership_id);
  const organizationId = stringField(row.organization_id);
  const organizationKey = stringField(row.organization_key);
  const organizationName = stringField(row.organization_name);
  const userId = stringField(row.user_id);
  const role = stringField(row.role);
  const status = stringField(row.status);

  if (!membershipId || !organizationId || !organizationKey || !organizationName || !userId || !role || !status) return null;

  return {
    membership_id: membershipId,
    organization_id: organizationId,
    organization_key: organizationKey,
    organization_name: organizationName,
    user_id: userId,
    role,
    status,
    invited_by_user_id: stringField(row.invited_by_user_id),
    created_at: stringField(row.created_at),
    updated_at: stringField(row.updated_at)
  };
}

async function fetchPublicReadSurface<T>(accessToken: string, table: string, select: string) {
  const config = getSupabaseAuthConfig();
  if (!config) {
    return {
      state: "blocked" as const,
      reason: "PORTAL_AUTH_SUPABASE_ENV_MISSING",
      data: [] as T[]
    };
  }

  const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`);
  endpoint.searchParams.set("select", select);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "Accept-Profile": "public"
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        state: "blocked" as const,
        reason: `PORTAL_ORG_READ_SURFACE_FAILED:${table}:${response.status}:${body || response.statusText}`,
        data: [] as T[]
      };
    }

    return {
      state: "ready" as const,
      reason: "PORTAL_ORG_READ_SURFACE_LOADED",
      data: (await response.json().catch(() => [])) as T[]
    };
  } catch (error) {
    return {
      state: "blocked" as const,
      reason: `PORTAL_ORG_READ_SURFACE_FETCH_FAILED:${table}:${error instanceof Error ? error.message : String(error)}`,
      data: [] as T[]
    };
  }
}

export async function loadPortalOrganizationContext(accessToken: string, userId: string): Promise<PortalOrganizationContextLoadResult> {
  const [organizationsResult, membershipsResult] = await Promise.all([
    fetchPublicReadSurface<PortalOrganizationRow>(
      accessToken,
      "portal_organizations",
      "organization_id,organization_key,organization_name,status,metadata,created_at,updated_at"
    ),
    fetchPublicReadSurface<PortalMembershipRow>(
      accessToken,
      "portal_organization_memberships",
      "membership_id,organization_id,organization_key,organization_name,user_id,role,status,invited_by_user_id,created_at,updated_at"
    )
  ]);

  if (organizationsResult.state === "blocked") {
    return {
      state: "blocked",
      reason: organizationsResult.reason,
      organizations: [],
      memberships: [],
      active_membership: null
    };
  }

  if (membershipsResult.state === "blocked") {
    return {
      state: "blocked",
      reason: membershipsResult.reason,
      organizations: [],
      memberships: [],
      active_membership: null
    };
  }

  const organizations = organizationsResult.data.map(normalizeOrganization).filter((item): item is PortalOrganization => Boolean(item));
  const memberships = membershipsResult.data
    .map(normalizeMembership)
    .filter((item): item is PortalOrganizationMembership => Boolean(item))
    .filter((membership) => membership.user_id === userId && membership.status === "active");
  const activeMembership = memberships[0] ?? null;

  if (!activeMembership) {
    return {
      state: "blocked",
      reason: "PORTAL_ORGANIZATION_MEMBERSHIP_MISSING",
      organizations: [],
      memberships: [],
      active_membership: null
    };
  }

  return {
    state: "ready",
    reason: "PORTAL_ORGANIZATION_CONTEXT_LOADED",
    organizations: organizations.filter((organization) =>
      memberships.some((membership) => membership.organization_id === organization.organization_id)
    ),
    memberships,
    active_membership: activeMembership
  };
}

export async function requireAuthContext() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(PORTAL_ACCESS_COOKIE)?.value;
  
  if (!accessToken) {
    throw new Error("UNAUTHORIZED_MISSING_TOKEN");
  }

  const user = await verifySupabaseAccessToken(accessToken);
  if (!user) {
    throw new Error("UNAUTHORIZED_INVALID_TOKEN");
  }

  const context = await loadPortalOrganizationContext(accessToken, user.id);
  
  if (context.state === "blocked" || !context.active_membership) {
    throw new Error(`UNAUTHORIZED_BLOCKED_CONTEXT: ${context.reason}`);
  }

  return {
    userId: user.id,
    email: user.email,
    organizationId: context.active_membership.organization_id,
    role: context.active_membership.role,
    accessToken
  };
}

// Cookie constants are now exported at the top of the file
