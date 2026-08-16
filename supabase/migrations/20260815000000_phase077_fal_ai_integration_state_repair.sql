begin;

do $$
declare
  v_organization_id uuid := '8289488a-b255-4cb6-9bff-c9d2e71af160';
  v_integration_key text := 'fal_ai_1786636840915';
  v_updated integer;
begin
  update tenant_integration_vault.tenant_integrations ti
  set
    public_metadata =
      jsonb_set(
        jsonb_set(
          coalesce(public_metadata, '{}'::jsonb),
          '{preferred_image_model}',
          to_jsonb('fal-ai/flux/dev'::text),
          true
        ),
        '{preferred_text_model}',
        to_jsonb('gpt-4o'::text),
        true
      ),
    updated_at = now()
  where ti.organization_id = v_organization_id
    and ti.integration_key = v_integration_key;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  if v_updated = 0 then
    raise exception 'PHASE077_FAL_AI_TENANT_INTEGRATION_NOT_FOUND: organization_id=%, integration_key=%',
      v_organization_id, v_integration_key
      using errcode = 'P0001';
  end if;
end;
$$;

commit;
