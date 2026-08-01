-- Bản vá khẩn cấp: Khôi phục lại trigger function cho phase1_audit_logs để chèn đúng request_id và event_hash
CREATE OR REPLACE FUNCTION public.phase1_audit_logs_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_os_ai_department, pg_temp
AS $$
DECLARE
  v_entity_type pn_os_ai_department.entity_type_enum;
  v_entity_id uuid;
  v_actor_type pn_os_ai_department.actor_type_enum := 'HUMAN';
  v_actor_external_ref text := coalesce(nullif(new.actor, ''), 'Human Founder');
  v_request_id uuid := gen_random_uuid();
  v_event_hash text;
  v_before_state pn_os_ai_department.lifecycle_state := 'NOT_STARTED';
  v_after_state pn_os_ai_department.lifecycle_state := 'PARTIAL';
  v_created_at timestamptz := coalesce(new."createdAt", now());
  v_id uuid := coalesce(new.id, gen_random_uuid());
BEGIN
  IF lower(coalesce(new."entityType", 'chat')) = 'chat' THEN
    v_entity_type := 'CHAT_THREAD';
  ELSE
    v_entity_type := upper(coalesce(new."entityType", 'CHAT_THREAD'))::pn_os_ai_department.entity_type_enum;
  END IF;

  v_entity_id := public.safe_uuid(new."entityId");
  IF v_entity_id IS NULL THEN
    RAISE EXCEPTION 'PHASE1_AUDIT_LOG_ENTITY_ID_INVALID';
  END IF;

  v_event_hash := encode(
    digest(
      concat_ws(
        '|',
        v_actor_type::text,
        v_actor_external_ref,
        coalesce(new.action, ''),
        v_entity_type::text,
        v_entity_id::text,
        coalesce(new.details, ''),
        v_created_at::text
      ),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO pn_os_ai_department.audit_logs (
    id,
    actor_type,
    actor_external_ref,
    action,
    entity_type,
    entity_id,
    before_state,
    after_state,
    reason,
    evidence_ref,
    request_id,
    event_hash,
    created_at
  ) VALUES (
    v_id,
    v_actor_type,
    v_actor_external_ref,
    coalesce(new.action, 'unknown'),
    v_entity_type,
    v_entity_id,
    v_before_state,
    v_after_state,
    coalesce(new.details, ''),
    null,
    v_request_id,
    v_event_hash,
    v_created_at
  );

  new.id := v_id;
  new."entityType" := lower(v_entity_type::text);
  new."entityId" := v_entity_id::text;
  new.actor := v_actor_external_ref;
  new."createdAt" := v_created_at;
  RETURN new;
END;
$$;
