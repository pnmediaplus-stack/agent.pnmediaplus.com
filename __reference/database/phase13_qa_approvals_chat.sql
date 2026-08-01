-- ==============================================================================
-- PHASE 13: QA, APPROVALS, AND CHAT DATABASE SCHEMA
-- ==============================================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.phase1_qa_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "artifactId" text NOT NULL,
  reviewer text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'REVIEW', 'PASS', 'BLOCKED', 'HOLD')),
  notes text NOT NULL,
  "reviewedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phase1_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "targetType" text NOT NULL CHECK ("targetType" IN ('task', 'artifact', 'workflow')),
  "targetId" text NOT NULL,
  status text NOT NULL CHECK (status IN ('PENDING', 'REQUESTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED')),
  "requestedBy" text NOT NULL,
  "requestedAt" timestamptz NOT NULL DEFAULT now(),
  "decidedBy" text
);

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
  "targetDepartmentId" uuid,
  "targetAgentId" uuid,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- 2. Row Level Security (RLS)
ALTER TABLE public.phase1_qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase1_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read for qa_reviews" ON public.phase1_qa_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for approvals" ON public.phase1_approvals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for chat_threads" ON public.phase1_chat_threads FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon read for chat_messages" ON public.phase1_chat_messages FOR SELECT TO anon, authenticated USING (true);

-- 3. API Grants (Least Privilege)
GRANT SELECT ON public.phase1_qa_reviews TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_qa_reviews TO service_role;

GRANT SELECT ON public.phase1_approvals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_approvals TO service_role;

GRANT SELECT ON public.phase1_chat_threads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_chat_threads TO service_role;

GRANT SELECT ON public.phase1_chat_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase1_chat_messages TO service_role;

-- 4. Seed Data
INSERT INTO public.phase1_qa_reviews (id, "artifactId", reviewer, status, notes, "reviewedAt")
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'art-crm-day1-copy', 'QA Sentinel', 'REVIEW', 'Checking for compliant language regarding B2B lead generation claims.', now() - interval '30 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'art-crm-hero-image', 'QA Sentinel', 'PASS', 'Visuals meet brand guidelines. No copyright issues detected.', now() - interval '2 hours')
ON CONFLICT (id) DO UPDATE SET
  "artifactId" = EXCLUDED."artifactId",
  reviewer = EXCLUDED.reviewer,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes;

INSERT INTO public.phase1_approvals (id, "targetType", "targetId", status, "requestedBy", "requestedAt", "decidedBy")
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'task', 'f1111111-1111-1111-1111-111111111111', 'REQUESTED', 'system_orchestrator', now() - interval '10 minutes', NULL),
  ('44444444-4444-4444-4444-444444444444', 'artifact', 'art-crm-hero-image', 'APPROVED', 'a2222222-2222-2222-2222-222222222222', now() - interval '3 hours', 'human_founder')
ON CONFLICT (id) DO UPDATE SET
  "targetType" = EXCLUDED."targetType",
  "targetId" = EXCLUDED."targetId",
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

INSERT INTO public.phase1_chat_messages (id, "threadId", sender, body, "intentType", "createdAt")
VALUES 
  ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'human', 'Khởi tạo chiến dịch marketing 10 ngày cho CRM.', 'create_content', now() - interval '3 hours'),
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', 'system', 'Đã tiếp nhận yêu cầu. Khởi chạy Workflow: "Campaign Planning". Giao việc cho phòng Marketing.', 'request_status', now() - interval '2 hours 59 minutes'),
  ('88888888-8888-8888-8888-888888888888', '55555555-5555-5555-5555-555555555555', 'agent', 'Tôi đã phân tích xong tệp khách hàng B2B. Đang lên sườn bài cho Day 1.', 'create_content', now() - interval '1 hour')
ON CONFLICT (id) DO UPDATE SET
  sender = EXCLUDED.sender,
  body = EXCLUDED.body,
  "intentType" = EXCLUDED."intentType";
