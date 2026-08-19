-- Fix request_contract for nano-banana-2-lite

UPDATE tenant_integration_vault.integration_providers
SET public_metadata = jsonb_set(
    public_metadata,
    '{models}',
    (
        SELECT jsonb_agg(
            CASE 
                WHEN m->>'code' = 'nano-banana-2-lite' THEN m || '{"request_contract": "standard_generations"}'::jsonb
                ELSE m
            END
        )
        FROM jsonb_array_elements(public_metadata->'models') AS m
    )
)
WHERE provider_code = 'kie_ai';
