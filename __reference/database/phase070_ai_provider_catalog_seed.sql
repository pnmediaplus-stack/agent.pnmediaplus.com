begin;

-- Seed OpenAI Provider
insert into tenant_integration_vault.integration_providers 
(provider_code, provider_name, provider_category, auth_type, status, capabilities, public_metadata)
values (
  'openai',
  'OpenAI',
  'ai',
  'bearer_token',
  'active',
  '["text", "image", "vision"]'::jsonb,
  '{
    "models": [
      {
        "code": "gpt-4o",
        "capability": "text",
        "prompt_cost": 5.0,
        "completion_cost": 15.0,
        "endpoint": "https://api.openai.com/v1/chat/completions"
      },
      {
        "code": "gpt-4o-mini",
        "capability": "text",
        "prompt_cost": 0.15,
        "completion_cost": 0.60,
        "endpoint": "https://api.openai.com/v1/chat/completions"
      },
      {
        "code": "gpt-image-1",
        "capability": "image",
        "prompt_cost": 40.0,
        "completion_cost": 40.0,
        "endpoint": "https://api.openai.com/v1/images/generations"
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

-- Seed Fal.ai Provider
insert into tenant_integration_vault.integration_providers 
(provider_code, provider_name, provider_category, auth_type, status, capabilities, public_metadata)
values (
  'fal_ai',
  'Fal.ai',
  'ai',
  'bearer_token',
  'active',
  '["image", "video"]'::jsonb,
  '{
    "models": [
      {
        "code": "fal-ai/flux/dev",
        "capability": "image",
        "prompt_cost": 0,
        "completion_cost": 30.0,
        "endpoint": "https://queue.fal.run/fal-ai/flux/dev"
      },
      {
        "code": "fal-ai/fast-svd",
        "capability": "video",
        "prompt_cost": 0,
        "completion_cost": 50.0,
        "endpoint": "https://queue.fal.run/fal-ai/fast-svd"
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
        "endpoint": "https://api.kie.ai/api/v1/flux/kontext/generate"
      },
      {
        "code": "nano-banana-2-lite",
        "capability": "image",
        "prompt_cost": 0,
        "completion_cost": 15.0,
        "endpoint": "https://api.kie.ai/api/v1/nano-banana-2-lite/generate"
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

commit;
