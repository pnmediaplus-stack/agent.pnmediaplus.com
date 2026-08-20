const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:8000';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const organizationId = 'd861df4b-614d-44a8-9d41-e9de5e12f990'; // Assuming standard tenant ID for local dev
const contentItemId = 'cd01afb6-3a89-48e5-8cbf-db10036a602c';

async function test() {
  const headers = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
  
  // 1. Fetch item
  let r = await fetch(`${SUPABASE_URL}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, { headers });
  if (!r.ok) { console.error('fetch item', await r.text()); return; }
  const items = await r.json();
  const item = items[0];
  console.log('Item state:', item.state, 'artifact_version_id:', item.artifact_version_id);
  
  const dummyArtifactId = crypto.randomUUID();
  console.log('Creating artifact:', dummyArtifactId);
  r = await fetch(`${SUPABASE_URL}/rest/v1/artifacts`, {
    method: 'POST',
    headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department', 'Content-Profile': 'pn_os_ai_department', 'Prefer': 'resolution=ignore-duplicates' },
    body: JSON.stringify({
      id: dummyArtifactId,
      organization_id: item.organization_id, // Use actual organization_id from item!
      name: 'Auto-generated Content Artifact',
      artifact_type: 'social_post'
    })
  });
  if (!r.ok) console.error('POST artifact fail:', await r.text());
  
  const artifactVersionId = crypto.randomUUID();
  console.log('Creating version:', artifactVersionId);
  r = await fetch(`${SUPABASE_URL}/rest/v1/artifact_versions`, {
    method: 'POST',
    headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department', 'Content-Profile': 'pn_os_ai_department' },
    body: JSON.stringify({
      id: artifactVersionId,
      artifact_id: dummyArtifactId,
      version_number: Date.now(),
      state: 'APPROVED',
      created_by_actor_type: 'SYSTEM',
      created_by_external_ref: 'Auto Publisher'
    })
  });
  if (!r.ok) console.error('POST version fail:', await r.text());
  
  console.log('Patching content item...');
  r = await fetch(`${SUPABASE_URL}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ artifact_version_id: artifactVersionId, state: 'scheduled' })
  });
  if (!r.ok) console.error('PATCH item fail:', await r.text());
  else console.log('PATCH item SUCCESS');
}
// We can't run this easily if node-fetch is missing and node 22 fetch is failing due to localhost resolution.
// But we can just use the server's running container to execute it!
