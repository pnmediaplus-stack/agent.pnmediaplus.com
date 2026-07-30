-- Tạo bảng publish_records
create table if not exists pn_content_phase2.publish_records (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references pn_content_phase2.content_items(id) on delete cascade,
  asset_id uuid references pn_content_phase2.assets(id) on delete set null,
  channel text not null,
  external_id text,
  external_url text,
  status text not null default 'pending',
  published_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bật RLS
alter table pn_content_phase2.publish_records enable row level security;

-- Policy (Dành riêng cho service_role / n8n)
drop policy if exists "Allow all for service_role on publish_records" on pn_content_phase2.publish_records;
create policy "Allow all for service_role on publish_records"
  on pn_content_phase2.publish_records
  for all
  to service_role
  using (true)
  with check (true);

-- Tạo View public cho Next.js Dashboard
create or replace view public.phase2_publish_records as
select
  id,
  content_item_id,
  asset_id,
  channel,
  external_id,
  external_url,
  status,
  published_at,
  error_message,
  created_at,
  updated_at
from pn_content_phase2.publish_records;

grant select on public.phase2_publish_records to anon, authenticated, service_role;

-- Cập nhật schema cache của PostgREST
NOTIFY pgrst, 'reload schema';
