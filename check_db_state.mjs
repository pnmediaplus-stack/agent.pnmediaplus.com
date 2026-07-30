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

async function checkDB() {
  console.log("Checking performance records...");
  const pRes = await fetch(`${supabaseUrl}/rest/v1/phase2_performance_records?or=(CTR.gt.1,views.gt.10)&order=performance_score.desc&limit=5`, { headers });
  const pData = await pRes.json();
  console.log(`Found ${pData.length} performance records`);
  if (pData.length > 0) {
    console.log("Latest record:", JSON.stringify(pData[pData.length - 1], null, 2));
  }

  console.log("Checking lessons learned...");
  const lRes = await fetch(`${supabaseUrl}/rest/v1/phase2_lessons_learned?select=*`, { headers });
  const lData = await lRes.json();
  console.log(`Found ${lData.length} lessons learned`);
  if (lData.length > 0) {
    console.log("Latest lesson:", JSON.stringify(lData[0], null, 2));
  }
}

checkDB();
