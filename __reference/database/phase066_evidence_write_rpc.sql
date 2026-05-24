begin;

create extension if not exists pgcrypto;

create table if not exists department_governance.phase066_evidence_packets (
  id uuid primary key default gen_random_uuid(),
  flow_key text not null,
  source_department_name text not null,
  target_department_name text not null,
  source_handoff_id uuid not null references department_governance.cross_department_handoffs(id) on delete restrict,
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete restrict,
  claim_boundary text not null,
  qa_boundary text not null,
  task_owner_ref text not null,
  source_row_type text not null,
  source_state text not null,
  packet_hash char(64) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phase066_evidence_packets_flow_key_check
    check (flow_key in ('marketing_to_media', 'media_to_operations', 'operations_intake_visibility')),
  constraint phase066_evidence_packets_source_row_type_check
    check (source_row_type in ('content_item', 'asset', 'agent_task')),
  constraint phase066_evidence_packets_source_state_check
    check (source_state in ('idea', 'visual_ready', 'caption_ready')),
  constraint phase066_evidence_packets_flow_content_unique
    unique (flow_key, content_item_id),
  constraint phase066_evidence_packets_claim_boundary_check
    check (btrim(claim_boundary) <> ''),
  constraint phase066_evidence_packets_qa_boundary_check
    check (btrim(qa_boundary) <> ''),
  constraint phase066_evidence_packets_task_owner_ref_check
    check (btrim(task_owner_ref) <> '')
);

create index if not exists phase066_evidence_packets_flow_key_created_at_idx
  on department_governance.phase066_evidence_packets (flow_key, created_at desc);

create index if not exists phase066_evidence_packets_content_item_id_idx
  on department_governance.phase066_evidence_packets (content_item_id, created_at desc);

create or replace function department_governance.phase066_evidence_packets_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = department_governance, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function department_governance.phase066_evidence_packets_reject_mutation()
returns trigger
language plpgsql
security definer
set search_path = department_governance, pg_temp
as $$
begin
  raise exception 'PHASE066_EVIDENCE_PACKET_MUTATION_FORBIDDEN: %', tg_table_name
    using errcode = 'P0001';
end;
$$;

drop trigger if exists phase066_evidence_packets_touch_updated_at on department_governance.phase066_evidence_packets;
create trigger phase066_evidence_packets_touch_updated_at
before update on department_governance.phase066_evidence_packets
for each row execute function department_governance.phase066_evidence_packets_touch_updated_at();

drop trigger if exists phase066_evidence_packets_reject_mutation on department_governance.phase066_evidence_packets;
create trigger phase066_evidence_packets_reject_mutation
before update or delete on department_governance.phase066_evidence_packets
for each row execute function department_governance.phase066_evidence_packets_reject_mutation();

alter table department_governance.phase066_evidence_packets enable row level security;

do $$
begin
  revoke all on table department_governance.phase066_evidence_packets from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table department_governance.phase066_evidence_packets from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on table department_governance.phase066_evidence_packets from authenticated;
  end if;
end $$;

create or replace function public.phase066_evidence_write_rpc(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, department_governance, pg_temp
as $$
declare
  v_content_item_id uuid;
  v_claim_boundary text;
  v_qa_boundary text;
  v_task_owner_ref text;
  v_flow_key text;
  v_source_department_name text;
  v_target_department_name text;
  v_source_handoff_id uuid;
  v_source_row_type text;
  v_source_state text;
  v_packet_hash text;
  v_existing department_governance.phase066_evidence_packets%rowtype;
  v_inserted department_governance.phase066_evidence_packets%rowtype;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE066_EVIDENCE_INVALID_PAYLOAD' using errcode = 'P0001';
  end if;

  begin
    v_content_item_id := nullif(btrim(coalesce(payload->>'content_item_id', '')), '')::uuid;
  exception
    when others then
      raise exception 'PHASE066_EVIDENCE_INVALID_CONTENT_ITEM_ID' using errcode = 'P0001';
  end;

  v_claim_boundary := btrim(coalesce(payload->>'claim_boundary', ''));
  v_qa_boundary := btrim(coalesce(payload->>'qa_boundary', ''));
  v_task_owner_ref := btrim(coalesce(payload->>'task_owner_ref', ''));

  if v_content_item_id is null
     or v_claim_boundary = ''
     or v_qa_boundary = ''
     or v_task_owner_ref = '' then
    raise exception 'PHASE066_EVIDENCE_FIELDS_MISSING' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.phase2_content_items ci
    join public.phase2_qa_reviews qr
      on qr.content_item_id = ci.id
     and qr.evidence_ref = v_qa_boundary
    join public.department_governance_handoffs h
      on h.source_department_name = 'Marketing'
     and h.target_department_name = 'Media'
     and h.relationship_type = 'HANDOFF_TARGET'
    where ci.id = v_content_item_id
      and ci.owner_ref = v_task_owner_ref
      and ci.content_key = v_claim_boundary
      and ci.state = 'idea'
  ) then
    v_flow_key := 'marketing_to_media';
    v_source_department_name := 'Marketing';
    v_target_department_name := 'Media';
    v_source_row_type := 'content_item';
    v_source_state := 'idea';

    select h.id
    into v_source_handoff_id
    from public.department_governance_handoffs h
    where h.source_department_name = 'Marketing'
      and h.target_department_name = 'Media'
      and h.relationship_type = 'HANDOFF_TARGET'
    order by h.created_at desc, h.id desc
    limit 1;
  elsif exists (
    select 1
    from public.phase2_assets a
    join public.phase2_content_items ci
      on ci.id = a.content_item_id
    join public.phase2_qa_reviews qr
      on qr.content_item_id = a.content_item_id
     and qr.evidence_ref = v_qa_boundary
    join public.department_governance_handoffs h
      on h.source_department_name = 'Media'
     and h.target_department_name = 'Operations'
     and h.relationship_type = 'HANDOFF_TARGET'
    where a.content_item_id = v_content_item_id
      and a.owner_ref = v_task_owner_ref
      and coalesce(nullif(btrim(a.asset_uri), ''), a.asset_key) = v_claim_boundary
      and ci.state = 'visual_ready'
  ) then
    v_flow_key := 'media_to_operations';
    v_source_department_name := 'Media';
    v_target_department_name := 'Operations';
    v_source_row_type := 'asset';
    v_source_state := 'visual_ready';

    select h.id
    into v_source_handoff_id
    from public.department_governance_handoffs h
    where h.source_department_name = 'Media'
      and h.target_department_name = 'Operations'
      and h.relationship_type = 'HANDOFF_TARGET'
    order by h.created_at desc, h.id desc
    limit 1;
  elsif exists (
    select 1
    from public.phase2_agent_tasks t
    join public.phase2_content_items ci
      on ci.id = t.content_item_id
    join public.phase2_qa_reviews qr
      on qr.content_item_id = t.content_item_id
     and qr.evidence_ref = v_qa_boundary
    join public.department_governance_handoffs h
      on h.source_department_name = 'Operations'
     and h.relationship_type = 'HANDOFF_TARGET'
     and h.target_department_name in ('Human', 'Governance Relay', 'department owners')
    where t.content_item_id = v_content_item_id
      and t.owner_ref = v_task_owner_ref
      and ci.content_key = v_claim_boundary
      and ci.state = 'caption_ready'
  ) then
    v_flow_key := 'operations_intake_visibility';
    v_source_department_name := 'Operations';
    v_target_department_name := 'Human';
    v_source_row_type := 'agent_task';
    v_source_state := 'caption_ready';

    select h.id
    into v_source_handoff_id
    from public.department_governance_handoffs h
    where h.source_department_name = 'Operations'
      and h.relationship_type = 'HANDOFF_TARGET'
      and h.target_department_name in ('Human', 'Governance Relay', 'department owners')
    order by
      case h.target_department_name
        when 'Human' then 1
        when 'Governance Relay' then 2
        else 3
      end,
      h.created_at desc,
      h.id desc
    limit 1;
  else
    raise exception 'PHASE066_EVIDENCE_NO_CANONICAL_FLOW_MATCH' using errcode = 'P0001';
  end if;

  v_packet_hash := encode(
    digest(
      concat_ws(
        '|',
        v_flow_key,
        v_source_department_name,
        v_target_department_name,
        v_content_item_id::text,
        v_claim_boundary,
        v_qa_boundary,
        v_task_owner_ref
      ),
      'sha256'
    ),
    'hex'
  );

  insert into department_governance.phase066_evidence_packets (
    flow_key,
    source_department_name,
    target_department_name,
    source_handoff_id,
    content_item_id,
    claim_boundary,
    qa_boundary,
    task_owner_ref,
    source_row_type,
    source_state,
    packet_hash
  ) values (
    v_flow_key,
    v_source_department_name,
    v_target_department_name,
    v_source_handoff_id,
    v_content_item_id,
    v_claim_boundary,
    v_qa_boundary,
    v_task_owner_ref,
    v_source_row_type,
    v_source_state,
    v_packet_hash
  )
  on conflict on constraint phase066_evidence_packets_flow_content_unique do nothing
  returning * into v_inserted;

  if v_inserted.id is null then
    select *
    into v_existing
    from department_governance.phase066_evidence_packets p
    where p.flow_key = v_flow_key
      and p.content_item_id = v_content_item_id;

    if not found then
      raise exception 'PHASE066_EVIDENCE_IDEMPOTENT_LOOKUP_FAILED' using errcode = 'P0001';
    end if;

    if v_existing.claim_boundary <> v_claim_boundary
       or v_existing.qa_boundary <> v_qa_boundary
       or v_existing.task_owner_ref <> v_task_owner_ref
       or v_existing.source_department_name <> v_source_department_name
       or v_existing.target_department_name <> v_target_department_name
       or v_existing.source_handoff_id <> v_source_handoff_id then
      raise exception 'PHASE066_EVIDENCE_CONFLICTING_PACKET_EXISTS' using errcode = 'P0001';
    end if;

    return jsonb_build_object(
      'ok', true,
      'state', 'ready',
      'mutation_performed', false,
      'idempotent', true,
      'packet_id', v_existing.id,
      'flow_key', v_existing.flow_key,
      'source_department_name', v_existing.source_department_name,
      'target_department_name', v_existing.target_department_name,
      'source_handoff_id', v_existing.source_handoff_id,
      'content_item_id', v_existing.content_item_id,
      'claim_boundary', v_existing.claim_boundary,
      'qa_boundary', v_existing.qa_boundary,
      'task_owner_ref', v_existing.task_owner_ref,
      'write_surface', 'public.phase066_evidence_write_rpc'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', 'ready',
    'mutation_performed', true,
    'idempotent', false,
    'packet_id', v_inserted.id,
    'flow_key', v_inserted.flow_key,
    'source_department_name', v_inserted.source_department_name,
    'target_department_name', v_inserted.target_department_name,
    'source_handoff_id', v_inserted.source_handoff_id,
    'content_item_id', v_inserted.content_item_id,
    'claim_boundary', v_inserted.claim_boundary,
    'qa_boundary', v_inserted.qa_boundary,
    'task_owner_ref', v_inserted.task_owner_ref,
    'write_surface', 'public.phase066_evidence_write_rpc'
  );
end;
$$;

do $$
begin
  revoke all on function public.phase066_evidence_write_rpc(jsonb) from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.phase066_evidence_write_rpc(jsonb) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.phase066_evidence_write_rpc(jsonb) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.phase066_evidence_write_rpc(jsonb) to service_role;
  end if;
end $$;

commit;
