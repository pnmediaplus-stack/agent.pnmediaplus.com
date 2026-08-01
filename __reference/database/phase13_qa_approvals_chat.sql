-- ==============================================================================
-- PHASE 13: QA, APPROVALS, AND CHAT DATABASE SCHEMA (WITH STRICT FK)
-- ==============================================================================

-- 1. Create Missing Prerequisite Tables (Artifacts & Workflows)
CREATE TABLE IF NOT EXISTS public.phase1_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('brief', 'prompt', 'asset', 'qa-note', 'workflow')),
  "departmentId" uuid NOT NULL REFERENCES public.phase1_departments(id),
  state text NOT NULL CHECK (state IN ('NOT_STARTED', 'DRAFT', 'PARTIAL', 'REVIEW', 'HOLD', 'READY_FOR_RECHECK', 'PASS', 'BLOCKED', 'APPROVED', 'DEPRECATED')),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  version text NOT NULL DEFAULT 'v1.0'
);
ALTER TABLE public.phase1_artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read for artifacts" ON public.phase1_artifacts FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.phase1_artifacts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_artifacts TO service_role;

CREATE TABLE IF NOT EXISTS public.phase1_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "workflowKey" text NOT NULL,
  status text NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'WAITING_ON_HUMAN', 'SUCCEEDED', 'FAILED')),
  "startedAt" timestamptz NOT NULL DEFAULT now(),
  duration text NOT NULL,
  target text NOT NULL
);
ALTER TABLE public.phase1_workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read for workflow_runs" ON public.phase1_workflow_runs FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON public.phase1_workflow_runs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_workflow_runs TO service_role;

-- Seed prerequisite tables to satisfy FKs
INSERT INTO public.phase1_artifacts (id, title, type, "departmentId", state, "updatedAt")
VALUES 
  ('88888888-8888-8888-8888-888888888888', 'art-crm-day1-copy', 'brief', '11111111-1111-1111-1111-111111111111', 'REVIEW', now() - interval '30 minutes'),
  ('99999999-9999-9999-9999-999999999999', 'art-crm-hero-image', 'asset', '22222222-2222-2222-2222-222222222222', 'APPROVED', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- 2. Create Target Tables
CREATE TABLE IF NOT EXISTS public.phase1_qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artifactId" uuid NOT NULL REFERENCES public.phase1_artifacts(id),
  reviewer text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'REVIEW', 'PASS', 'BLOCKED', 'HOLD')),
  notes text NOT NULL,
  "reviewedAt" timestamptz NOT NULL DEFAULT now()
);

-- For Approvals: We use a strict relational data model to enforce FKs
CREATE TABLE IF NOT EXISTS public.phase1_approvals_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "targetType" text NOT NULL CHECK ("targetType" IN ('task', 'artifact', 'workflow')),
  "taskId" uuid REFERENCES public.phase1_tasks(id),
  "artifactId" uuid REFERENCES public.phase1_artifacts(id),
  "workflowRunId" uuid REFERENCES public.phase1_workflow_runs(id),
  status text NOT NULL CHECK (status IN ('PENDING', 'REQUESTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  "requestedBy" text NOT NULL,
  "requestedAt" timestamptz NOT NULL DEFAULT now(),
  "decidedBy" text,
  CONSTRAINT single_target CHECK (
    ("targetType" = 'task' AND "taskId" IS NOT NULL AND "artifactId" IS NULL AND "workflowRunId" IS NULL) OR
    ("targetType" = 'artifact' AND "artifactId" IS NOT NULL AND "taskId" IS NULL AND "workflowRunId" IS NULL) OR
    ("targetType" = 'workflow' AND "workflowRunId" IS NOT NULL AND "taskId" IS NULL AND "artifactId" IS NULL)
  )
);

-- Expose it as a flat view to match TypeScript contract precisely
CREATE OR REPLACE VIEW public.phase1_approvals AS
SELECT 
  id, 
  "targetType", 
  COALESCE("taskId"::text, "artifactId"::text, "workflowRunId"::text) AS "targetId", 
  status, 
  "requestedBy", 
  "requestedAt", 
  "decidedBy"
FROM public.phase1_approvals_data;

CREATE TABLE IF NOT EXISTS public.phase1_chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  purpose text NOT NULL,
  "lastActivityAt" timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'WAITING_ON_HUMAN', 'CLOSED'))
);

CREATE TABLE IF NOT EXISTS public.phase1_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "threadId" uuid NOT NULL REFERENCES public.phase1_chat_threads(id),
  sender text NOT NULL CHECK (sender IN ('human', 'system', 'agent')),
  body text NOT NULL,
  "intentType" text CHECK ("intentType" IN ('create_content', 'review_artifact', 'check_governance', 'request_status', 'approve_or_reject', 'unknown')),
  "targetDepartmentId" uuid REFERENCES public.phase1_departments(id),
  "targetAgentId" uuid REFERENCES public.phase1_agents(id),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- 3. Row Level Security (RLS)
ALTER TABLE public.phase1_qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_approvals_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read for qa_reviews" ON public.phase1_qa_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for approvals_data" ON public.phase1_approvals_data FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for chat_threads" ON public.phase1_chat_threads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for chat_messages" ON public.phase1_chat_messages FOR SELECT TO anon, authenticated USING (true);

-- 4. API Grants (Least Privilege)
GRANT SELECT ON public.phase1_qa_reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_qa_reviews TO service_role;

GRANT SELECT ON public.phase1_approvals TO anon, authenticated;
GRANT SELECT ON public.phase1_approvals_data TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_approvals_data TO service_role;

GRANT SELECT ON public.phase1_chat_threads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_chat_threads TO service_role;

GRANT SELECT ON public.phase1_chat_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_chat_messages TO service_role;

-- 5. Seed Target Tables
INSERT INTO public.phase1_qa_reviews (id, "artifactId", reviewer, status, notes, "reviewedAt")
VALUES 
  ('11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'QA Sentinel', 'REVIEW', 'Checking for compliant language regarding B2B lead generation claims.', now() - interval '30 minutes'),
  ('22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'QA Sentinel', 'PASS', 'Visuals meet brand guidelines. No copyright issues detected.', now() - interval '2 hours')
ON CONFLICT (id) DO UPDATE SET
  "artifactId" = EXCLUDED."artifactId",
  reviewer = EXCLUDED.reviewer,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

INSERT INTO public.phase1_approvals_data (id, "targetType", "taskId", "artifactId", "workflowRunId", status, "requestedBy", "requestedAt", "decidedBy")
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'task', 'f1111111-1111-1111-1111-111111111111', NULL, NULL, 'REQUESTED', 'system_orchestrator', now() - interval '10 minutes', NULL),
  ('44444444-4444-4444-4444-444444444444', 'artifact', NULL, '99999999-9999-9999-9999-999999999999', NULL, 'APPROVED', 'a2222222-2222-2222-2222-222222222222', now() - interval '3 hours', 'human_founder')
ON CONFLICT (id) DO UPDATE SET
  "targetType" = EXCLUDED."targetType",
  "taskId" = EXCLUDED."taskId",
  "artifactId" = EXCLUDED."artifactId",
  "workflowRunId" = EXCLUDED."workflowRunId",
  status = EXCLUDED.status,
  "requestedBy" = EXCLUDED."requestedBy",
  "decidedBy" = EXCLUDED."decidedBy";

INSERT INTO public.phase1_chat_threads (id, title, purpose, status, "lastActivityAt")
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'Command Center', 'Main orchestration thread', 'ACTIVE', now())
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  purpose = EXCLUDED.purpose,
  status = EXCLUDED.status;

INSERT INTO public.phase1_chat_messages (id, "threadId", sender, body, "intentType", "targetDepartmentId", "targetAgentId", "createdAt")
VALUES 
  ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'human', 'Khởi tạo chiến dịch marketing 10 ngày cho CRM.', 'create_content', NULL, NULL, now() - interval '3 hours'),
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'system', 'Đã tiếp nhận yêu cầu. Khởi chạy Workflow: "Campaign Planning". Giao việc cho phòng Marketing.', 'request_status', '22222222-2222-2222-2222-222222222222', NULL, now() - interval '2 hours 59 minutes'),
  ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'agent', 'Tôi đã phân tích xong tệp khách hàng B2B. Đang lên sườn bài cho Day 1.', 'create_content', '22222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', now() - interval '1 hour')
ON CONFLICT (id) DO UPDATE SET
  sender = EXCLUDED.sender,
  body = EXCLUDED.body,
  "intentType" = EXCLUDED."intentType",
  "targetDepartmentId" = EXCLUDED."targetDepartmentId",
  "targetAgentId" = EXCLUDED."targetAgentId";
