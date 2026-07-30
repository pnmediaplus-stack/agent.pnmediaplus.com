create or replace view public.phase5_campaigns_updatable as
select id, title, goal_description, target_audience, status, created_at, updated_at, strategy_id
from pn_content_phase2.campaigns;

grant select, update on public.phase5_campaigns_updatable to anon, authenticated, service_role;
grant all privileges on public.phase5_campaigns_updatable to service_role;

NOTIFY pgrst, 'reload schema';
