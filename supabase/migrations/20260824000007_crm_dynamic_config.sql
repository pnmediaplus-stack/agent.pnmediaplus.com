-- Migration: 20260824000007_crm_dynamic_config.sql
-- Description: Adds system prompt to channels and creates tenant tags table

BEGIN;

-- Add bot_system_prompt to channels
ALTER TABLE public.crm_channels ADD COLUMN IF NOT EXISTS bot_system_prompt TEXT;

-- Create crm_tenant_tags table
CREATE TABLE IF NOT EXISTS public.crm_tenant_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, tag_name)
);

-- Enable RLS
ALTER TABLE public.crm_tenant_tags ENABLE ROW LEVEL SECURITY;

-- Grant service_role access
GRANT ALL ON TABLE public.crm_tenant_tags TO service_role;

-- Example Authenticated Access
CREATE POLICY "Allow members to view tags" ON public.crm_tenant_tags
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()
  )
);

COMMIT;
