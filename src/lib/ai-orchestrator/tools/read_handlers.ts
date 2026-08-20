import { loadDepartmentGovernanceBundle } from "@/lib/department-governance-loader";

export async function handleQueryDepartments() {
  try {
    const bundle = await loadDepartmentGovernanceBundle();
    if (bundle.state !== "ready") return JSON.stringify({ error: `Registry not ready: ${bundle.reason}` });
    const records = bundle.data.registryJson.department_records || [];
    const depts = records.map(r => ({
      id: r.department_id,
      name: r.department_name
    }));
    return JSON.stringify({ departments: depts });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function handleCheckContentStatus(organizationId: string, contentItemId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) return JSON.stringify({ error: "Server config missing" });

    // Fetch content item
    const resItem = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}&organization_id=eq.${organizationId}`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const items = await resItem.json();
    if (!items || items.length === 0) return JSON.stringify({ error: "Content item not found in this organization" });

    const item = items[0];

    // Fetch latest QA Phase 2 Review
    const resQa = await fetch(`${supabaseUrl}/rest/v1/phase2_qa_reviews?content_item_id=eq.${contentItemId}&order=created_at.desc&limit=1`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const qaReviews = await resQa.json();
    
    return JSON.stringify({
      id: item.id,
      state: item.state,
      title: item.title,
      qa_info: qaReviews && qaReviews.length > 0 ? {
        verdict: qaReviews[0].verdict,
        average_score: qaReviews[0].average_score,
        notes: qaReviews[0].notes
      } : "No QA review found"
    });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}

export async function handleListActiveCampaigns(organizationId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) return JSON.stringify({ error: "Server config missing" });

    const res = await fetch(`${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${organizationId}&status=in.(DRAFT,ACTIVE,IN_PROGRESS)&order=created_at.desc&limit=10`, {
      headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` }
    });
    const campaigns = await res.json();
    
    if (campaigns.error) return JSON.stringify({ error: campaigns.error.message });

    return JSON.stringify({
      campaigns: campaigns.map((c: any) => ({
        id: c.id,
        title: c.title,
        status: c.status
      }))
    });
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}
