-- 1. Drop old constraint and index
ALTER TABLE public.crm_thread_debounce_jobs DROP CONSTRAINT IF EXISTS crm_thread_debounce_jobs_status_check;
DROP INDEX IF EXISTS idx_crm_thread_debounce_jobs_unique_pending;
DROP INDEX IF EXISTS idx_crm_thread_debounce_jobs_poll;

-- 2. Add new columns
ALTER TABLE public.crm_thread_debounce_jobs 
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS lock_token UUID;

-- Backfill next_retry_at
UPDATE public.crm_thread_debounce_jobs SET next_retry_at = debounce_until WHERE next_retry_at IS NULL;
ALTER TABLE public.crm_thread_debounce_jobs ALTER COLUMN next_retry_at SET NOT NULL;

-- 3. Add new constraint and index
ALTER TABLE public.crm_thread_debounce_jobs ADD CONSTRAINT crm_thread_debounce_jobs_status_check 
  CHECK (status IN ('pending', 'locked', 'retry_pending', 'processed', 'failed', 'cancelled', 'superseded'));

CREATE UNIQUE INDEX idx_crm_thread_debounce_jobs_unique_pending 
ON public.crm_thread_debounce_jobs (thread_id) 
WHERE status IN ('pending', 'retry_pending');

CREATE INDEX idx_crm_thread_debounce_jobs_poll 
ON public.crm_thread_debounce_jobs (status, next_retry_at);

-- 4. Update crm_upsert_debounce_job RPC
CREATE OR REPLACE FUNCTION public.crm_upsert_debounce_job(
    p_organization_id UUID,
    p_channel_id UUID,
    p_thread_id UUID,
    p_message_id UUID,
    p_debounce_seconds INT DEFAULT 7
) RETURNS void AS $$
DECLARE
    v_debounce_until TIMESTAMPTZ;
BEGIN
    v_debounce_until := now() + (p_debounce_seconds || ' seconds')::interval;

    UPDATE public.crm_thread_debounce_jobs
    SET 
        latest_message_id = p_message_id,
        latest_message_at = now(),
        debounce_until = v_debounce_until,
        next_retry_at = v_debounce_until,
        message_count = message_count + 1,
        updated_at = now()
    WHERE thread_id = p_thread_id 
      AND status IN ('pending', 'retry_pending');

    IF NOT FOUND THEN
        INSERT INTO public.crm_thread_debounce_jobs (
            organization_id, channel_id, thread_id, latest_message_id, 
            latest_message_at, debounce_until, next_retry_at, status, message_count
        ) VALUES (
            p_organization_id, p_channel_id, p_thread_id, p_message_id, 
            now(), v_debounce_until, v_debounce_until, 'pending', 1
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_upsert_debounce_job TO service_role, postgres;

-- 5. Update crm_claim_debounce_jobs RPC
CREATE OR REPLACE FUNCTION public.crm_claim_debounce_jobs(
    p_limit INT DEFAULT 50
) RETURNS SETOF public.crm_thread_debounce_jobs AS $$
DECLARE
    v_lock_token UUID := gen_random_uuid();
BEGIN
    RETURN QUERY
    UPDATE public.crm_thread_debounce_jobs
    SET 
        status = 'locked',
        locked_at = now(),
        lock_expires_at = now() + interval '5 minutes',
        lock_token = v_lock_token,
        updated_at = now()
    WHERE id IN (
        SELECT id 
        FROM public.crm_thread_debounce_jobs 
        WHERE status IN ('pending', 'retry_pending') 
          AND next_retry_at <= now()
        FOR UPDATE SKIP LOCKED
        LIMIT p_limit
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_claim_debounce_jobs TO service_role, postgres;

-- 6. Create RPC to fail job safely
CREATE OR REPLACE FUNCTION public.crm_fail_debounce_job(
    p_job_id UUID, 
    p_lock_token UUID, 
    p_error TEXT, 
    p_next_retry_at TIMESTAMPTZ,
    p_is_final_fail BOOLEAN DEFAULT false
) RETURNS void AS $$
DECLARE
    v_thread_id UUID;
    v_message_count INT;
BEGIN
    SELECT thread_id, message_count INTO v_thread_id, v_message_count 
    FROM public.crm_thread_debounce_jobs 
    WHERE id = p_job_id AND lock_token = p_lock_token;
    
    IF NOT FOUND THEN RETURN; END IF;

    IF p_is_final_fail THEN
        UPDATE public.crm_thread_debounce_jobs
        SET status = 'failed', last_error = p_error, updated_at = now()
        WHERE id = p_job_id;
        RETURN;
    END IF;

    BEGIN
        UPDATE public.crm_thread_debounce_jobs
        SET 
            status = 'retry_pending',
            last_error = p_error,
            next_retry_at = p_next_retry_at,
            attempt_count = attempt_count + 1,
            locked_at = NULL,
            lock_expires_at = NULL,
            lock_token = NULL,
            updated_at = now()
        WHERE id = p_job_id;
    EXCEPTION WHEN unique_violation THEN
        UPDATE public.crm_thread_debounce_jobs
        SET message_count = message_count + v_message_count
        WHERE thread_id = v_thread_id AND status IN ('pending', 'retry_pending');

        UPDATE public.crm_thread_debounce_jobs
        SET status = 'superseded', last_error = 'Merged into new pending job after failure'
        WHERE id = p_job_id;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_fail_debounce_job TO service_role, postgres;

-- 7. Create Reaper RPC
CREATE OR REPLACE FUNCTION public.crm_reap_dead_debounce_jobs()
RETURNS INT AS $$
DECLARE
    v_dead_job RECORD;
    v_reaped INT := 0;
BEGIN
    FOR v_dead_job IN 
        SELECT id, thread_id, message_count, lock_token, attempt_count 
        FROM public.crm_thread_debounce_jobs 
        WHERE status = 'locked' AND lock_expires_at < now()
    LOOP
        IF v_dead_job.attempt_count >= 3 THEN
            PERFORM public.crm_fail_debounce_job(v_dead_job.id, v_dead_job.lock_token, 'LOCK_EXPIRED_FINAL', now(), true);
        ELSE
            PERFORM public.crm_fail_debounce_job(
                v_dead_job.id, 
                v_dead_job.lock_token, 
                'LOCK_EXPIRED', 
                now() + (CASE 
                    WHEN v_dead_job.attempt_count = 0 THEN interval '30 seconds'
                    WHEN v_dead_job.attempt_count = 1 THEN interval '2 minutes'
                    ELSE interval '10 minutes'
                END),
                false
            );
        END IF;
        v_reaped := v_reaped + 1;
    END LOOP;
    RETURN v_reaped;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.crm_reap_dead_debounce_jobs TO service_role, postgres;
