-- 20260819000000_update_n8n_chat_append_rpc_metadata.sql

-- 1. Add metadata column to chat_messages
ALTER TABLE pn_os_ai_department.chat_messages ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 2. Update RPC to accept and insert metadata
create or replace function public.phase075_n8n_append_chat_message(
  p_thread_id uuid,
  p_idempotency_key text,
  p_sender text,
  p_content text,
  p_intent_type text,
  p_metadata jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pn_os_ai_department, pg_temp
as $$
declare
  v_next_seq integer;
  v_retries integer := 0;
begin
  -- Idempotency check (Early exit if duplicate idempotency_key arrives)
  if p_idempotency_key is not null then
    if exists (select 1 from pn_os_ai_department.chat_messages where idempotency_key = p_idempotency_key) then
      return jsonb_build_object('ok', true, 'message', 'Idempotency key already exists. Ignored.');
    end if;
  end if;

  -- Atomic Retry Loop to prevent TOCTOU Race Conditions on message_seq
  loop
    select coalesce(max(message_seq), 0) + 1 into v_next_seq
    from pn_os_ai_department.chat_messages
    where thread_id = p_thread_id;

    begin
      insert into pn_os_ai_department.chat_messages (
        thread_id,
        message_seq,
        idempotency_key,
        actor_type,
        actor_external_ref,
        message_kind,
        content,
        intent_type,
        metadata
      ) values (
        p_thread_id,
        v_next_seq,
        p_idempotency_key,
        'N8N'::pn_os_ai_department.actor_type_enum,
        p_sender,
        'RESPONSE',
        p_content,
        p_intent_type,
        p_metadata
      );
      
      -- If insert succeeds, exit loop
      exit;
    exception when unique_violation then
      -- If the violation was due to the idempotency key, we can exit gracefully
      if p_idempotency_key is not null and exists (select 1 from pn_os_ai_department.chat_messages where idempotency_key = p_idempotency_key) then
        return jsonb_build_object('ok', true, 'message', 'Idempotency key already exists. Ignored.');
      end if;

      -- Otherwise, it was a thread_seq_unique violation (Race Condition on message_seq). Retry up to 5 times.
      v_retries := v_retries + 1;
      if v_retries > 5 then
        raise exception 'Could not generate unique message_seq after 5 retries';
      end if;
    end;
  end loop;

  return jsonb_build_object('ok', true, 'message_seq', v_next_seq);
end;
$$;

-- Security Hardening: Revoke from public, grant only to service_role
revoke all on function public.phase075_n8n_append_chat_message(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.phase075_n8n_append_chat_message(uuid, text, text, text, text, jsonb) to service_role;
