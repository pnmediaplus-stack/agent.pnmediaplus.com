CREATE TABLE IF NOT EXISTS public.app_settings (
    organization_id UUID NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    object_key TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_by UUID,
    CONSTRAINT app_settings_pkey PRIMARY KEY (organization_id, setting_key)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow members to read settings'
  ) THEN
    CREATE POLICY "Allow members to read settings"
        ON public.app_settings
        FOR SELECT
        USING (
            organization_id IN (
                SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()
            )
        );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_settings TO service_role;
GRANT SELECT ON TABLE public.app_settings TO authenticated;
