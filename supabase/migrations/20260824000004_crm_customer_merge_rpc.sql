-- Migration: 20260824000004_crm_customer_merge_rpc.sql
-- Description: RPC for upserting customer identity and merging profiles if phone matches

BEGIN;

CREATE OR REPLACE FUNCTION public.crm_upsert_channel_identity(
    p_organization_id UUID,
    p_channel_id UUID,
    p_external_user_id TEXT,
    p_customer_name TEXT,
    p_phone_number TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_existing_customer_id UUID;
    v_identity_id UUID;
BEGIN
    -- 1. Check if the identity already exists on this channel
    SELECT customer_id INTO v_customer_id
    FROM public.crm_channel_identities
    WHERE channel_id = p_channel_id AND external_user_id = p_external_user_id;

    IF FOUND THEN
        -- If identity exists, check if we need to update phone number
        IF p_phone_number IS NOT NULL THEN
            UPDATE public.crm_customers
            SET phone_number = COALESCE(phone_number, p_phone_number),
                full_name = COALESCE(full_name, p_customer_name),
                updated_at = now()
            WHERE id = v_customer_id;
        END IF;
        RETURN v_customer_id;
    END IF;

    -- 2. Identity does not exist. Check if a customer with this phone number already exists in the org
    IF p_phone_number IS NOT NULL THEN
        SELECT id INTO v_existing_customer_id
        FROM public.crm_customers
        WHERE organization_id = p_organization_id AND phone_number = p_phone_number
        LIMIT 1;
    END IF;

    IF v_existing_customer_id IS NOT NULL THEN
        -- Merge: Link the new identity to the existing customer
        v_customer_id := v_existing_customer_id;
        
        -- Update the existing customer's name if needed (optional logic, here we keep existing)
    ELSE
        -- 3. Create a brand new customer profile
        INSERT INTO public.crm_customers (
            organization_id,
            full_name,
            phone_number
        ) VALUES (
            p_organization_id,
            p_customer_name,
            p_phone_number
        ) RETURNING id INTO v_customer_id;
    END IF;

    -- 4. Create the channel identity link
    INSERT INTO public.crm_channel_identities (
        organization_id,
        customer_id,
        channel_id,
        external_user_id
    ) VALUES (
        p_organization_id,
        v_customer_id,
        p_channel_id,
        p_external_user_id
    );

    RETURN v_customer_id;
END;
$$;

-- Grant execution to service_role
GRANT EXECUTE ON FUNCTION public.crm_upsert_channel_identity(UUID, UUID, TEXT, TEXT, TEXT) TO service_role;

-- Revoke from public/anon/authenticated to enforce backend-only access
REVOKE ALL ON FUNCTION public.crm_upsert_channel_identity(UUID, UUID, TEXT, TEXT, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.crm_upsert_channel_identity(UUID, UUID, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.crm_upsert_channel_identity(UUID, UUID, TEXT, TEXT, TEXT) FROM authenticated;

COMMIT;
