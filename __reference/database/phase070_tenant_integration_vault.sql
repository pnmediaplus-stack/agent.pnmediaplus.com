begin;

create extension if not exists pgcrypto;

create schema if not exists tenant_integration_vault;
revoke all on schema tenant_integration_vault from public;

create table if not exists tenant_integration_vault.integration_providers (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null unique,
  provider_name text not null,
  provider_category text not null,
  auth_type text not null,
  status text not null default 'active',
  capabilities jsonb not null default '[]'::jsonb,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_providers_code_format
    check (provider_code ~ '^[a-z0-9_]+$'),
  constraint integration_providers_name_check
    check (btrim(provider_name) <> ''),
  constraint integration_providers_category_check
    check (provider_category in ('messaging', 'crm', 'ads', 'analytics', 'storage', 'automation', 'ai', 'other')),
  constraint integration_providers_auth_type_check
    check (auth_type in ('api_key', 'oauth2', 'bearer_token', 'basic', 'webhook_secret', 'custom')),
  constraint integration_providers_status_check
    check (status in ('active', 'deprecated', 'disabled')),
  constraint integration_providers_capabilities_array_check
    check (jsonb_typeof(capabilities) = 'array'),
  constraint integration_providers_public_metadata_object_check
    check (jsonb_typeof(public_metadata) = 'object'),
  constraint integration_providers_public_metadata_no_secret_keys
    check (not (public_metadata ?| array['secret', 'token', 'api_key', 'password', 'client_secret', 'access_token', 'refresh_token']))
);

create table if not exists tenant_integration_vault.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references portal_auth.organizations(id) on delete restrict,
  provider_id uuid not null references tenant_integration_vault.integration_providers(id) on delete restrict,
  integration_key text not null,
  integration_name text not null,
  status text not null default 'configured',
  connection_state text not null default 'unverified',
  configured_by_user_id uuid references auth.users(id) on delete set null,
  current_secret_blob_id uuid,
  last_verified_at timestamptz,
  disabled_at timestamptz,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_integrations_unique_key
    unique (organization_id, integration_key),
  constraint tenant_integrations_key_format
    check (integration_key ~ '^[a-z0-9_]+$'),
  constraint tenant_integrations_name_check
    check (btrim(integration_name) <> ''),
  constraint tenant_integrations_status_check
    check (status in ('configured', 'needs_secret', 'disabled', 'revoked')),
  constraint tenant_integrations_connection_state_check
    check (connection_state in ('unverified', 'healthy', 'degraded', 'failed', 'blocked')),
  constraint tenant_integrations_public_metadata_object_check
    check (jsonb_typeof(public_metadata) = 'object'),
  constraint tenant_integrations_public_metadata_no_secret_keys
    check (not (public_metadata ?| array['secret', 'token', 'api_key', 'password', 'client_secret', 'access_token', 'refresh_token']))
);

create table if not exists tenant_integration_vault.integration_secret_blobs (
  id uuid primary key default gen_random_uuid(),
  tenant_integration_id uuid not null references tenant_integration_vault.tenant_integrations(id) on delete restrict,
  secret_revision integer not null,
  encryption_contract_ref text not null,
  key_ref text not null,
  key_version integer not null,
  encryption_algorithm text not null,
  encrypted_secret_payload jsonb not null,
  ciphertext_sha256 char(64) not null,
  created_by_actor_type text not null,
  created_by_actor_ref text not null,
  created_at timestamptz not null default now(),
  constraint integration_secret_blobs_unique_revision
    unique (tenant_integration_id, secret_revision),
  constraint integration_secret_blobs_revision_positive
    check (secret_revision > 0),
  constraint integration_secret_blobs_contract_ref_check
    check (btrim(encryption_contract_ref) <> ''),
  constraint integration_secret_blobs_key_ref_check
    check (btrim(key_ref) <> ''),
  constraint integration_secret_blobs_key_version_positive
    check (key_version > 0),
  constraint integration_secret_blobs_algorithm_check
    check (encryption_algorithm in ('external_kms_envelope_v1', 'supabase_vault_ref_v1', 'byok_envelope_v1')),
  constraint integration_secret_blobs_payload_object_check
    check (jsonb_typeof(encrypted_secret_payload) = 'object'),
  constraint integration_secret_blobs_ciphertext_sha256_format
    check (ciphertext_sha256 ~ '^[a-f0-9]{64}$'),
  constraint integration_secret_blobs_actor_type_check
    check (created_by_actor_type in ('HUMAN', 'SYSTEM', 'SERVICE', 'N8N')),
  constraint integration_secret_blobs_actor_ref_check
    check (btrim(created_by_actor_ref) <> '')
);

create table if not exists tenant_integration_vault.integration_secret_receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_integration_id uuid not null references tenant_integration_vault.tenant_integrations(id) on delete restrict,
  secret_blob_id uuid not null references tenant_integration_vault.integration_secret_blobs(id) on delete restrict,
  receipt_ref text not null unique,
  receipt_state text not null default 'issued',
  issued_by_actor_type text not null,
  issued_by_actor_ref text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_secret_receipts_ref_format
    check (receipt_ref ~ '^[a-z0-9_:-]+$'),
  constraint integration_secret_receipts_state_check
    check (receipt_state in ('issued', 'consumed', 'expired', 'revoked')),
  constraint integration_secret_receipts_actor_type_check
    check (issued_by_actor_type in ('HUMAN', 'SYSTEM', 'SERVICE', 'N8N')),
  constraint integration_secret_receipts_actor_ref_check
    check (btrim(issued_by_actor_ref) <> ''),
  constraint integration_secret_receipts_expires_after_issue
    check (expires_at is null or expires_at > issued_at),
  constraint integration_secret_receipts_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create table if not exists tenant_integration_vault.integration_access_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references portal_auth.organizations(id) on delete restrict,
  tenant_integration_id uuid references tenant_integration_vault.tenant_integrations(id) on delete set null,
  secret_blob_id uuid references tenant_integration_vault.integration_secret_blobs(id) on delete set null,
  receipt_id uuid references tenant_integration_vault.integration_secret_receipts(id) on delete set null,
  actor_type text not null,
  actor_ref text not null,
  action text not null,
  result text not null,
  reason text,
  request_id uuid,
  event_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  constraint integration_access_audit_actor_type_check
    check (actor_type in ('HUMAN', 'SYSTEM', 'SERVICE', 'N8N')),
  constraint integration_access_audit_actor_ref_check
    check (btrim(actor_ref) <> ''),
  constraint integration_access_audit_action_check
    check (action in ('PROVIDER_REGISTERED', 'INTEGRATION_CREATED', 'SECRET_STORED', 'SECRET_RECEIPT_ISSUED', 'SECRET_RECEIPT_CONSUMED', 'INTEGRATION_STATUS_CHANGED', 'ACCESS_BLOCKED')),
  constraint integration_access_audit_result_check
    check (result in ('PASS', 'BLOCK', 'FAIL')),
  constraint integration_access_audit_event_hash_format
    check (event_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists integration_providers_status_idx
  on tenant_integration_vault.integration_providers (status, provider_code);

create index if not exists tenant_integrations_org_status_idx
  on tenant_integration_vault.tenant_integrations (organization_id, status, connection_state);

create index if not exists tenant_integrations_provider_idx
  on tenant_integration_vault.tenant_integrations (provider_id, created_at desc);

create index if not exists integration_secret_blobs_integration_revision_idx
  on tenant_integration_vault.integration_secret_blobs (tenant_integration_id, secret_revision desc);

create index if not exists integration_secret_receipts_integration_state_idx
  on tenant_integration_vault.integration_secret_receipts (tenant_integration_id, receipt_state, created_at desc);

create index if not exists integration_access_audit_org_created_at_idx
  on tenant_integration_vault.integration_access_audit (organization_id, created_at desc);

create or replace function tenant_integration_vault.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function tenant_integration_vault.reject_update_delete()
returns trigger
language plpgsql
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
begin
  raise exception 'TENANT_INTEGRATION_VAULT_APPEND_ONLY_MUTATION_FORBIDDEN: %', tg_table_name
    using errcode = 'P0001';
end;
$$;

drop trigger if exists integration_providers_touch_updated_at on tenant_integration_vault.integration_providers;
create trigger integration_providers_touch_updated_at
before update on tenant_integration_vault.integration_providers
for each row execute function tenant_integration_vault.touch_updated_at();

drop trigger if exists tenant_integrations_touch_updated_at on tenant_integration_vault.tenant_integrations;
create trigger tenant_integrations_touch_updated_at
before update on tenant_integration_vault.tenant_integrations
for each row execute function tenant_integration_vault.touch_updated_at();

drop trigger if exists integration_secret_receipts_touch_updated_at on tenant_integration_vault.integration_secret_receipts;
create trigger integration_secret_receipts_touch_updated_at
before update on tenant_integration_vault.integration_secret_receipts
for each row execute function tenant_integration_vault.touch_updated_at();

drop trigger if exists integration_secret_blobs_append_only on tenant_integration_vault.integration_secret_blobs;
create trigger integration_secret_blobs_append_only
before update or delete on tenant_integration_vault.integration_secret_blobs
for each row execute function tenant_integration_vault.reject_update_delete();

drop trigger if exists integration_access_audit_append_only on tenant_integration_vault.integration_access_audit;
create trigger integration_access_audit_append_only
before update or delete on tenant_integration_vault.integration_access_audit
for each row execute function tenant_integration_vault.reject_update_delete();

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'tenant_integration_vault'
      and rel.relname = 'tenant_integrations'
      and c.conname = 'tenant_integrations_current_secret_blob_fk'
  ) then
    alter table tenant_integration_vault.tenant_integrations
      add constraint tenant_integrations_current_secret_blob_fk
      foreign key (current_secret_blob_id)
      references tenant_integration_vault.integration_secret_blobs(id)
      on delete set null;
  end if;
end $$;

alter table tenant_integration_vault.integration_providers enable row level security;
alter table tenant_integration_vault.tenant_integrations enable row level security;
alter table tenant_integration_vault.integration_secret_blobs enable row level security;
alter table tenant_integration_vault.integration_secret_receipts enable row level security;
alter table tenant_integration_vault.integration_access_audit enable row level security;

alter table tenant_integration_vault.integration_providers force row level security;
alter table tenant_integration_vault.tenant_integrations force row level security;
alter table tenant_integration_vault.integration_secret_blobs force row level security;
alter table tenant_integration_vault.integration_secret_receipts force row level security;
alter table tenant_integration_vault.integration_access_audit force row level security;

drop policy if exists integration_providers_catalog_read on tenant_integration_vault.integration_providers;
create policy integration_providers_catalog_read
  on tenant_integration_vault.integration_providers
  for select
  to authenticated
  using (status in ('active', 'deprecated'));

drop policy if exists tenant_integrations_member_status_read on tenant_integration_vault.tenant_integrations;
create policy tenant_integrations_member_status_read
  on tenant_integration_vault.tenant_integrations
  for select
  to authenticated
  using (portal_auth.is_org_member(organization_id));

drop policy if exists integration_secret_blobs_deny_client on tenant_integration_vault.integration_secret_blobs;
create policy integration_secret_blobs_deny_client
  on tenant_integration_vault.integration_secret_blobs
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists integration_secret_receipts_deny_client on tenant_integration_vault.integration_secret_receipts;
create policy integration_secret_receipts_deny_client
  on tenant_integration_vault.integration_secret_receipts
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists integration_access_audit_deny_client on tenant_integration_vault.integration_access_audit;
create policy integration_access_audit_deny_client
  on tenant_integration_vault.integration_access_audit
  for all
  to anon, authenticated
  using (false)
  with check (false);

do $$
begin
  revoke all on schema tenant_integration_vault from public;

  revoke all on table tenant_integration_vault.integration_providers from public;
  revoke all on table tenant_integration_vault.tenant_integrations from public;
  revoke all on table tenant_integration_vault.integration_secret_blobs from public;
  revoke all on table tenant_integration_vault.integration_secret_receipts from public;
  revoke all on table tenant_integration_vault.integration_access_audit from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema tenant_integration_vault from anon;
    revoke all on table tenant_integration_vault.integration_providers from anon;
    revoke all on table tenant_integration_vault.tenant_integrations from anon;
    revoke all on table tenant_integration_vault.integration_secret_blobs from anon;
    revoke all on table tenant_integration_vault.integration_secret_receipts from anon;
    revoke all on table tenant_integration_vault.integration_access_audit from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on schema tenant_integration_vault from authenticated;
    revoke all on table tenant_integration_vault.integration_providers from authenticated;
    revoke all on table tenant_integration_vault.tenant_integrations from authenticated;
    revoke all on table tenant_integration_vault.integration_secret_blobs from authenticated;
    revoke all on table tenant_integration_vault.integration_secret_receipts from authenticated;
    revoke all on table tenant_integration_vault.integration_access_audit from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema tenant_integration_vault to service_role;
    grant select, insert, update, delete on tenant_integration_vault.integration_providers to service_role;
    grant select, insert, update, delete on tenant_integration_vault.tenant_integrations to service_role;
    grant select, insert on tenant_integration_vault.integration_secret_blobs to service_role;
    grant select, insert, update on tenant_integration_vault.integration_secret_receipts to service_role;
    grant select, insert on tenant_integration_vault.integration_access_audit to service_role;
  end if;
end $$;

create or replace view public.phase070_integration_provider_catalog as
select
  provider_code,
  provider_name,
  provider_category,
  auth_type,
  status,
  capabilities,
  public_metadata,
  created_at,
  updated_at
from tenant_integration_vault.integration_providers
where status in ('active', 'deprecated');

create or replace view public.phase070_tenant_integration_status as
select
  o.id as organization_id,
  o.organization_key,
  p.provider_code,
  p.provider_name,
  p.provider_category,
  i.integration_key,
  i.integration_name,
  i.status,
  i.connection_state,
  i.last_verified_at,
  (i.current_secret_blob_id is not null) as credential_configured,
  i.public_metadata,
  i.created_at,
  i.updated_at
from tenant_integration_vault.tenant_integrations i
join portal_auth.organizations o
  on o.id = i.organization_id
join tenant_integration_vault.integration_providers p
  on p.id = i.provider_id
where portal_auth.is_org_member(i.organization_id);

do $$
begin
  revoke all on table public.phase070_integration_provider_catalog from public;
  revoke all on table public.phase070_tenant_integration_status from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.phase070_integration_provider_catalog from anon;
    revoke all on table public.phase070_tenant_integration_status from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.phase070_integration_provider_catalog to authenticated;
    grant select on public.phase070_tenant_integration_status to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.phase070_integration_provider_catalog to service_role;
    grant select on public.phase070_tenant_integration_status to service_role;
  end if;
end $$;

commit;
