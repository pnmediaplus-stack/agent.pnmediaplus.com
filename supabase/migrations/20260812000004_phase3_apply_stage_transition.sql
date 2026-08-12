create or replace function public.phase3_apply_stage_transition(
  p_content_item_id uuid,
  p_expected_current_state text,
  p_next_state text,
  p_asset_type text default null,
  p_asset_key text default null,
  p_asset_uri text default null,
  p_owner_ref text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_state text;
  v_result jsonb;
begin
  -- 1. Get current state
  select state into v_current_state
  from pn_content_phase2.content_items
  where id = p_content_item_id;

  if not found then
    return jsonb_build_object('ok', false, 'error_code', 'CONTENT_NOT_FOUND');
  end if;

  -- 2. Validate current state
  if v_current_state <> p_expected_current_state then
    return jsonb_build_object(
      'ok', false, 
      'error_code', 'STATE_MISMATCH', 
      'expected', p_expected_current_state, 
      'actual', v_current_state
    );
  end if;

  -- 3. Insert Asset (if provided)
  if p_asset_type is not null then
    begin
      insert into pn_content_phase2.assets (
        content_item_id, asset_key, owner_ref, asset_type, asset_uri
      ) values (
        p_content_item_id, p_asset_key, p_owner_ref, p_asset_type::pn_content_phase2.asset_type, p_asset_uri
      );
    exception when unique_violation then
      -- Return error for duplicate keys. N8N should generate unique asset_keys per run.
      return jsonb_build_object('ok', false, 'error_code', 'ASSET_KEY_DUPLICATE');
    end;
  end if;

  -- 4. Advance State
  update pn_content_phase2.content_items
  set state = p_next_state::pn_content_phase2.content_state
  where id = p_content_item_id;

  v_result := jsonb_build_object(
    'ok', true,
    'content_item_id', p_content_item_id,
    'from_state', v_current_state,
    'to_state', p_next_state,
    'inserted_asset', p_asset_type
  );

  return v_result;
end;
$$;
