-- Create RPC for atomic job claiming with rate limits (max 2 per page) and stale recovery
CREATE OR REPLACE FUNCTION public.phase077_claim_crm_outbound_queue()
RETURNS SETOF public.crm_outbound_queue AS $$
BEGIN
    RETURN QUERY
    UPDATE public.crm_outbound_queue
    SET status = 'processing',
        locked_until = NOW() + INTERVAL '1 minute',
        updated_at = NOW()
    WHERE id IN (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER(PARTITION BY page_id ORDER BY created_at ASC) as rn
            FROM public.crm_outbound_queue
            WHERE (status = 'pending' AND next_retry_at <= NOW())
               OR (status = 'processing' AND locked_until < NOW())
            FOR UPDATE SKIP LOCKED
        ) sub
        WHERE rn <= 2
        LIMIT 20
    )
    RETURNING *;
END;
$$ LANGUAGE plpgsql;
