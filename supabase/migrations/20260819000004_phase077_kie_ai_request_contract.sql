-- Add request_contract to Kie AI models to support strict fail-closed contract checking

UPDATE tenant_integration_vault.integration_providers
SET public_metadata = jsonb_set(
    public_metadata,
    '{models}',
    (
        SELECT jsonb_agg(
            CASE 
                WHEN m->>'code' = 'flux-kontext-pro' THEN m || '{"request_contract": "legacy_generate"}'::jsonb
                WHEN m->>'code' = 'nano-banana-2-lite' THEN m || '{"request_contract": "jobs_create_task"}'::jsonb
                ELSE m
            END
        )
        FROM jsonb_array_elements(public_metadata->'models') AS m
    )
)
WHERE provider_code = 'kie_ai';
