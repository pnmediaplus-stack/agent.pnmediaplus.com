-- Phase 10 Hotfix: Migrate Facebook Config Persistence to Supabase

CREATE TABLE IF NOT EXISTS public.social_publishers_config (
    organization_id uuid PRIMARY KEY REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    facebook_page_id text,
    facebook_access_token text, -- Stores the AES-GCM encrypted payload
    facebook_enabled boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for security
ALTER TABLE public.social_publishers_config ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_social_publishers" ON public.social_publishers_config FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users (Tenants) can read their own organization config
CREATE POLICY "tenant_read_social_publishers" ON public.social_publishers_config FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid()
  )
);

-- Note: INSERT and UPDATE policies for authenticated users have been intentionally omitted.
-- All write operations MUST flow through the Next.js API route (/api/settings/facebook) 
-- which enforces 'admin' role checks and uses the service_role key to write to the database.

-- Explicit Grants for PostgREST
GRANT ALL ON public.social_publishers_config TO service_role;
GRANT SELECT ON public.social_publishers_config TO authenticated;
