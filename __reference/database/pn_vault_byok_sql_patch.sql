begin;

create extension if not exists pgcrypto;

create schema if not exists pn_vault;
revoke all on schema pn_vault from public;
revoke usage on schema pn_vault from public, anon, authenticated;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['ACTIVE', 'ROTATING', 'REVOKED'];
  select array_agg(e.enumlabel::text order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_vault'
    and t.typname = 'vault_credential_state';

  if existing_labels is null then
    execute format(
      'create type pn_vault.vault_credential_state as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_vault.vault_credential_state';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['ISSUED', 'CONSUMED', 'EXPIRED', 'REVOKED'];
  select array_agg(e.enumlabel::text order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_vault'
    and t.typname = 'vault_token_state';

  if existing_labels is null then
    execute format(
      'create type pn_vault.vault_token_state as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_vault.vault_token_state';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['HUMAN', 'SYSTEM', 'N8N', 'SERVICE'];
  select array_agg(e.enumlabel::text order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_vault'
    and t.typname = 'vault_actor_type';

  if existing_labels is null then
    execute format(
      'create type pn_vault.vault_actor_type as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_vault.vault_actor_type';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['STORE', 'ISSUE_TOKEN', 'REDEEM_TOKEN', 'BROKERED_CALL', 'DENY', 'REVOKE', 'ROTATE'];
  select array_agg(e.enumlabel::text order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_vault'
    and t.typname = 'vault_audit_action';

  if existing_labels is null then
    execute format(
      'create type pn_vault.vault_audit_action as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_vault.vault_audit_action';
  end if;
end $$;

create or replace function pn_vault.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function pn_vault.reject_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name using errcode = 'P0001';
end;
$$;

create or replace function pn_vault.hash_reference_token(p_token text)
returns bytea
language sql
immutable
as $$
  select extensions.digest(p_token, 'sha256');
$$;

create table if not exists pn_vault.vault_master_keys (
  id uuid primary key default gen_random_uuid(),
  key_ref text not null unique,
  key_version integer not null,
  key_fingerprint char(64) not null,
  provider_code text not null default 'server_side_kms',
  active boolean not null default true,
  activated_at timestamptz not null default now(),
  rotated_at timestamptz,
  retired_at timestamptz,
  rotation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_master_keys_version_positive check (key_version > 0),
  constraint vault_master_keys_fingerprint_format check (key_fingerprint ~ '^[a-f0-9]{64}$'),
  constraint vault_master_keys_key_ref_format check (key_ref ~ '^[a-z0-9_]+$'),
  constraint vault_master_keys_unique_ref_version unique (key_ref, key_version)
);

create index if not exists vault_master_keys_active_idx
  on pn_vault.vault_master_keys (active, key_ref, key_version);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_master_keys'
      and t.tgname = 'vault_master_keys_touch_updated_at'
  ) then
    execute 'create trigger vault_master_keys_touch_updated_at before update on pn_vault.vault_master_keys for each row execute function pn_vault.touch_updated_at()';
  end if;
end $$;

create table if not exists pn_vault.vault_credentials (
  id uuid primary key default gen_random_uuid(),
  credential_ref text not null unique,
  owner_ref text not null,
  provider_code text not null,
  credential_name text not null,
  secret_kind text not null default 'API_KEY',
  state pn_vault.vault_credential_state not null default 'ACTIVE',
  current_master_key_id uuid references pn_vault.vault_master_keys(id) on delete restrict,
  current_secret_blob_id uuid,
  notes text,
  created_by_actor_type pn_vault.vault_actor_type not null,
  created_by_actor_ref text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_credentials_ref_format check (credential_ref ~ '^[a-z0-9_]+$'),
  constraint vault_credentials_provider_format check (provider_code ~ '^[a-z0-9_]+$'),
  constraint vault_credentials_name_not_blank check (length(trim(credential_name)) > 0),
  constraint vault_credentials_secret_kind_allowed check (secret_kind in ('API_KEY', 'ACCESS_TOKEN', 'PAT', 'LLM_KEY', 'OTHER'))
);

create index if not exists vault_credentials_owner_ref_state_created_at_idx
  on pn_vault.vault_credentials (owner_ref, state, created_at);

create index if not exists vault_credentials_provider_code_idx
  on pn_vault.vault_credentials (provider_code);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_credentials'
      and t.tgname = 'vault_credentials_touch_updated_at'
  ) then
    execute 'create trigger vault_credentials_touch_updated_at before update on pn_vault.vault_credentials for each row execute function pn_vault.touch_updated_at()';
  end if;
end $$;

create table if not exists pn_vault.vault_secret_blobs (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references pn_vault.vault_credentials(id) on delete restrict,
  secret_revision integer not null,
  master_key_id uuid not null references pn_vault.vault_master_keys(id) on delete restrict,
  ciphertext bytea not null,
  ciphertext_nonce bytea not null,
  cipher_suite text not null default 'pgcrypto_sym_aes256',
  content_sha256 char(64),
  created_by_actor_type pn_vault.vault_actor_type not null,
  created_by_actor_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_secret_blobs_revision_positive check (secret_revision > 0),
  constraint vault_secret_blobs_sha256_format check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  constraint vault_secret_blobs_unique_revision unique (credential_id, secret_revision)
);

create index if not exists vault_secret_blobs_credential_id_revision_idx
  on pn_vault.vault_secret_blobs (credential_id, secret_revision desc);

create index if not exists vault_secret_blobs_master_key_id_created_at_idx
  on pn_vault.vault_secret_blobs (master_key_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_secret_blobs'
      and t.tgname = 'vault_secret_blobs_touch_updated_at'
  ) then
    execute 'create trigger vault_secret_blobs_touch_updated_at before update on pn_vault.vault_secret_blobs for each row execute function pn_vault.touch_updated_at()';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_secret_blobs'
      and t.tgname = 'vault_secret_blobs_append_only'
  ) then
    execute 'create trigger vault_secret_blobs_append_only before update or delete on pn_vault.vault_secret_blobs for each row execute function pn_vault.reject_append_only_mutation()';
  end if;
end $$;

create table if not exists pn_vault.vault_reference_tokens (
  id uuid primary key default gen_random_uuid(),
  jti uuid not null unique,
  token_hash bytea not null unique,
  credential_id uuid not null references pn_vault.vault_credentials(id) on delete restrict,
  scope text not null,
  requested_by_actor_type pn_vault.vault_actor_type not null,
  requested_by_actor_ref text not null,
  request_id uuid not null,
  state pn_vault.vault_token_state not null default 'ISSUED',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  broker_receipt_ref uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_reference_tokens_expires_after_issue check (expires_at > issued_at)
);

create index if not exists vault_reference_tokens_credential_id_state_idx
  on pn_vault.vault_reference_tokens (credential_id, state, created_at);

create index if not exists vault_reference_tokens_expires_at_idx
  on pn_vault.vault_reference_tokens (expires_at);

create index if not exists vault_reference_tokens_used_at_idx
  on pn_vault.vault_reference_tokens (used_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_reference_tokens'
      and t.tgname = 'vault_reference_tokens_touch_updated_at'
  ) then
    execute 'create trigger vault_reference_tokens_touch_updated_at before update on pn_vault.vault_reference_tokens for each row execute function pn_vault.touch_updated_at()';
  end if;
end $$;

create table if not exists pn_vault.vault_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_type pn_vault.vault_actor_type not null,
  actor_ref text not null,
  action pn_vault.vault_audit_action not null,
  credential_id uuid,
  token_id uuid,
  request_id uuid not null,
  reason text,
  evidence_ref text,
  before_state text,
  after_state text,
  created_at timestamptz not null default now()
);

create index if not exists vault_access_audit_credential_id_created_at_idx
  on pn_vault.vault_access_audit (credential_id, created_at);

create index if not exists vault_access_audit_token_id_created_at_idx
  on pn_vault.vault_access_audit (token_id, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_access_audit'
      and t.tgname = 'vault_access_audit_append_only'
  ) then
    execute 'create trigger vault_access_audit_append_only before update or delete on pn_vault.vault_access_audit for each row execute function pn_vault.reject_append_only_mutation()';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'pn_vault'
      and rel.relname = 'vault_credentials'
      and c.conname = 'vault_credentials_current_secret_blob_fk'
  ) then
    execute 'alter table pn_vault.vault_credentials add constraint vault_credentials_current_secret_blob_fk foreign key (current_secret_blob_id) references pn_vault.vault_secret_blobs(id) on delete set null';
  end if;
end $$;

create or replace function pn_vault.register_master_key_rotation(
  p_key_ref text,
  p_key_version integer,
  p_key_fingerprint char(64),
  p_rotation_reason text,
  p_actor_type pn_vault.vault_actor_type,
  p_actor_ref text,
  p_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
declare
  v_new_id uuid;
begin
  update pn_vault.vault_master_keys
  set active = false,
      retired_at = coalesce(retired_at, now()),
      updated_at = now()
  where key_ref = p_key_ref
    and active = true;

  insert into pn_vault.vault_master_keys (
    key_ref,
    key_version,
    key_fingerprint,
    provider_code,
    active,
    activated_at,
    rotated_at,
    rotation_reason
  ) values (
    p_key_ref,
    p_key_version,
    p_key_fingerprint,
    'server_side_kms',
    true,
    now(),
    now(),
    p_rotation_reason
  )
  returning id into v_new_id;

  insert into pn_vault.vault_access_audit (
    actor_type,
    actor_ref,
    action,
    request_id,
    reason,
    after_state
  ) values (
    p_actor_type,
    p_actor_ref,
    'ROTATE',
    p_request_id,
    p_rotation_reason,
    p_key_ref || ':' || p_key_version::text
  );

  return v_new_id;
end;
$$;

create or replace function pn_vault.issue_reference_token(
  p_credential_ref text,
  p_scope text,
  p_requested_by_actor_type pn_vault.vault_actor_type,
  p_requested_by_actor_ref text,
  p_request_id uuid,
  p_expires_at timestamptz default (now() + interval '15 minutes')
)
returns table (
  jti uuid,
  lease_token text,
  expires_at timestamptz,
  broker_receipt_ref uuid
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
declare
  v_credential record;
  v_jti uuid := gen_random_uuid();
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_receipt uuid := gen_random_uuid();
begin
  select id, credential_ref, state
  into v_credential
  from pn_vault.vault_credentials
  where credential_ref = p_credential_ref;

  if not found then
    insert into pn_vault.vault_access_audit (
      actor_type,
      actor_ref,
      action,
      request_id,
      reason
    ) values (
      p_requested_by_actor_type,
      p_requested_by_actor_ref,
      'DENY',
      p_request_id,
      'CREDENTIAL_NOT_FOUND'
    );
    raise exception 'CREDENTIAL_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_credential.state <> 'ACTIVE' then
    insert into pn_vault.vault_access_audit (
      actor_type,
      actor_ref,
      action,
      credential_id,
      request_id,
      reason,
      before_state,
      after_state
    ) values (
      p_requested_by_actor_type,
      p_requested_by_actor_ref,
      'DENY',
      v_credential.id,
      p_request_id,
      'CREDENTIAL_NOT_ACTIVE',
      v_credential.state::text,
      v_credential.state::text
    );
    raise exception 'CREDENTIAL_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  insert into pn_vault.vault_reference_tokens (
    jti,
    token_hash,
    credential_id,
    scope,
    requested_by_actor_type,
    requested_by_actor_ref,
    request_id,
    expires_at,
    broker_receipt_ref
  ) values (
    v_jti,
    pn_vault.hash_reference_token(v_token),
    v_credential.id,
    p_scope,
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    p_request_id,
    p_expires_at,
    v_receipt
  );

  insert into pn_vault.vault_access_audit (
    actor_type,
    actor_ref,
    action,
    credential_id,
    token_id,
    request_id,
    reason,
    after_state
  ) values (
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    'ISSUE_TOKEN',
    v_credential.id,
    v_jti,
    p_request_id,
    p_scope,
    p_expires_at::text
  );

  return query
  select v_jti, v_token, p_expires_at, v_receipt;
end;
$$;

create or replace function pn_vault.consume_reference_token(
  p_lease_token text,
  p_requested_by_actor_type pn_vault.vault_actor_type,
  p_requested_by_actor_ref text,
  p_request_id uuid
)
returns table (
  credential_ref text,
  scope text,
  expires_at timestamptz,
  master_key_ref text,
  master_key_version integer,
  secret_blob_id uuid,
  ciphertext bytea,
  ciphertext_nonce bytea,
  broker_receipt_ref uuid
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
declare
  v_token record;
  v_blob record;
  v_credential record;
begin
  select *
  into v_token
  from pn_vault.vault_reference_tokens
  where token_hash = pn_vault.hash_reference_token(p_lease_token)
  for update;

  if not found then
    insert into pn_vault.vault_access_audit (
      actor_type,
      actor_ref,
      action,
      request_id,
      reason
    ) values (
      p_requested_by_actor_type,
      p_requested_by_actor_ref,
      'DENY',
      p_request_id,
      'TOKEN_NOT_FOUND'
    );
    raise exception 'TOKEN_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_token.state <> 'ISSUED'
     or v_token.expires_at <= now()
     or v_token.used_at is not null
     or v_token.revoked_at is not null then
    insert into pn_vault.vault_access_audit (
      actor_type,
      actor_ref,
      action,
      credential_id,
      token_id,
      request_id,
      reason,
      before_state,
      after_state
    ) values (
      p_requested_by_actor_type,
      p_requested_by_actor_ref,
      'DENY',
      v_token.credential_id,
      v_token.id,
      p_request_id,
      'TOKEN_NOT_USABLE',
      v_token.state::text,
      v_token.state::text
    );
    raise exception 'TOKEN_NOT_USABLE' using errcode = 'P0001';
  end if;

  update pn_vault.vault_reference_tokens
  set used_at = now(),
      state = 'CONSUMED',
      updated_at = now()
  where id = v_token.id;

  select c.credential_ref,
         t.scope,
         t.expires_at,
         mk.key_ref as master_key_ref,
         mk.key_version,
         sb.id as secret_blob_id,
         sb.ciphertext,
         sb.ciphertext_nonce,
         t.broker_receipt_ref
  into v_credential
  from pn_vault.vault_reference_tokens t
  join pn_vault.vault_credentials c on c.id = t.credential_id
  left join pn_vault.vault_secret_blobs sb on sb.id = c.current_secret_blob_id
  left join pn_vault.vault_master_keys mk on mk.id = c.current_master_key_id
  where t.id = v_token.id;

  if v_credential.secret_blob_id is null
     or v_credential.master_key_ref is null
     or v_credential.ciphertext is null
     or v_credential.ciphertext_nonce is null then
    insert into pn_vault.vault_access_audit (
      actor_type,
      actor_ref,
      action,
      credential_id,
      token_id,
      request_id,
      reason,
      before_state,
      after_state
    ) values (
      p_requested_by_actor_type,
      p_requested_by_actor_ref,
      'DENY',
      v_token.credential_id,
      v_token.id,
      p_request_id,
      'SECRET_PACKAGE_NOT_READY',
      'CONSUMED',
      'DENY'
    );
    raise exception 'SECRET_PACKAGE_NOT_READY' using errcode = 'P0001';
  end if;

  insert into pn_vault.vault_access_audit (
    actor_type,
    actor_ref,
    action,
    credential_id,
    token_id,
    request_id,
    reason,
    before_state,
    after_state
  ) values (
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    'REDEEM_TOKEN',
    v_token.credential_id,
    v_token.id,
    p_request_id,
    v_token.scope,
    'ISSUED',
    'CONSUMED'
  );

  insert into pn_vault.vault_access_audit (
    actor_type,
    actor_ref,
    action,
    credential_id,
    token_id,
    request_id,
    reason,
    after_state
  ) values (
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    'BROKERED_CALL',
    v_token.credential_id,
    v_token.id,
    p_request_id,
    v_token.scope,
    v_credential.master_key_ref || ':' || v_credential.key_version::text
  );

  return query
  select v_credential.credential_ref,
         v_credential.scope,
         v_credential.expires_at,
         v_credential.master_key_ref,
         v_credential.key_version,
         v_credential.secret_blob_id,
         v_credential.ciphertext,
         v_credential.ciphertext_nonce,
         v_credential.broker_receipt_ref;
end;
$$;

create or replace function public.byok_issue_reference_token(
  p_credential_ref text,
  p_scope text,
  p_requested_by_actor_type pn_vault.vault_actor_type,
  p_requested_by_actor_ref text,
  p_request_id uuid,
  p_expires_at timestamptz default (now() + interval '15 minutes')
)
returns table (
  jti uuid,
  lease_token text,
  expires_at timestamptz,
  broker_receipt_ref uuid
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
begin
  return query
  select *
  from pn_vault.issue_reference_token(
    p_credential_ref,
    p_scope,
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    p_request_id,
    p_expires_at
  );
end;
$$;

create or replace function public.byok_consume_reference_token(
  p_lease_token text,
  p_requested_by_actor_type pn_vault.vault_actor_type,
  p_requested_by_actor_ref text,
  p_request_id uuid
)
returns table (
  credential_ref text,
  scope text,
  expires_at timestamptz,
  master_key_ref text,
  master_key_version integer,
  secret_blob_id uuid,
  ciphertext bytea,
  ciphertext_nonce bytea,
  broker_receipt_ref uuid
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
begin
  return query
  select *
  from pn_vault.consume_reference_token(
    p_lease_token,
    p_requested_by_actor_type,
    p_requested_by_actor_ref,
    p_request_id
  );
end;
$$;

create or replace function public.byok_create_credential(
  p_credential_ref text,
  p_owner_ref text,
  p_provider_code text,
  p_credential_name text,
  p_created_by_actor_type pn_vault.vault_actor_type,
  p_created_by_actor_ref text,
  p_secret_kind text default 'API_KEY'
)
returns table (
  id uuid,
  credential_ref text
)
language plpgsql
security definer
set search_path = pn_vault, pg_temp
as $$
begin
  return query
  insert into pn_vault.vault_credentials as vc (
    credential_ref,
    owner_ref,
    provider_code,
    credential_name,
    secret_kind,
    state,
    created_by_actor_type,
    created_by_actor_ref
  )
  values (
    p_credential_ref,
    p_owner_ref,
    p_provider_code,
    p_credential_name,
    p_secret_kind,
    'ACTIVE',
    p_created_by_actor_type,
    p_created_by_actor_ref
  )
  on conflict on constraint vault_credentials_credential_ref_key do update
    set credential_name = excluded.credential_name,
        updated_at = now()
  returning vc.id, vc.credential_ref;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant usage on schema pn_vault to service_role';
    execute 'grant select, insert, update, delete on all tables in schema pn_vault to service_role';
    execute 'grant execute on function pn_vault.register_master_key_rotation(text, integer, char(64), text, pn_vault.vault_actor_type, text, uuid) to service_role';
    execute 'grant execute on function pn_vault.issue_reference_token(text, text, pn_vault.vault_actor_type, text, uuid, timestamptz) to service_role';
    execute 'grant execute on function pn_vault.consume_reference_token(text, pn_vault.vault_actor_type, text, uuid) to service_role';
    execute 'grant execute on function public.byok_issue_reference_token(text, text, pn_vault.vault_actor_type, text, uuid, timestamptz) to service_role';
    execute 'grant execute on function public.byok_consume_reference_token(text, pn_vault.vault_actor_type, text, uuid) to service_role';
    execute 'grant execute on function public.byok_create_credential(text, text, text, text, pn_vault.vault_actor_type, text, text) to service_role';
  end if;
end $$;

revoke execute on all functions in schema pn_vault from public, anon, authenticated;
revoke execute on function public.byok_issue_reference_token(text, text, pn_vault.vault_actor_type, text, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.byok_consume_reference_token(text, pn_vault.vault_actor_type, text, uuid) from public, anon, authenticated;
revoke execute on function public.byok_create_credential(text, text, text, text, pn_vault.vault_actor_type, text, text) from public, anon, authenticated;

alter table pn_vault.vault_master_keys enable row level security;
alter table pn_vault.vault_credentials enable row level security;
alter table pn_vault.vault_secret_blobs enable row level security;
alter table pn_vault.vault_reference_tokens enable row level security;
alter table pn_vault.vault_access_audit enable row level security;

alter table pn_vault.vault_master_keys force row level security;
alter table pn_vault.vault_credentials force row level security;
alter table pn_vault.vault_secret_blobs force row level security;
alter table pn_vault.vault_reference_tokens force row level security;
alter table pn_vault.vault_access_audit force row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_master_keys'
      and p.polname = 'vault_master_keys_deny_client'
  ) then
    execute 'create policy vault_master_keys_deny_client on pn_vault.vault_master_keys for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_credentials'
      and p.polname = 'vault_credentials_deny_client'
  ) then
    execute 'create policy vault_credentials_deny_client on pn_vault.vault_credentials for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_secret_blobs'
      and p.polname = 'vault_secret_blobs_deny_client'
  ) then
    execute 'create policy vault_secret_blobs_deny_client on pn_vault.vault_secret_blobs for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_reference_tokens'
      and p.polname = 'vault_reference_tokens_deny_client'
  ) then
    execute 'create policy vault_reference_tokens_deny_client on pn_vault.vault_reference_tokens for all to anon, authenticated using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_vault'
      and c.relname = 'vault_access_audit'
      and p.polname = 'vault_access_audit_deny_client'
  ) then
    execute 'create policy vault_access_audit_deny_client on pn_vault.vault_access_audit for all to anon, authenticated using (false) with check (false)';
  end if;
end $$;

commit;

-- Verification queries
select
  case
    when exists (select 1 from pg_roles where rolname = 'anon')
     and has_table_privilege('anon', 'pn_vault.vault_secret_blobs', 'SELECT')
    then 'HAS_DIRECT_SELECT'
    when exists (select 1 from pg_roles where rolname = 'authenticated')
     and has_table_privilege('authenticated', 'pn_vault.vault_secret_blobs', 'SELECT')
    then 'HAS_DIRECT_SELECT'
    else 'NO_DIRECT_SELECT'
  end as secret_read_status;

select
  count(*) = 0 as no_plaintext_return_path
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'pn_vault'
  and (
    p.proname ilike '%decrypt%'
    or p.proname ilike '%plaintext%'
    or p.proname ilike '%raw_key%'
    or p.proname ilike '%reveal%'
  );

select
  p.proname,
  p.prosecdef as is_security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'pn_vault'
  and p.prosecdef is true
order by p.proname;

select
  column_name
from information_schema.columns
where table_schema = 'pn_vault'
  and table_name = 'vault_master_keys'
  and column_name in ('key_ref', 'key_version', 'rotated_at', 'active', 'retired_at', 'activated_at', 'key_fingerprint')
order by column_name;

select
  n.nspname as schema_name,
  c.relname as table_name,
  t.tgname as trigger_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pn_vault'
  and t.tgname in (
    'vault_access_audit_append_only',
    'vault_secret_blobs_append_only',
    'vault_master_keys_touch_updated_at',
    'vault_credentials_touch_updated_at',
    'vault_secret_blobs_touch_updated_at',
    'vault_reference_tokens_touch_updated_at'
  )
order by c.relname, t.tgname;
