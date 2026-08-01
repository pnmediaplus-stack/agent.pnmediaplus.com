-- ==============================================================================
-- PHASE 11: DEPARTMENT REGISTRY & REAL DATABASE INTEGRATION
-- ==============================================================================

-- 1. Create the phase1_departments table
-- Note: We use double quotes for "activeAgents" and "openTasks" so that
-- PostgREST automatically maps them to camelCase JSON, strictly matching the
-- TypeScript `Department` type without requiring any loader mapping changes.
CREATE TABLE IF NOT EXISTS public.phase1_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner text NOT NULL,
  purpose text NOT NULL,
  state text NOT NULL DEFAULT 'REVIEW',
  "activeAgents" integer NOT NULL DEFAULT 0,
  "openTasks" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Configure Row Level Security (RLS)
ALTER TABLE public.phase1_departments ENABLE ROW LEVEL SECURITY;

-- Allow read access to anonymous (since the UI loader uses anonKey)
CREATE POLICY "Allow anon read for phase1_departments"
ON public.phase1_departments
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow service role to do everything (implicit, but good to be clear)
-- Service roles bypass RLS by default.

-- Grant API access to the tables so PostgREST can read/write them
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_departments TO anon, authenticated, service_role;

-- 3. Seed Data
-- Insert foundational AI departments for the PN OS AI ecosystem
INSERT INTO public.phase1_departments (id, name, owner, purpose, state, "activeAgents", "openTasks")
VALUES 
  (
    '11111111-1111-1111-1111-111111111111', 
    'Media Pipeline', 
    'system_orchestrator', 
    'Automated content factory for end-to-end viral video/post production, visual generation, and QA gating.', 
    'PARTIAL', 
    5, 
    12
  ),
  (
    '22222222-2222-2222-2222-222222222222', 
    'Marketing', 
    'human_founder', 
    'Designs and executes targeted campaigns (e.g., selling CRM, lead generation) with AI-driven ad copy.', 
    'REVIEW', 
    2, 
    3
  ),
  (
    '33333333-3333-3333-3333-333333333333', 
    'Governance & Control', 
    'gatekeeper_sentinel', 
    'Maintains system integrity, enforces budget constraints, and reviews all outgoing artifacts against safety bounds.', 
    'PARTIAL', 
    1, 
    0
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  owner = EXCLUDED.owner,
  purpose = EXCLUDED.purpose,
  state = EXCLUDED.state,
  "activeAgents" = EXCLUDED."activeAgents",
  "openTasks" = EXCLUDED."openTasks";
