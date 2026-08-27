-- Migration: 20260827000002_crm_campaign_rules_and_logs.sql
-- Description: Creates tables for Proactive AI Campaigns and execution logs to prevent spam/double-sending.

BEGIN;

-- 1. Campaign Rules Table
CREATE TABLE IF NOT EXISTS public.crm_campaign_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.crm_channels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    condition_hours_inactive INTEGER NOT NULL DEFAULT 24 CHECK (condition_hours_inactive > 0),
    condition_tags JSONB DEFAULT '[]'::jsonb, -- Currently unused but reserved for future (e.g. requires tags)
    exclude_tags JSONB DEFAULT '[]'::jsonb, -- Reserved for future exclusionary tags (e.g. opt-out)
    system_prompt_override TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_rules_active ON public.crm_campaign_rules(organization_id, channel_id, is_active);

-- 2. Campaign Logs Table
CREATE TABLE IF NOT EXISTS public.crm_campaign_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.crm_campaign_rules(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.crm_threads(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'failed')),
    error_message TEXT,
    UNIQUE(campaign_id, thread_id) -- CRITICAL: Prevents sending the same campaign twice to the same thread
);
CREATE INDEX IF NOT EXISTS idx_crm_campaign_logs_thread ON public.crm_campaign_logs(thread_id);

-- Setup RLS
ALTER TABLE public.crm_campaign_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_campaign_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service Role Full Access Campaign Rules" ON public.crm_campaign_rules
    USING (auth.jwt()->>'role' = 'service_role');
CREATE POLICY "Service Role Full Access Campaign Logs" ON public.crm_campaign_logs
    USING (auth.jwt()->>'role' = 'service_role');

-- Create Trigger for updated_at
CREATE TRIGGER set_timestamp_crm_campaign_rules
BEFORE UPDATE ON public.crm_campaign_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

COMMIT;
GRANT ALL ON public.crm_campaign_rules TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.crm_campaign_logs TO postgres, anon, authenticated, service_role;
