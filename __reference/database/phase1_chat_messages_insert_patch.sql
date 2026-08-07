create or replace function public.phase1_chat_messages_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pn_os_ai_department, pg_temp
as $$
declare
  v_thread_id uuid;
  v_seq integer;
  v_actor_type pn_os_ai_department.actor_type_enum;
  v_actor_agent_id uuid;
  v_actor_external_ref text;
  v_target_department_id uuid;
  v_target_agent_id uuid;
  v_created_at timestamptz;
  v_id uuid;
  v_message_kind text;
begin
  v_thread_id := public.safe_uuid(new."threadId"::text);
  if v_thread_id is null then
    raise exception 'PHASE1_CHAT_THREAD_ID_INVALID';
  end if;

  select coalesce(max(message_seq), 0) + 1
    into v_seq
  from pn_os_ai_department.chat_messages
  where thread_id = v_thread_id;

  v_id := coalesce(new.id, gen_random_uuid());
  v_created_at := coalesce(new."createdAt", now());
  v_target_department_id := public.safe_uuid(coalesce(new."targetDepartmentId"::text, null));
  v_target_agent_id := public.safe_uuid(coalesce(new."targetAgentId"::text, null));

  case lower(coalesce(new.sender, 'human'))
    when 'agent' then
      v_actor_type := 'AGENT';
      select id into v_actor_agent_id
      from pn_os_ai_department.agents
      where agent_key = 'governance_core_seed_registry_observer'
      limit 1;
      if v_actor_agent_id is null then
        select id into v_actor_agent_id
        from pn_os_ai_department.agents
        order by created_at
        limit 1;
      end if;
      if v_actor_agent_id is null then
        raise exception 'PHASE1_CHAT_AGENT_FALLBACK_MISSING';
      end if;
      v_actor_external_ref := null;
      v_message_kind := 'RESPONSE';
    when 'system' then
      v_actor_type := 'SYSTEM';
      v_actor_agent_id := null;
      v_actor_external_ref := 'SYSTEM';
      v_message_kind := 'SYSTEM';
    else
      v_actor_type := 'HUMAN';
      v_actor_agent_id := null;
      v_actor_external_ref := 'Human Founder';
      v_message_kind := 'COMMAND';
  end case;

  insert into pn_os_ai_department.chat_messages (
    id,
    thread_id,
    message_seq,
    actor_type,
    actor_agent_id,
    actor_external_ref,
    message_kind,
    content,
    content_format,
    intent_type,
    target_department_id,
    target_agent_id,
    created_at
  ) values (
    v_id,
    v_thread_id,
    v_seq,
    v_actor_type,
    v_actor_agent_id,
    v_actor_external_ref,
    v_message_kind,
    coalesce(new.body, ''),
    'markdown',
    new."intentType",
    v_target_department_id,
    v_target_agent_id,
    v_created_at
  );

  new.id := v_id;
  new."threadId" := v_thread_id;
  new.sender := lower(v_actor_type::text);
  new.body := coalesce(new.body, '');
  new."intentType" := new."intentType";
  new."targetDepartmentId" := v_target_department_id;
  new."targetAgentId" := v_target_agent_id;
  new."createdAt" := v_created_at;
  return new;
end;
$$;
