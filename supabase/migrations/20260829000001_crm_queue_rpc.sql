-- Create RPC for atomic job claiming with rate limits (max 2 per page) and stale recovery
CREATE OR REPLACE FUNCTION public.phase077_claim_crm_outbound_queue()
RETURNS SETOF public.crm_outbound_queue AS $$
BEGIN
    RETURN QUERY
    WITH locked_jobs AS (
        SELECT q.id, q.page_id, q.created_at
        FROM public.crm_outbound_queue q
        WHERE (q.status = 'pending' AND q.next_retry_at <= NOW())
           OR (q.status = 'processing' AND q.locked_until < NOW())
        ORDER BY q.page_id, q.created_at, q.id
        FOR UPDATE SKIP LOCKED
        LIMIT 100
    ),
    chosen_jobs AS (
        SELECT lj.id
        FROM locked_jobs lj
        WHERE (
            SELECT COUNT(*)
            FROM locked_jobs lj2
            WHERE lj2.page_id = lj.page_id
              AND (
                lj2.created_at < lj.created_at
                OR (lj2.created_at = lj.created_at AND lj2.id <= lj.id)
              )
        ) <= 2
    )
    UPDATE public.crm_outbound_queue q
    SET status = 'processing',
        locked_until = NOW() + INTERVAL '1 minute',
        updated_at = NOW()
    FROM chosen_jobs c
    WHERE q.id = c.id
    RETURNING q.*;
END;
$$ LANGUAGE plpgsql;
