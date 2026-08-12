create table if not exists pn_content_phase2.stage_transition_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete cascade,
  expected_current_state text not null,
  next_state text not null,
  idempotency_key text not null,
  actor_ref text not null,
  stage_payload jsonb,
  created_at timestamptz not null default now(),
  constraint stage_transition_logs_idempotency_key_unique unique (organization_id, content_item_id, idempotency_key)
);

create index if not exists stage_transition_logs_org_content_idx on pn_content_phase2.stage_transition_logs(organization_id, content_item_id);

create or replace function public.phase3_apply_stage_transition(
  p_organization_id uuid,
  p_content_item_id uuid,
  p_expected_current_state text,
  p_next_state text,
  p_actor_ref text,
  p_stage_payload jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_state text;
  v_organization_id uuid;
  v_owner_ref text;
  v_result jsonb;
  v_artifact jsonb;
  v_artifact_key text;
  v_artifact_type text;
  v_artifact_content jsonb;
  v_artifact_content_text text;
begin
  -- 1. Check Idempotency Guard (Fail-Safe Early Return)
  if exists (
    select 1 
    from pn_content_phase2.stage_transition_logs
    where organization_id = p_organization_id
      and content_item_id = p_content_item_id
      and idempotency_key = p_idempotency_key
  ) then
    return jsonb_build_object(
      'ok', true,
      'content_item_id', p_content_item_id,
      'idempotency_hit', true,
      'message', 'Transition already applied safely.'
    );
  end if;

  -- 2. Get content item and validate ownership
  select state, organization_id, owner_ref into v_current_state, v_organization_id, v_owner_ref
  from pn_content_phase2.content_items
  where id = p_content_item_id;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'CONTENT_NOT_FOUND');
  end if;

  if v_organization_id <> p_organization_id then
    return jsonb_build_object('ok', false, 'error_code', 'OWNERSHIP_MISMATCH');
  end if;

  -- 3. Validate current state
  if v_current_state <> p_expected_current_state then
    return jsonb_build_object(
      'ok', false, 
      'error_code', 'STATE_MISMATCH', 
      'expected', p_expected_current_state, 
      'actual', v_current_state
    );
  end if;

  -- 4. Insert Artifacts (if provided)
  if p_stage_payload ? 'artifacts' and jsonb_array_length(p_stage_payload->'artifacts') > 0 then
    v_artifact := p_stage_payload->'artifacts'->0;
    v_artifact_key := v_artifact->>'artifact_key';
    v_artifact_type := v_artifact->>'artifact_type';
    
    -- Extract content as string safely
    if jsonb_typeof(v_artifact->'content') = 'string' then
      v_artifact_content_text := v_artifact->>'content';
    else
      v_artifact_content_text := (v_artifact->'content')::text;
    end if;

    if v_artifact_key is null or v_artifact_type is null or v_artifact_content_text is null then
      return jsonb_build_object('ok', false, 'error_code', 'INVALID_ARTIFACT_PAYLOAD');
    end if;

    begin
      insert into pn_content_phase2.assets (
        content_item_id, asset_key, owner_ref, asset_type, asset_uri
      ) values (
        p_content_item_id, v_artifact_key, v_owner_ref, v_artifact_type::pn_content_phase2.asset_type, v_artifact_content_text
      );
    exception when unique_violation then
      return jsonb_build_object('ok', false, 'error_code', 'ASSET_KEY_DUPLICATE');
    end;
  else
    -- Require artifact unless transitioning to QA_ready
    if p_next_state not in ('QA_ready', 'published') then
      return jsonb_build_object('ok', false, 'error_code', 'MISSING_STAGE_ARTIFACT');
    end if;
  end if;

  -- 5. Advance State
  update pn_content_phase2.content_items
  set state = p_next_state::pn_content_phase2.content_state
  where id = p_content_item_id;

  -- 6. Log Idempotency Key
  begin
    insert into pn_content_phase2.stage_transition_logs (
      organization_id, content_item_id, expected_current_state, next_state, idempotency_key, actor_ref, stage_payload
    ) values (
      p_organization_id, p_content_item_id, p_expected_current_state, p_next_state, p_idempotency_key, p_actor_ref, p_stage_payload
    );
  exception when unique_violation then
    -- Should not happen unless race condition
    return jsonb_build_object('ok', true, 'content_item_id', p_content_item_id, 'idempotency_hit', true);
  end;

  v_result := jsonb_build_object(
    'ok', true,
    'content_item_id', p_content_item_id,
    'from_state', v_current_state,
    'to_state', p_next_state,
    'inserted_artifacts', case when p_stage_payload ? 'artifacts' then 1 else 0 end,
    'idempotency_hit', false
  );

  return v_result;
end;
$$;
