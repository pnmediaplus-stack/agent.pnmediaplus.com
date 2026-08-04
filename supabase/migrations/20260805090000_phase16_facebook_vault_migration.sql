-- Phase 16: Facebook Tenant Vault Migration

-- 1. Insert facebook_page into integration_providers catalog
INSERT INTO tenant_integration_vault.integration_providers 
(provider_code, provider_name, provider_category, auth_type, status, capabilities, public_metadata)
VALUES
('facebook_page', 'Facebook Fan Page', 'other', 'bearer_token', 'active', '["publish", "read"]'::jsonb, '{}'::jsonb)
ON CONFLICT (provider_code) DO NOTHING;

-- 2. Drop the legacy Phase 10 social_publishers_config table
DROP TABLE IF EXISTS public.social_publishers_config CASCADE;
