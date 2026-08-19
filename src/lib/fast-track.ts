import { v4 as uuidv4 } from 'uuid';

export async function fastTrackApproveAndSchedule(organizationId: string, contentItemId: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, { headers });
    const items = await itemRes.json();
    const item = items[0];
    if (!item) return null;

    if (item.state === 'QA_ready') {
      await fetch(`${supabaseUrl}/rest/v1/phase2_qa_reviews`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content_item_id: contentItemId, reviewer_ref: 'system_auto_publish', verdict: 'pass', average_score: 10.0, overclaim_risk: 0, missing_asset: false, evidence_ref: 'evidence://auto-publish', notes: 'Auto-approved via /publish slash command'
        })
      });
      await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ state: 'QA_passed' })
      });
      item.state = 'QA_passed';
    }

    let artifactVersionId = item.artifact_version_id;
    if (!artifactVersionId && (item.state === 'QA_passed' || item.state === 'scheduled')) {
      artifactVersionId = uuidv4();
      await fetch(`${supabaseUrl}/rest/v1/artifact_versions`, {
        method: 'POST',
        headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department' },
        body: JSON.stringify({
          id: artifactVersionId,
          artifact_id: '516cb800-b1a4-4b5b-8179-f389faa3b02f', // generic content artifact
          version_number: Date.now(),
          state: 'APPROVED',
          created_by_actor_type: 'SYSTEM',
          created_by_external_ref: 'Auto Publisher'
        })
      });
      await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ artifact_version_id: artifactVersionId, state: 'scheduled' })
      });
    }

    return artifactVersionId || item.artifact_version_id;
  } catch (e) {
    console.error('Fast track failed:', e);
    return null;
  }
}
