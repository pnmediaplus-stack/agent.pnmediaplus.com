-- Seed Kie AI Provider
insert into tenant_integration_vault.integration_providers 
(provider_code, provider_name, provider_category, auth_type, status, capabilities, public_metadata)
values (
  'kie_ai',
  'Kie AI',
  'ai',
  'bearer_token',
  'active',
  '["text", "image"]'::jsonb,
  '{
    "base_url": "https://api.kie.ai/v1",
    "models": [
      {
        "code": "flux-kontext-pro",
        "capability": "image",
        "prompt_cost": 0,
        "completion_cost": 25.0,
        "endpoint": "https://api.kie.ai/api/v1/flux/kontext/generate",
        "request_contract": "legacy_generate"
      },
      {
        "code": "nano-banana-2-lite",
        "capability": "image",
        "prompt_cost": 0,
        "completion_cost": 15.0,
        "endpoint_template": "/images/generations",
        "request_contract": "standard_generations"
      }
    ]
  }'::jsonb
)
on conflict (provider_code) do update set 
  provider_name = excluded.provider_name,
  provider_category = excluded.provider_category,
  auth_type = excluded.auth_type,
  capabilities = excluded.capabilities,
  public_metadata = excluded.public_metadata;
