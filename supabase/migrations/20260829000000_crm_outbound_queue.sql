-- Create the crm_outbound_queue table
CREATE TABLE IF NOT EXISTS public.crm_outbound_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    thread_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient polling and locking
CREATE INDEX IF NOT EXISTS idx_crm_queue_status_retry ON public.crm_outbound_queue (status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_crm_queue_org ON public.crm_outbound_queue (organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_queue_page ON public.crm_outbound_queue (page_id);
CREATE INDEX IF NOT EXISTS idx_crm_queue_thread ON public.crm_outbound_queue (thread_id);

-- Set up RLS (Service role will bypass, but good practice to enable it)
ALTER TABLE public.crm_outbound_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do all on crm_outbound_queue"
ON public.crm_outbound_queue
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
