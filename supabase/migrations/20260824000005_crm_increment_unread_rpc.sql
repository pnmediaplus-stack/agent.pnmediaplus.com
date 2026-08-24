-- Migration: 20260824000005_crm_increment_unread_rpc.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_unread_count(p_thread_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.crm_threads
    SET unread_count = unread_count + 1
    WHERE id = p_thread_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_unread_count(UUID) TO service_role;
REVOKE ALL ON FUNCTION public.increment_unread_count(UUID) FROM public;
REVOKE ALL ON FUNCTION public.increment_unread_count(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.increment_unread_count(UUID) FROM authenticated;

COMMIT;
