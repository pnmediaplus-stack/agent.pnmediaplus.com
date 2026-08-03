const fs = require('fs');

async function runBackfill() {
  console.log("Starting backfill migration...");

  // 1. Read config
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const env = envFile.split('\n').reduce((acc, line) => {
    const parts = line.split('=');
    const key = parts[0]?.trim();
    if (key && parts.length > 1) {
      acc[key] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '').replace(/\r$/, '');
    }
    return acc;
  }, {});

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing Supabase configuration.");
    process.exit(1);
  }

  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };

  // 2. Fetch all tasks that don't have artifact_id in metadata
  const tasksRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?select=id,title,metadata`, {
    headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department' }
  });
  const allTasks = await tasksRes.json();
  
  const tasksToMap = allTasks.filter(t => !t.metadata || !t.metadata.artifact_id);
  console.log(`[INFO] Found ${tasksToMap.length} tasks needing backfill (missing metadata.artifact_id).`);

  // 3. Fetch all artifacts
  const artsRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/phase1_artifacts?select=id,title,departmentId`, { headers });
  const artifacts = await artsRes.json();
  console.log(`[INFO] Found ${artifacts.length} total artifacts available for mapping.`);

  let successCount = 0;
  let skipCount = 0;

  // 4. Try mapping based on old heuristic (artifact.departmentId === task.id)
  for (const task of tasksToMap) {
    console.log(`\n[TASK] Analyzing Task ID: ${task.id} ("${task.title}")`);
    
    // Find matching artifact using the old heuristic
    const matchingArtifact = artifacts.find(a => a.departmentId === task.id);
    
    if (matchingArtifact) {
      console.log(`  -> [FOUND] Matches Artifact ID: ${matchingArtifact.id} ("${matchingArtifact.title}")`);
      
      const newMetadata = { ...task.metadata, artifact_id: matchingArtifact.id };
      
      // Update the database
      const updateRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks?id=eq.${task.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Accept-Profile': 'pn_os_ai_department' },
        body: JSON.stringify({ metadata: newMetadata })
      });
      
      if (updateRes.ok) {
        console.log(`  -> [SUCCESS] Backfilled artifact_id into metadata.`);
        successCount++;
      } else {
        console.error(`  -> [ERROR] Failed to update task in DB: ${updateRes.statusText}`);
      }
    } else {
      console.log(`  -> [SKIP] No artifact mapped to this task (no artifact with departmentId = ${task.id}). Keeping fail-closed contract.`);
      skipCount++;
    }
  }

  console.log(`\n=== BACKFILL COMPLETE ===`);
  console.log(`Total tasks evaluated: ${tasksToMap.length}`);
  console.log(`Successfully mapped: ${successCount}`);
  console.log(`Skipped (no real artifact): ${skipCount}`);
}

runBackfill().catch(console.error);
