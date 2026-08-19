-- Update kie_ai provider metadata to include poll_path for image generation models
UPDATE public.integration_providers
SET public_metadata = jsonb_set(
    COALESCE(public_metadata, '{}'::jsonb),
    '{poll_path}',
    '"/jobs/record-info"'
)
WHERE provider_code = 'kie_ai';
