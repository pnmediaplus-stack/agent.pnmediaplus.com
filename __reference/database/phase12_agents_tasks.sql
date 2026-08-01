-- ==============================================================================
-- PHASE 12: AGENTS & TASKS DATABASE SCHEMA
-- ==============================================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.phase1_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "departmentId" uuid NOT NULL REFERENCES public.phase1_departments(id),
  role text NOT NULL,
  status text NOT NULL CHECK (status IN ('ONLINE', 'IDLE', 'BLOCKED')),
  state text NOT NULL,
  focus text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phase1_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  "departmentId" uuid NOT NULL REFERENCES public.phase1_departments(id),
  "agentId" uuid REFERENCES public.phase1_agents(id),
  status text NOT NULL,
  "intentType" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  owner text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High'))
);

-- 2. Row Level Security (RLS)
ALTER TABLE public.phase1_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read for phase1_agents" ON public.phase1_agents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for phase1_tasks" ON public.phase1_tasks FOR SELECT TO anon, authenticated USING (true);

-- 3. API Grants (Least Privilege)
GRANT SELECT ON public.phase1_agents TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_agents TO service_role;

GRANT SELECT ON public.phase1_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_tasks TO service_role;

-- 4. Seed Data: Agents
-- departmentId references:
-- '11111111-1111-1111-1111-111111111111' (Media Pipeline)
-- '22222222-2222-2222-2222-222222222222' (Marketing)
-- '33333333-3333-3333-3333-333333333333' (Governance & Control)
INSERT INTO public.phase1_agents (id, name, "departmentId", role, status, state, focus)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Viral Researcher AI', '11111111-1111-1111-1111-111111111111', 'Market & Trend Analysis', 'ONLINE', 'LIVE', 'Analyzing TikTok trends for CRM software'),
  ('a2222222-2222-2222-2222-222222222222', 'Visual Producer DALL-E', '11111111-1111-1111-1111-111111111111', 'Asset Generation', 'ONLINE', 'LIVE', 'Generating photorealistic office workspace graphics'),
  ('a3333333-3333-3333-3333-333333333333', 'Caption Maestro', '11111111-1111-1111-1111-111111111111', 'Copywriting', 'IDLE', 'LIVE', 'Waiting for visual assets'),
  ('a4444444-4444-4444-4444-444444444444', 'Video Editor AI', '11111111-1111-1111-1111-111111111111', 'Video Compositing', 'BLOCKED', 'PARTIAL', 'Missing raw footage for rendering'),
  ('a5555555-5555-5555-5555-555555555555', 'Publish Ops Bot', '11111111-1111-1111-1111-111111111111', 'Distribution', 'IDLE', 'LIVE', 'Monitoring API rate limits'),
  ('a6666666-6666-6666-6666-666666666666', 'Campaign Planner AI', '22222222-2222-2222-2222-222222222222', 'Strategic Planning', 'ONLINE', 'LIVE', 'Breaking down 10-day CRM marketing campaign'),
  ('a7777777-7777-7777-7777-777777777777', 'Copywriter GPT-4o', '22222222-2222-2222-2222-222222222222', 'Ad Copy Creation', 'ONLINE', 'LIVE', 'Writing persuasive hard-sell email for Day 10'),
  ('a8888888-8888-8888-8888-888888888888', 'QA Sentinel', '33333333-3333-3333-3333-333333333333', 'Content Auditing', 'IDLE', 'LIVE', 'Monitoring queue for pending QA reviews')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  "departmentId" = EXCLUDED."departmentId",
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  state = EXCLUDED.state,
  focus = EXCLUDED.focus;

-- 5. Seed Data: Tasks
INSERT INTO public.phase1_tasks (id, title, "departmentId", "agentId", status, "intentType", owner, priority, "createdAt", "updatedAt")
VALUES 
  ('t1111111-1111-1111-1111-111111111111', 'Plan 10-Day CRM Launch Campaign', '22222222-2222-2222-2222-222222222222', 'a6666666-6666-6666-6666-666666666666', 'IN_PROGRESS', 'EXECUTE', 'human_founder', 'High', now() - interval '2 hours', now()),
  ('t2222222-2222-2222-2222-222222222222', 'Research B2B CRM pain points', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'IN_PROGRESS', 'SEARCH', 'system_orchestrator', 'Medium', now() - interval '1 hour', now()),
  ('t3333333-3333-3333-3333-333333333333', 'Generate hero image for Day 1 Post', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'COMPLETED', 'EXECUTE', 'system_orchestrator', 'High', now() - interval '5 hours', now() - interval '4 hours'),
  ('t4444444-4444-4444-4444-444444444444', 'Render final promotional video', '11111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'FAILED', 'EXECUTE', 'system_orchestrator', 'Low', now() - interval '1 day', now() - interval '1 day'),
  ('t5555555-5555-5555-5555-555555555555', 'Audit Day 1 CRM Post for overclaims', '33333333-3333-3333-3333-333333333333', NULL, 'PENDING', 'CLARIFY', 'gatekeeper_sentinel', 'High', now(), now())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  "departmentId" = EXCLUDED."departmentId",
  "agentId" = EXCLUDED."agentId",
  status = EXCLUDED.status,
  "intentType" = EXCLUDED."intentType",
  owner = EXCLUDED.owner,
  priority = EXCLUDED.priority;
