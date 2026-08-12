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

-- 2. Create Campaigns Table with STRICT deterministic contracts
create table if not exists pn_content_phase2.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.portal_organizations(id) on delete cascade,
  title text not null,
  
  -- Strict deterministic contract fields
  campaign_goal text not null,
  required_terms text[] not null default '{}',
  validation_hints jsonb not null default '{}'::jsonb,
  paid_media_allowed boolean not null default false,
  campaign_duration_days integer not null default 30,
  
  -- Single Source of Truth for Brief
  campaign_brief text not null,
  
  target_audience text,
  status pn_content_phase2.campaign_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table pn_content_phase2.campaigns enable row level security;

-- Tenant isolation RLS
drop policy if exists "Tenant isolation for campaigns" on pn_content_phase2.campaigns;
create policy "Tenant isolation for campaigns"
  on pn_content_phase2.campaigns
  for all
  to public
  using (
    organization_id IN (
      SELECT organization_id
      FROM public.portal_organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
  with check (
    organization_id IN (
      SELECT organization_id
      FROM public.portal_organization_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Policy for campaigns service_role
drop policy if exists "Allow all for service_role on campaigns" on pn_content_phase2.campaigns;
create policy "Allow all for service_role on campaigns"
  on pn_content_phase2.campaigns
  for all
  to service_role
  using (true)
  with check (true);

grant all on pn_content_phase2.campaigns to service_role;
grant select, insert, update, delete on pn_content_phase2.campaigns to authenticated;

-- 3. Update view
create or replace view public.campaigns
with (security_invoker = true)
as select * from pn_content_phase2.campaigns;

grant select, insert, update, delete on public.campaigns to authenticated, service_role;

-- 4. Add foreign key to content_items if missing
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'pn_content_phase2'
      and tc.table_name = 'content_items'
      and kcu.column_name = 'campaign_id'
  ) then
    alter table pn_content_phase2.content_items
      add constraint fk_content_items_campaign
      foreign key (campaign_id) references pn_content_phase2.campaigns(id) on delete set null;
  end if;
end $$;

