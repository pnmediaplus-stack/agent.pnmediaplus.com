-- Re-create the public.phase2_assets view to expose the newly added batch_id column from pn_content_phase2.assets
-- Postgres views defined with SELECT * do not automatically inherit new columns added to the underlying table.
-- This ensures the n8n phase2 publish pipeline can strictly rely on batch_id as the SSOT for grouping assets.

CREATE OR REPLACE VIEW public.phase2_assets
AS SELECT * FROM pn_content_phase2.assets;
