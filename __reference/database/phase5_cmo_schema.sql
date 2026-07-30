-- 1. Create Enums
do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['active', 'abandoned', 'completed'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'strategy_status';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.strategy_status as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.strategy_status';
  end if;
end $$;

do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['pending_approval', 'approved', 'rejected'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'pivot_status';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.pivot_status as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.pivot_status';
  end if;
end $$;


-- 2. Create Strategies Table
create table if not exists pn_content_phase2.strategies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vision text not null,
  status pn_content_phase2.strategy_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table pn_content_phase2.strategies enable row level security;
drop policy if exists "Allow all for service_role on strategies" on pn_content_phase2.strategies;
create policy "Allow all for service_role on strategies" on pn_content_phase2.strategies for all to service_role using (true) with check (true);


-- 3. Create Pivot Proposals Table
create table if not exists pn_content_phase2.pivot_proposals (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references pn_content_phase2.strategies(id) on delete cascade not null,
  reasoning text not null,
  proposed_direction text not null,
  status pn_content_phase2.pivot_status not null default 'pending_approval',
  created_at timestamptz not null default now()
);
alter table pn_content_phase2.pivot_proposals enable row level security;
drop policy if exists "Allow all for service_role on pivot_proposals" on pn_content_phase2.pivot_proposals;
create policy "Allow all for service_role on pivot_proposals" on pn_content_phase2.pivot_proposals for all to service_role using (true) with check (true);


-- 4. Add strategy_id to campaigns
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'pn_content_phase2'
      and table_name = 'campaigns'
      and column_name = 'strategy_id'
  ) then
    alter table pn_content_phase2.campaigns 
    add column strategy_id uuid references pn_content_phase2.strategies(id) on delete set null;
  end if;
end $$;


-- 5. Create Views
create or replace view public.phase5_strategies as
select id, name, vision, status, created_at, updated_at
from pn_content_phase2.strategies;
grant select on public.phase5_strategies to anon, authenticated, service_role;
grant all privileges on public.phase5_strategies to service_role;

create or replace view public.phase5_pivot_proposals as
select id, strategy_id, reasoning, proposed_direction, status, created_at
from pn_content_phase2.pivot_proposals;
grant select on public.phase5_pivot_proposals to anon, authenticated, service_role;
grant all privileges on public.phase5_pivot_proposals to service_role;

create or replace view public.phase4_campaigns as
select c.id, c.title, c.goal_description, c.target_audience, c.status, c.created_at, c.updated_at, c.strategy_id,
  (select count(*) from pn_content_phase2.content_items i where i.campaign_id = c.id) as item_count
from pn_content_phase2.campaigns c;

NOTIFY pgrst, 'reload schema';
