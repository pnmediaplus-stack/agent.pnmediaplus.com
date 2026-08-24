-- Migration: 20260824000003_crm_omnichannel_schema.sql
-- Description: Creates the foundation for the Omnichannel CRM and AI Chatbot Dashboard

BEGIN;

-- 1. CRM Channels Table
CREATE TABLE IF NOT EXISTS public.crm_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL CHECK (channel_type IN ('facebook_page', 'zalo_oa', 'instagram', 'livechat')),
    channel_external_id TEXT NOT NULL, -- e.g., Facebook Page ID or Zalo OA ID
    channel_name TEXT NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id),
    UNIQUE(organization_id, channel_type, channel_external_id)
);

-- 2. CRM Customers Table
CREATE TABLE IF NOT EXISTS public.crm_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
    customer_segment TEXT,
    primary_need TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_customers_phone ON public.crm_customers(organization_id, phone_number);

-- 3. CRM Channel Identities Table (Mapping External ID to Customer)
CREATE TABLE IF NOT EXISTS public.crm_channel_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    channel_id UUID NOT NULL,
    external_user_id TEXT NOT NULL, -- PSID for Facebook, UserID for Zalo
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id),
    FOREIGN KEY (customer_id, organization_id) REFERENCES public.crm_customers(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id, organization_id) REFERENCES public.crm_channels(id, organization_id) ON DELETE CASCADE,
    UNIQUE(organization_id, channel_id, external_user_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_channel_identities_lookup ON public.crm_channel_identities(organization_id, channel_id, external_user_id);

-- 4. CRM Threads (Chat Sessions)
CREATE TABLE IF NOT EXISTS public.crm_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'bot_handling' CHECK (status IN ('bot_handling', 'human_handling', 'resolved')),
    last_message_at TIMESTAMPTZ DEFAULT now(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id),
    FOREIGN KEY (channel_id, organization_id) REFERENCES public.crm_channels(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id, organization_id) REFERENCES public.crm_customers(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_threads_last_message ON public.crm_threads(organization_id, last_message_at DESC);

-- 5. CRM Messages
CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'bot', 'human')),
    content TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('queued', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (thread_id, organization_id) REFERENCES public.crm_threads(id, organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_messages_thread ON public.crm_messages(thread_id, created_at ASC);

-- 6. CRM Consultations (Appointments / Deals)
CREATE TABLE IF NOT EXISTS public.crm_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL,
    thread_id UUID,
    scheduled_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(id, organization_id),
    FOREIGN KEY (customer_id, organization_id) REFERENCES public.crm_customers(id, organization_id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id, organization_id) REFERENCES public.crm_threads(id, organization_id) ON DELETE CASCADE
);

-- 7. CRM Webhook Events (Idempotency & Replay Prevention)
CREATE TABLE IF NOT EXISTS public.crm_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- e.g., 'facebook', 'zalo'
    external_event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, provider, external_event_id)
);

-- Row Level Security (RLS)
ALTER TABLE public.crm_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_channel_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_events ENABLE ROW LEVEL SECURITY;

-- Service Role Bypass (For Backend & Webhooks)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Example RLS Policy for Authenticated Users (Staff viewing their organization's CRM)
-- Assumes auth.uid() can be joined with portal_auth.memberships to check organization access.
-- We will implement basic RLS allowing members of the organization to select/insert/update.

CREATE POLICY "Allow members to view channels" ON public.crm_channels
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow members to view customers" ON public.crm_customers
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Allow members to update customers" ON public.crm_customers
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow members to view identities" ON public.crm_channel_identities
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow members to view threads" ON public.crm_threads
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Allow members to update threads" ON public.crm_threads
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Allow members to view messages" ON public.crm_messages
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Allow members to insert human messages" ON public.crm_messages
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
  AND sender_type = 'human'
);

CREATE POLICY "Allow members to view consultations" ON public.crm_consultations
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.memberships WHERE user_id = auth.uid()
  )
);

-- Webhook events table should only be accessed by service_role, no public RLS needed for it.

COMMIT;
