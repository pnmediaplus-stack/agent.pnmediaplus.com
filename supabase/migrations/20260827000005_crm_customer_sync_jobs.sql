BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_customer_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.crm_channels(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    external_user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'processed', 'failed', 'retry_pending', 'cancelled')),
    attempt_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, channel_id, external_user_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_customer_sync_jobs_pending 
ON public.crm_customer_sync_jobs (organization_id, status, next_retry_at);

-- Add avatar_url to crm_customers if it doesn't exist
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- RPC to upsert job
CREATE OR REPLACE FUNCTION public.crm_upsert_customer_sync_job(
    p_organization_id UUID,
    p_channel_id UUID,
    p_customer_id UUID,
    p_external_user_id TEXT,
    p_provider TEXT,
    p_force_refresh BOOLEAN DEFAULT false
) RETURNS void AS $$
BEGIN
    INSERT INTO public.crm_customer_sync_jobs (
        organization_id,
        channel_id,
        customer_id,
        external_user_id,
        provider,
        status,
        next_retry_at,
        attempt_count
    ) VALUES (
        p_organization_id,
        p_channel_id,
        p_customer_id,
        p_external_user_id,
        p_provider,
        'pending',
        now(),
        0
    )
    ON CONFLICT (organization_id, channel_id, external_user_id)
    DO UPDATE SET
        status = CASE 
            WHEN crm_customer_sync_jobs.status IN ('pending', 'retry_pending', 'locked') THEN crm_customer_sync_jobs.status
            WHEN p_force_refresh THEN 'pending'
            ELSE crm_customer_sync_jobs.status
        END,
        next_retry_at = CASE
            WHEN p_force_refresh THEN now()
            ELSE crm_customer_sync_jobs.next_retry_at
        END,
        attempt_count = CASE
            WHEN p_force_refresh THEN 0
            ELSE crm_customer_sync_jobs.attempt_count
        END,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_upsert_customer_sync_job TO service_role, postgres;

-- RPC to claim jobs
CREATE OR REPLACE FUNCTION public.crm_claim_customer_sync_jobs(
    p_limit INT DEFAULT 50
) RETURNS SETOF public.crm_customer_sync_jobs AS $$
DECLARE
    v_job_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO v_job_ids
    FROM (
        SELECT id 
        FROM public.crm_customer_sync_jobs
        WHERE status IN ('pending', 'retry_pending')
          AND next_retry_at <= now()
        ORDER BY next_retry_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    ) sub;

    IF v_job_ids IS NULL OR array_length(v_job_ids, 1) = 0 THEN
        RETURN;
    END IF;

    RETURN QUERY
    UPDATE public.crm_customer_sync_jobs
    SET status = 'locked',
        updated_at = now()
    WHERE id = ANY(v_job_ids)
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_claim_customer_sync_jobs TO service_role, postgres;

COMMIT;
