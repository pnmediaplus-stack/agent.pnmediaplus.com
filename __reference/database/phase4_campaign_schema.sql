-- 1. Create Campaign Status Enum
do $$
declare
  expected_labels text[];
  existing_labels text[];
begin
  expected_labels := array['draft', 'active', 'completed', 'paused'];
  select array_agg(e.enumlabel order by e.enumsortorder)
  into existing_labels
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join pg_enum e on e.enumtypid = t.oid
  where n.nspname = 'pn_content_phase2'
    and t.typname = 'campaign_status';

  if existing_labels is null then
    execute format(
      'create type pn_content_phase2.campaign_status as enum (%s)',
      array_to_string(array(select quote_literal(x) from unnest(expected_labels) as x), ', ')
    );
  elsif existing_labels <> expected_labels then
    raise exception 'ENUM_COMPATIBILITY_MISMATCH: pn_content_phase2.campaign_status';
  end if;
end $$;

-- 2. Create Campaigns Table
create table if not exists pn_content_phase2.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  goal_description text not null,
  target_audience text,
  status pn_content_phase2.campaign_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pn_content_phase2.campaigns enable row level security;

-- Policy for campaigns
drop policy if exists "Allow all for service_role on campaigns" on pn_content_phase2.campaigns;
create policy "Allow all for service_role on campaigns"
  on pn_content_phase2.campaigns
  for all
  to service_role
  using (true)
  with check (true);

-- 3. Add campaign_id to content_items
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'pn_content_phase2'
      and table_name = 'content_items'
      and column_name = 'campaign_id'
  ) then
    alter table pn_content_phase2.content_items 
    add column campaign_id uuid references pn_content_phase2.campaigns(id) on delete set null;
  end if;
end $$;

-- 4. Create View for Dashboard
create or replace view public.phase4_campaigns as
select
  c.id,
  c.title,
  c.goal_description,
  c.target_audience,
  c.status,
  c.created_at,
  c.updated_at,
  (select count(*) from pn_content_phase2.content_items i where i.campaign_id = c.id) as item_count
from pn_content_phase2.campaigns c;

grant select on public.phase4_campaigns to anon, authenticated, service_role;
grant all privileges on public.phase4_campaigns to service_role;

-- Update View phase2_content_items to include campaign_id
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
  updated_at,
  campaign_id
from pn_content_phase2.content_items;

-- Ensure grants are reapplied
grant select on public.phase2_content_items to anon, authenticated, service_role;
grant all privileges on public.phase2_content_items to service_role;

NOTIFY pgrst, 'reload schema';
