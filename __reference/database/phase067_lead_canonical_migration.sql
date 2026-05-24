begin;

create extension if not exists pgcrypto;

create schema if not exists lead_canonical;
revoke all on schema lead_canonical from public;

create table if not exists lead_canonical.leads (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null unique,
  source_channel text not null,
  source_ref text not null,
  customer_ref text not null,
  owner_ref text not null,
  stage text not null,
  claim_boundary text not null,
  qa_boundary text not null,
  status text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  escalation_path jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_lead_id_check check (btrim(lead_id) <> ''),
  constraint leads_source_channel_check check (btrim(source_channel) <> ''),
  constraint leads_source_ref_check check (btrim(source_ref) <> ''),
  constraint leads_customer_ref_check check (btrim(customer_ref) <> ''),
  constraint leads_owner_ref_check check (btrim(owner_ref) <> ''),
  constraint leads_stage_check check (stage in ('awareness', 'consideration', 'conversion_review')),
  constraint leads_claim_boundary_check check (btrim(claim_boundary) <> ''),
  constraint leads_qa_boundary_check check (btrim(qa_boundary) <> ''),
  constraint leads_status_check check (status in ('open', 'blocked', 'escalated', 'resolved', 'closed')),
  constraint leads_evidence_refs_array_check check (jsonb_typeof(evidence_refs) = 'array'),
  constraint leads_escalation_path_array_check check (jsonb_typeof(escalation_path) = 'array')
);

create table if not exists lead_canonical.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_record_id uuid not null references lead_canonical.leads(id) on delete restrict,
  event_type text not null,
  actor_type text not null,
  actor_ref text not null,
  stage text not null,
  claim_boundary text not null,
  qa_boundary text not null,
  status text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  escalation_path jsonb not null default '[]'::jsonb,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  request_id uuid,
  event_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  constraint lead_history_event_type_check
    check (event_type in ('INTAKE', 'STAGE_CHANGE', 'STATUS_CHANGE', 'EVIDENCE_APPEND', 'ESCALATION_APPEND', 'REVIEW', 'SYNC')),
  constraint lead_history_actor_type_check
    check (actor_type in ('HUMAN', 'AGENT', 'SYSTEM', 'SERVICE', 'N8N')),
  constraint lead_history_stage_check
    check (stage in ('awareness', 'consideration', 'conversion_review')),
  constraint lead_history_status_check
    check (status in ('open', 'blocked', 'escalated', 'resolved', 'closed')),
  constraint lead_history_claim_boundary_check
    check (btrim(claim_boundary) <> ''),
  constraint lead_history_qa_boundary_check
    check (btrim(qa_boundary) <> ''),
  constraint lead_history_actor_ref_check
    check (btrim(actor_ref) <> ''),
  constraint lead_history_evidence_refs_array_check
    check (jsonb_typeof(evidence_refs) = 'array'),
  constraint lead_history_escalation_path_array_check
    check (jsonb_typeof(escalation_path) = 'array'),
  constraint lead_history_before_state_object_check
    check (jsonb_typeof(before_state) = 'object'),
  constraint lead_history_after_state_object_check
    check (jsonb_typeof(after_state) = 'object'),
  constraint lead_history_event_hash_format
    check (event_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists leads_source_channel_status_created_at_idx
  on lead_canonical.leads (source_channel, status, created_at desc);

create index if not exists leads_owner_ref_stage_created_at_idx
  on lead_canonical.leads (owner_ref, stage, created_at desc);

create index if not exists leads_customer_ref_created_at_idx
  on lead_canonical.leads (customer_ref, created_at desc);

create index if not exists lead_history_lead_record_id_created_at_idx
  on lead_canonical.lead_history (lead_record_id, created_at desc);

create index if not exists lead_history_event_type_created_at_idx
  on lead_canonical.lead_history (event_type, created_at desc);

create or replace function lead_canonical.reject_append_only_mutation()
returns trigger
language plpgsql
security definer
set search_path = lead_canonical, pg_temp
as $$
begin
  raise exception 'APPEND_ONLY_TABLE_MUTATION_FORBIDDEN: %', tg_table_name
    using errcode = 'P0001';
end;
$$;

drop trigger if exists lead_history_reject_update_delete on lead_canonical.lead_history;
create trigger lead_history_reject_update_delete
before update or delete on lead_canonical.lead_history
for each row execute function lead_canonical.reject_append_only_mutation();

alter table lead_canonical.leads enable row level security;
alter table lead_canonical.lead_history enable row level security;

do $$
begin
  revoke all on table lead_canonical.leads from public;
  revoke all on table lead_canonical.lead_history from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table lead_canonical.leads from anon;
    revoke all on table lead_canonical.lead_history from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table lead_canonical.leads from authenticated;
    revoke all on table lead_canonical.lead_history from authenticated;
  end if;
end $$;

create or replace view public.phase067_leads as
select
  l.lead_id,
  l.source_channel,
  l.source_ref,
  l.customer_ref,
  l.owner_ref,
  l.stage,
  l.claim_boundary,
  l.qa_boundary,
  l.status,
  l.evidence_refs,
  l.escalation_path,
  coalesce(h.history_count, 0)::integer as history_count,
  h.latest_event_at,
  l.created_at,
  l.updated_at
from lead_canonical.leads l
left join (
  select
    lead_record_id,
    count(*) as history_count,
    max(created_at) as latest_event_at
  from lead_canonical.lead_history
  group by lead_record_id
) h
  on h.lead_record_id = l.id;

create or replace view public.phase067_lead_history as
select
  l.lead_id,
  l.source_channel,
  l.source_ref,
  l.customer_ref,
  l.owner_ref,
  h.event_type,
  h.actor_type,
  h.actor_ref,
  h.stage,
  h.claim_boundary,
  h.qa_boundary,
  h.status,
  h.evidence_refs,
  h.escalation_path,
  h.before_state,
  h.after_state,
  h.request_id,
  h.event_hash,
  h.created_at
from lead_canonical.lead_history h
join lead_canonical.leads l
  on l.id = h.lead_record_id;

create or replace function public.phase067_lead_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public, lead_canonical, pg_temp
as $$
  select jsonb_build_object(
    'leads',
    (
      select coalesce(jsonb_agg(to_jsonb(v) order by v.lead_id), '[]'::jsonb)
      from public.phase067_leads v
    ),
    'lead_history',
    (
      select coalesce(jsonb_agg(to_jsonb(h) order by h.lead_id, h.created_at), '[]'::jsonb)
      from public.phase067_lead_history h
    ),
    'summary',
    jsonb_build_object(
      'lead_count', (select count(*) from public.phase067_leads),
      'blocked_count', (select count(*) from public.phase067_leads where status = 'blocked'),
      'escalated_count', (select count(*) from public.phase067_leads where status = 'escalated')
    )
  );
$$;

do $$
begin
  revoke all on table public.phase067_leads from public;
  revoke all on table public.phase067_lead_history from public;
  revoke all on function public.phase067_lead_snapshot() from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select on public.phase067_leads to anon;
    grant select on public.phase067_lead_history to anon;
    grant execute on function public.phase067_lead_snapshot() to anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select on public.phase067_leads to authenticated;
    grant select on public.phase067_lead_history to authenticated;
    grant execute on function public.phase067_lead_snapshot() to authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select on public.phase067_leads to service_role;
    grant select on public.phase067_lead_history to service_role;
    grant execute on function public.phase067_lead_snapshot() to service_role;
  end if;
end $$;

commit;
