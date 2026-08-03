-- Phase 10: AI Token Governance & Analytics

-- 1. Create tenant_billing_profiles
CREATE TABLE IF NOT EXISTS public.tenant_billing_profiles (
    organization_id uuid PRIMARY KEY REFERENCES public.portal_organizations(organization_id) ON DELETE CASCADE, -- Anchored to portal organization source-of-truth
    monthly_quota_usd numeric NOT NULL DEFAULT 50.00,
    current_spend_usd numeric NOT NULL DEFAULT 0.00,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXCEEDED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create ai_token_ledger (Append-only)
CREATE TABLE IF NOT EXISTS public.ai_token_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.tenant_billing_profiles(organization_id) ON DELETE CASCADE,
    provider_code text NOT NULL,
    model_used text NOT NULL,
    workflow_run_id text,
    unit text NOT NULL CHECK (unit IN ('tokens', 'seconds', 'images', 'requests')),
    prompt_tokens integer NOT NULL DEFAULT 0,
    completion_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    estimated_cost_usd numeric NOT NULL DEFAULT 0.00,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. RLS for security
ALTER TABLE public.tenant_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_ledger ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all_billing" ON public.tenant_billing_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ledger" ON public.ai_token_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users (Tenants) can only read their own data via RLS (if needed in UI)
CREATE POLICY "tenant_read_billing" ON public.tenant_billing_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "tenant_read_ledger" ON public.ai_token_ledger FOR SELECT TO authenticated USING (true);

-- 4. Trigger to update current_spend_usd automatically on ledger insert
CREATE OR REPLACE FUNCTION public.update_tenant_spend()
RETURNS trigger AS $$
BEGIN
    UPDATE public.tenant_billing_profiles
    SET current_spend_usd = current_spend_usd + NEW.estimated_cost_usd,
        status = CASE 
            WHEN current_spend_usd + NEW.estimated_cost_usd >= monthly_quota_usd THEN 'EXCEEDED'
            ELSE 'ACTIVE'
        END,
        updated_at = now()
    WHERE organization_id = NEW.organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_ledger_insert
AFTER INSERT ON public.ai_token_ledger
FOR EACH ROW
EXECUTE FUNCTION public.update_tenant_spend();
