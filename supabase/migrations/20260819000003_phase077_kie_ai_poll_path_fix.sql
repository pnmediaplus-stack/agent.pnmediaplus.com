-- Fix kie_ai provider metadata poll_path to use the correct camelCase endpoint
UPDATE tenant_integration_vault.integration_providers
SET public_metadata = jsonb_set(
    COALESCE(public_metadata, '{}'::jsonb),
    '{poll_path}',
    '"/jobs/recordInfo"'
)
WHERE provider_code = 'kie_ai';
