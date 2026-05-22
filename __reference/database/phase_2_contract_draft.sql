begin;

create extension if not exists pgcrypto;

create schema if not exists pn_content_phase2;
revoke all on schema pn_content_phase2 from public;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array[
    'idea',
    'research_ready',
    'visual_ready',
    'caption_ready',
    'QA_ready',
    'QA_passed',
    'scheduled',
    'published'
  ];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'content_state';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.content_state as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.content_state';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['queued','assigned','working','blocked','done','cancelled'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'agent_task_state';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.agent_task_state as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.agent_task_state';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['viral_research_packet','visual_asset','caption_output'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'asset_type';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.asset_type as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.asset_type';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['pass','pass_with_conditions','hold','blocked','reject','needs_patch','ready_for_recheck'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'qa_verdict';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.qa_verdict as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.qa_verdict';
  end if;
end $$;

create or replace function pn_content_phase2.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function pn_content_phase2.reject_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name using errcode = 'P0001';
end;
$$;

create or replace function pn_content_phase2.require_linear_content_state()
returns trigger
language plpgsql
as $$
declare
  states constant text[] := array[
    'idea',
    'research_ready',
    'visual_ready',
    'caption_ready',
    'QA_ready',
    'QA_passed',
    'scheduled',
    'published'
  ];
  old_idx integer;
  new_idx integer;
  asset_count integer;
  has_research boolean;
  has_visual boolean;
  has_caption boolean;
  latest_review record;
begin
  if tg_op = 'INSERT' then
    if new.state <> 'idea' then
      raise exception 'CONTENT_STATE_INVALID_START: %', new.state using errcode = 'P0001';
    end if;
    return new;
  end if;

  old_idx := array_position(states, old.state::text);
  new_idx := array_position(states, new.state::text);

  if new_idx is null or old_idx is null then
    raise exception 'CONTENT_STATE_UNKNOWN' using errcode = 'P0001';
  end if;

  if new_idx < old_idx then
    raise exception 'CONTENT_STATE_REGRESSION_FORBIDDEN: % -> %', old.state, new.state using errcode = 'P0001';
  end if;

  if new_idx > old_idx + 1 then
    raise exception 'CONTENT_STATE_SKIP_FORBIDDEN: % -> %', old.state, new.state using errcode = 'P0001';
  end if;

  if new.state = 'QA_ready' then
    select
      count(*),
      bool_or(a.asset_type = 'viral_research_packet'),
      bool_or(a.asset_type = 'visual_asset'),
      bool_or(a.asset_type = 'caption_output')
    into asset_count, has_research, has_visual, has_caption
    from pn_content_phase2.assets a
    where a.content_item_id = new.id;

    if asset_count < 3 or not coalesce(has_research, false) or not coalesce(has_visual, false) or not coalesce(has_caption, false) then
      raise exception 'QA_READY_REQUIRES_3_ASSETS' using errcode = 'P0001';
    end if;
  end if;

  if new.state = 'QA_passed' then
    select *
    into latest_review
    from pn_content_phase2.qa_reviews r
    where r.content_item_id = new.id
    order by r.reviewed_at desc, r.created_at desc, r.id desc
    limit 1;

    if not found then
      raise exception 'QA_PASSED_REQUIRES_QA_REVIEW' using errcode = 'P0001';
    end if;

    if latest_review.verdict not in ('pass', 'pass_with_conditions') then
      raise exception 'QA_PASSED_REQUIRES_PASSING_VERDICT' using errcode = 'P0001';
    end if;
  end if;

  if new.state = 'published' then
    if old.state <> 'scheduled' then
      raise exception 'PUBLISHED_REQUIRES_SCHEDULED_PRESTATE' using errcode = 'P0001';
    end if;

    select *
    into latest_review
    from pn_content_phase2.qa_reviews r
    where r.content_item_id = new.id
    order by r.reviewed_at desc, r.created_at desc, r.id desc
    limit 1;

    if not found then
      raise exception 'PUBLISHED_REQUIRES_QA_REVIEW' using errcode = 'P0001';
    end if;

    if latest_review.average_score < 7 then
      raise exception 'PUBLISH_BLOCKED_BY_AVERAGE_SCORE' using errcode = 'P0001';
    end if;

    if latest_review.overclaim_risk > 3 then
      raise exception 'PUBLISH_BLOCKED_BY_OVERCLAIM_RISK' using errcode = 'P0001';
    end if;

    if latest_review.missing_asset is true then
      raise exception 'PUBLISH_BLOCKED_BY_MISSING_ASSET' using errcode = 'P0001';
    end if;

    if latest_review.verdict not in ('pass', 'pass_with_conditions') then
      raise exception 'PUBLISH_REQUIRES_PASSING_QA_VERDICT' using errcode = 'P0001';
    end if;

    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;

  if new.state = 'scheduled' and new.scheduled_at is null then
    new.scheduled_at := now();
  end if;

  return new;
end;
$$;

create or replace function pn_content_phase2.require_post_publish_performance_record()
returns trigger
language plpgsql
as $$
declare
  content_row record;
begin
  select id, state, published_at
  into content_row
  from pn_content_phase2.content_items
  where id = new.content_item_id;

  if not found then
    raise exception 'PERFORMANCE_RECORD_REQUIRES_CONTENT_ITEM' using errcode = 'P0001';
  end if;

  if content_row.state <> 'published' then
    raise exception 'PERFORMANCE_RECORD_REQUIRES_PUBLISHED_CONTENT' using errcode = 'P0001';
  end if;

  if content_row.published_at is null then
    raise exception 'PERFORMANCE_RECORD_REQUIRES_PUBLISHED_AT' using errcode = 'P0001';
  end if;

  if new.captured_at < content_row.published_at then
    raise exception 'PERFORMANCE_RECORD_CAPTURED_BEFORE_PUBLISH' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create table if not exists pn_content_phase2.content_items (
  id uuid primary key default gen_random_uuid(),
  content_key text not null unique,
  owner_ref text not null,
  title text not null,
  brief text,
  state pn_content_phase2.content_state not null default 'idea',
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_content_key_format
    check (content_key ~ '^[a-z0-9_]+$')
);

create index if not exists content_items_state_created_at_idx
  on pn_content_phase2.content_items (state, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'content_items'
      and t.tgname = 'content_items_touch_updated_at'
  ) then
    execute 'create trigger content_items_touch_updated_at before update on pn_content_phase2.content_items for each row execute function pn_content_phase2.touch_updated_at()';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'content_items'
      and t.tgname = 'content_items_state_guard'
  ) then
    execute 'create trigger content_items_state_guard before insert or update of state on pn_content_phase2.content_items for each row execute function pn_content_phase2.require_linear_content_state()';
  end if;
end $$;

create table if not exists pn_content_phase2.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete restrict,
  task_key text not null unique,
  owner_ref text not null,
  task_kind text not null,
  state pn_content_phase2.agent_task_state not null default 'queued',
  title text not null,
  instructions text,
  result_ref text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_tasks_task_key_format
    check (task_key ~ '^[a-z0-9_]+$'),
  constraint agent_tasks_task_kind_allowed
    check (task_kind in ('research', 'visual', 'caption', 'qa', 'publish_prep'))
);

create index if not exists agent_tasks_content_item_id_state_created_at_idx
  on pn_content_phase2.agent_tasks (content_item_id, state, created_at);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'agent_tasks'
      and t.tgname = 'agent_tasks_touch_updated_at'
  ) then
    execute 'create trigger agent_tasks_touch_updated_at before update on pn_content_phase2.agent_tasks for each row execute function pn_content_phase2.touch_updated_at()';
  end if;
end $$;

create table if not exists pn_content_phase2.assets (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete restrict,
  agent_task_id uuid references pn_content_phase2.agent_tasks(id) on delete set null,
  asset_key text not null unique,
  owner_ref text not null,
  asset_type pn_content_phase2.asset_type not null,
  asset_uri text not null,
  mime_type text,
  content_hash char(64),
  evidence_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_asset_key_format
    check (asset_key ~ '^[a-z0-9_]+$'),
  constraint assets_content_hash_format
    check (content_hash is null or content_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists assets_content_item_id_asset_type_idx
  on pn_content_phase2.assets (content_item_id, asset_type);

create index if not exists assets_agent_task_id_idx
  on pn_content_phase2.assets (agent_task_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'assets'
      and t.tgname = 'assets_touch_updated_at'
  ) then
    execute 'create trigger assets_touch_updated_at before update on pn_content_phase2.assets for each row execute function pn_content_phase2.touch_updated_at()';
  end if;
end $$;

create table if not exists pn_content_phase2.qa_reviews (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete restrict,
  agent_task_id uuid references pn_content_phase2.agent_tasks(id) on delete set null,
  reviewer_ref text not null,
  verdict pn_content_phase2.qa_verdict not null,
  average_score numeric(4,2) not null,
  overclaim_risk smallint not null,
  missing_asset boolean not null default false,
  evidence_ref text not null,
  notes text,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qa_reviews_average_score_range
    check (average_score >= 0 and average_score <= 10),
  constraint qa_reviews_overclaim_risk_range
    check (overclaim_risk >= 0 and overclaim_risk <= 10)
);

create index if not exists qa_reviews_content_item_id_reviewed_at_idx
  on pn_content_phase2.qa_reviews (content_item_id, reviewed_at desc);

create index if not exists qa_reviews_agent_task_id_idx
  on pn_content_phase2.qa_reviews (agent_task_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'qa_reviews'
      and t.tgname = 'qa_reviews_touch_updated_at'
  ) then
    execute 'create trigger qa_reviews_touch_updated_at before update on pn_content_phase2.qa_reviews for each row execute function pn_content_phase2.touch_updated_at()';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'qa_reviews'
      and t.tgname = 'qa_reviews_append_only'
  ) then
    execute 'create trigger qa_reviews_append_only before update or delete on pn_content_phase2.qa_reviews for each row execute function pn_content_phase2.reject_append_only_mutation()';
  end if;
end $$;

create table if not exists pn_content_phase2.performance_records (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete restrict,
  asset_id uuid references pn_content_phase2.assets(id) on delete set null,
  owner_ref text not null,

  impressions integer,
  reach integer,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  clicks integer,
  "CTR" numeric(10,4),
  watch_time numeric(18,4),
  retention_rate numeric(10,4),
  completion_rate numeric(10,4),
  follower_growth integer,
  performance_score numeric(10,4),

  source_ref text not null,
  captured_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists performance_records_content_item_id_captured_at_idx
  on pn_content_phase2.performance_records (content_item_id, captured_at desc);

create index if not exists performance_records_asset_id_idx
  on pn_content_phase2.performance_records (asset_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'performance_records'
      and t.tgname = 'performance_records_touch_updated_at'
  ) then
    execute 'create trigger performance_records_touch_updated_at before update on pn_content_phase2.performance_records for each row execute function pn_content_phase2.touch_updated_at()';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'performance_records'
      and t.tgname = 'performance_records_post_publish_guard'
  ) then
    execute 'create trigger performance_records_post_publish_guard before insert on pn_content_phase2.performance_records for each row execute function pn_content_phase2.require_post_publish_performance_record()';
  end if;

  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'pn_content_phase2'
      and c.relname = 'performance_records'
      and t.tgname = 'performance_records_append_only'
  ) then
    execute 'create trigger performance_records_append_only before update or delete on pn_content_phase2.performance_records for each row execute function pn_content_phase2.reject_append_only_mutation()';
  end if;
end $$;

-- Public read contract for Supabase REST
create or replace view public.phase2_content_items as
select
  id,
  content_key,
  owner_ref,
  title,
  brief,
  state,
  scheduled_at,
  published_at,
  created_at,
  updated_at
from pn_content_phase2.content_items;

create or replace view public.phase2_agent_tasks as
select
  id,
  content_item_id,
  task_key,
  owner_ref,
  task_kind,
  state,
  title,
  instructions,
  result_ref,
  started_at,
  completed_at,
  created_at,
  updated_at
from pn_content_phase2.agent_tasks;

create or replace view public.phase2_assets as
select
  id,
  content_item_id,
  agent_task_id,
  asset_key,
  owner_ref,
  asset_type,
  asset_uri,
  mime_type,
  content_hash,
  evidence_ref,
  created_at,
  updated_at
from pn_content_phase2.assets;

create or replace view public.phase2_qa_reviews as
select
  id,
  content_item_id,
  agent_task_id,
  reviewer_ref,
  verdict,
  average_score,
  overclaim_risk,
  missing_asset,
  evidence_ref,
  notes,
  reviewed_at,
  created_at,
  updated_at
from pn_content_phase2.qa_reviews;

create or replace view public.phase2_performance_records as
select
  id,
  content_item_id,
  asset_id,
  owner_ref,
  impressions,
  reach,
  views,
  likes,
  comments,
  shares,
  saves,
  clicks,
  "CTR",
  watch_time,
  retention_rate,
  completion_rate,
  follower_growth,
  performance_score,
  source_ref,
  captured_at,
  notes,
  created_at,
  updated_at
from pn_content_phase2.performance_records;

grant select on public.phase2_content_items to anon, authenticated;
grant select on public.phase2_agent_tasks to anon, authenticated;
grant select on public.phase2_assets to anon, authenticated;
grant select on public.phase2_qa_reviews to anon, authenticated;
grant select on public.phase2_performance_records to anon, authenticated;

insert into pn_content_phase2.content_items (
  content_key,
  owner_ref,
  title,
  brief,
  state
) values (
  'sample_content_item',
  'pn_media_plus',
  'Sample Content Item',
  'Seed row for Phase 2 contract validation only',
  'idea'
)
on conflict (content_key) do nothing;

commit;

-- Verification queries
-- 1) tables created
select table_name
from information_schema.tables
where table_schema = 'pn_content_phase2'
  and table_name in (
    'content_items',
    'agent_tasks',
    'assets',
    'qa_reviews',
    'performance_records'
  )
order by table_name;

-- 2) enums exist
select t.typname as enum_name, array_agg(e.enumlabel order by e.enumsortorder) as labels
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_content_phase2'
  and t.typtype = 'e'
group by t.typname
order by t.typname;

-- 2b) content_state compatibility check
select
  t.typname as enum_name,
  array_agg(e.enumlabel::text order by e.enumsortorder) as labels,
  case
    when array_agg(e.enumlabel::text order by e.enumsortorder) = array[
      'idea',
      'research_ready',
      'visual_ready',
      'caption_ready',
      'QA_ready',
      'QA_passed',
      'scheduled',
      'published'
    ]::text[] then 'COMPATIBLE'
    else 'MISMATCH'
  end as compatibility
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_content_phase2'
  and t.typname = 'content_state'
group by t.typname;

-- 3) seed data exists
select content_key, owner_ref, state
from pn_content_phase2.content_items
where content_key = 'sample_content_item';

-- 4) performance_records table exists
select to_regclass('pn_content_phase2.performance_records') as performance_records_regclass;

-- 5) no UI labels stored as canonical authority
select table_name, column_name
from information_schema.columns
where table_schema = 'pn_content_phase2'
  and table_name in ('content_items', 'agent_tasks', 'assets', 'qa_reviews', 'performance_records')
  and column_name ~* '(^ui_|^display_|_label$|_i18n$|_locale$|_copy$|^caption$|^translation_)'
order by table_name, column_name;

-- 6) performance_records post-publish guard exists
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name, p.proname as function_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'pn_content_phase2'
  and c.relname = 'performance_records'
  and t.tgname = 'performance_records_post_publish_guard';

-- 7) public read views exist
select table_name, table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'phase2_content_items',
    'phase2_agent_tasks',
    'phase2_assets',
    'phase2_qa_reviews',
    'phase2_performance_records'
  )
order by table_name;

-- 8) read grants exist for dashboard roles
select table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'phase2_content_items',
    'phase2_agent_tasks',
    'phase2_assets',
    'phase2_qa_reviews',
    'phase2_performance_records'
  )
  and privilege_type = 'SELECT'
order by table_name, grantee;

-- 2c) agent_task_state compatibility check
select
  t.typname as enum_name,
  array_agg(e.enumlabel::text order by e.enumsortorder) as labels,
  case
    when array_agg(e.enumlabel::text order by e.enumsortorder) = array['queued','assigned','working','blocked','done','cancelled']::text[]
    then 'COMPATIBLE'
    else 'MISMATCH'
  end as compatibility
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_content_phase2'
  and t.typname = 'agent_task_state'
group by t.typname;

-- 2d) asset_type compatibility check
select
  t.typname as enum_name,
  array_agg(e.enumlabel::text order by e.enumsortorder) as labels,
  case
    when array_agg(e.enumlabel::text order by e.enumsortorder) = array['viral_research_packet','visual_asset','caption_output']::text[]
    then 'COMPATIBLE'
    else 'MISMATCH'
  end as compatibility
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_content_phase2'
  and t.typname = 'asset_type'
group by t.typname;

-- 2e) qa_verdict compatibility check
select
  t.typname as enum_name,
  array_agg(e.enumlabel::text order by e.enumsortorder) as labels,
  case
    when array_agg(e.enumlabel::text order by e.enumsortorder) = array['pass','pass_with_conditions','hold','blocked','reject','needs_patch','ready_for_recheck']::text[]
    then 'COMPATIBLE'
    else 'MISMATCH'
  end as compatibility
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
join pg_enum e on e.enumtypid = t.oid
where n.nspname = 'pn_content_phase2'
  and t.typname = 'qa_verdict'
group by t.typname;

-- 9) Phase 2 triggers exist
select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'pn_content_phase2'
  and c.relname in (
    'content_items',
    'agent_tasks',
    'assets',
    'qa_reviews',
    'performance_records'
  )
  and t.tgname in (
    'content_items_touch_updated_at',
    'content_items_state_guard',
    'agent_tasks_touch_updated_at',
    'assets_touch_updated_at',
    'qa_reviews_touch_updated_at',
    'qa_reviews_append_only',
    'performance_records_touch_updated_at',
    'performance_records_post_publish_guard',
    'performance_records_append_only'
  )
order by c.relname, t.tgname;
