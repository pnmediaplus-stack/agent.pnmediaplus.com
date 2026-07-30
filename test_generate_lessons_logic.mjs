import fs from 'fs';
import dotenv from 'dotenv';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const headers = {
  'apikey': supabaseKey,
  'Authorization': `Bearer ${supabaseKey}`
};

async function testGenerateLessons() {
  // 1. Fetch top performing records
  console.log("Fetching top performers...");
  const perfRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records?or=(CTR.gt.1,views.gt.10)&order=performance_score.desc&limit=5`, { headers });
  const topPerformers = await perfRes.json();
  
  if (!topPerformers || topPerformers.length === 0) {
    console.log("No top performing posts found");
    return;
  }
  
  console.log(`Found ${topPerformers.length} top performers. IDs:`, topPerformers.map(p => p.id));

  // 2. Fetch existing lessons
  console.log("Fetching existing lessons...");
  const existingLessonsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_lessons_learned?select=contentItemId`, { headers });
  const existingLessons = await existingLessonsRes.json() || [];
  const existingIds = existingLessons.map((l) => l.contentItemId);
  
  console.log(`Found ${existingIds.length} existing lesson IDs.`);

  const recordsToProcess = topPerformers.filter((p) => !existingIds.includes(p.content_item_id));

  if (recordsToProcess.length === 0) {
    console.log("All top performing posts already have lessons");
    return;
  }
  
  console.log(`Processing ${recordsToProcess.length} records...`);
  
  for (const record of recordsToProcess) {
    console.log(`Processing record ${record.id} for content item ${record.content_item_id}...`);
    
    const itemRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${record.content_item_id}`, { headers });
    const items = await itemRes.json();
    if (!items || items.length === 0) {
      console.log(`Content item ${record.content_item_id} NOT FOUND! Skipping.`);
      continue;
    }
    const item = items[0];
    console.log(`Found content item: ${item.title}`);
  }
}

testGenerateLessons();
