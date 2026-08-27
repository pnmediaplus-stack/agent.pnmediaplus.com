-- Change default debounce time to 7 seconds
ALTER TABLE public.crm_channels
ALTER COLUMN message_debounce_seconds SET DEFAULT 7;

-- Update existing channels to use 7 seconds
UPDATE public.crm_channels
SET message_debounce_seconds = 7
WHERE message_debounce_seconds = 4;

-- Also update the RPC fallback default just in case
CREATE OR REPLACE FUNCTION public.crm_upsert_debounce_job(
    p_organization_id UUID,
    p_channel_id UUID,
    p_thread_id UUID,
    p_message_id UUID,
    p_debounce_seconds INT DEFAULT 7
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
