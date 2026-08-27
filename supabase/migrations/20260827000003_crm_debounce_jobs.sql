-- 1. Add debounce configuration to channels
ALTER TABLE public.crm_channels
ADD COLUMN IF NOT EXISTS message_debounce_seconds INT NOT NULL DEFAULT 4;

-- 2. Create debounce jobs table
CREATE TABLE IF NOT EXISTS public.crm_thread_debounce_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.crm_channels(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.crm_threads(id) ON DELETE CASCADE,
    latest_message_id UUID NOT NULL REFERENCES public.crm_messages(id) ON DELETE CASCADE,
    latest_message_at TIMESTAMPTZ NOT NULL,
    debounce_until TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'locked', 'processed', 'cancelled', 'superseded')),
    message_count INT NOT NULL DEFAULT 1,
    locked_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for worker polling
CREATE INDEX IF NOT EXISTS idx_crm_thread_debounce_jobs_poll 
ON public.crm_thread_debounce_jobs (status, debounce_until);

-- Partial unique index to guarantee only one active job per thread
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_thread_debounce_jobs_active_unique
ON public.crm_thread_debounce_jobs (organization_id, thread_id)
WHERE status IN ('pending', 'locked');

-- RLS
ALTER TABLE public.crm_thread_debounce_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for tenant users" ON public.crm_thread_debounce_jobs
    FOR SELECT USING (
        organization_id IN (
            SELECT tenant_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Service role full access" ON public.crm_thread_debounce_jobs
    FOR ALL USING (true);

GRANT ALL ON public.crm_thread_debounce_jobs TO postgres, service_role;

-- 3. RPC for upserting debounce job from webhooks
CREATE OR REPLACE FUNCTION public.crm_upsert_debounce_job(
    p_organization_id UUID,
    p_channel_id UUID,
    p_thread_id UUID,
    p_message_id UUID,
    p_debounce_seconds INT DEFAULT 4
) RETURNS UUID AS $$
DECLARE
    v_job_id UUID;
    v_new_debounce_until TIMESTAMPTZ;
BEGIN
    v_new_debounce_until := now() + make_interval(secs => p_debounce_seconds);

    -- Try to update an existing pending job
    UPDATE public.crm_thread_debounce_jobs
    SET 
        latest_message_id = p_message_id,
        latest_message_at = now(),
        debounce_until = v_new_debounce_until,
        message_count = message_count + 1,
        updated_at = now()
    WHERE organization_id = p_organization_id
      AND thread_id = p_thread_id
      AND status = 'pending'
    RETURNING id INTO v_job_id;

    -- If no pending job exists, insert a new one
    IF v_job_id IS NULL THEN
        INSERT INTO public.crm_thread_debounce_jobs (
            organization_id,
            channel_id,
            thread_id,
            latest_message_id,
            latest_message_at,
            debounce_until,
            status,
            message_count
        ) VALUES (
            p_organization_id,
            p_channel_id,
            p_thread_id,
            p_message_id,
            now(),
            v_new_debounce_until,
            'pending',
            1
        )
        RETURNING id INTO v_job_id;
    END IF;

    RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_upsert_debounce_job TO service_role, postgres;

-- 4. RPC for worker to claim jobs
CREATE OR REPLACE FUNCTION public.crm_claim_debounce_jobs(
    p_limit INT DEFAULT 50
) RETURNS SETOF public.crm_thread_debounce_jobs AS $$
BEGIN
    RETURN QUERY
    UPDATE public.crm_thread_debounce_jobs
    SET 
        status = 'locked',
        locked_at = now(),
        updated_at = now()
    WHERE id IN (
        SELECT id 
        FROM public.crm_thread_debounce_jobs 
        WHERE status = 'pending' 
          AND debounce_until <= now()
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_claim_debounce_jobs TO service_role, postgres;
