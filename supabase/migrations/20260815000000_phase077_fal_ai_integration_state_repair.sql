begin;

do $$
declare
  v_organization_id uuid := '8289488a-b255-4cb6-9bff-c9d2e71af160';
  v_integration_key text := 'fal_ai_1786636840915';
  v_preferred_image_model text;
  v_updated integer;
begin
  select m->>'code'
    into v_preferred_image_model
  from tenant_integration_vault.tenant_integrations ti
  join tenant_integration_vault.integration_providers p
    on p.id = ti.provider_id
  cross join lateral jsonb_array_elements(coalesce(p.public_metadata->'models', '[]'::jsonb)) as m
  where ti.organization_id = v_organization_id
    and ti.integration_key = v_integration_key
    and m->>'capability' = 'image'
  limit 1;

  if v_preferred_image_model is null then
    raise exception 'PHASE077_IMAGE_MODEL_NOT_FOUND_FOR_PROVIDER: organization_id=%, integration_key=%',
      v_organization_id, v_integration_key
      using errcode = 'P0001';
  end if;

  update tenant_integration_vault.tenant_integrations ti
  set
    public_metadata = jsonb_set(
      coalesce(public_metadata, '{}'::jsonb),
      '{preferred_image_model}',
      to_jsonb(v_preferred_image_model),
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
