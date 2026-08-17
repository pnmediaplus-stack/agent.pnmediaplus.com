-- Add active_campaign_id to chat_threads to store context
ALTER TABLE pn_os_ai_department.chat_threads
ADD COLUMN IF NOT EXISTS active_campaign_id uuid REFERENCES pn_content_phase2.campaigns(id) ON DELETE SET NULL;

-- Update phase1_chat_threads view to include active_campaign_id if it exists
DO $$
BEGIN
  IF to_regclass('public.phase1_chat_threads') IS NOT NULL THEN
    -- Drop the trigger first
    DROP TRIGGER IF EXISTS phase1_chat_threads_insert_instead ON public.phase1_chat_threads;
    
    -- Recreate view
    CREATE OR REPLACE VIEW public.phase1_chat_threads AS
      SELECT
        id,
        coalesce(subject, 'Human Command Center') AS title,
        coalesce(purpose, '') AS purpose,
        last_activity_at AS "lastActivityAt",
        last_activity_at AS last_activity_at,
        thread_status::text AS status,
        created_at AS "createdAt",
        created_at AS created_at,
        active_campaign_id
      FROM pn_os_ai_department.chat_threads;

    GRANT SELECT, INSERT ON public.phase1_chat_threads TO anon, authenticated, service_role;

    -- Recreate trigger
    CREATE TRIGGER phase1_chat_threads_insert_instead
    INSTEAD OF INSERT ON public.phase1_chat_threads
    FOR EACH ROW EXECUTE FUNCTION public.phase1_chat_threads_insert();
  END IF;
END
$$;
