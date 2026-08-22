create table if not exists public.workflow_run_context (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id text not null unique,
  organization_id uuid not null,
  thread_id uuid not null,
  content_item_id text,
  workflow_name text not null,
  status text not null default 'started',
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_run_context_thread_id_idx
  on public.workflow_run_context(thread_id);

create index if not exists workflow_run_context_org_status_idx
  on public.workflow_run_context(organization_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_workflow_run_context_updated_at on public.workflow_run_context;
create trigger trg_workflow_run_context_updated_at
before update on public.workflow_run_context
for each row execute function public.set_updated_at();

-- Permissions
grant select, insert, update on public.workflow_run_context to service_role;
revoke all on public.workflow_run_context from anon, authenticated, public;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
