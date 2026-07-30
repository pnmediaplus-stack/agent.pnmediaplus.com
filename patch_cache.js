import fs from 'fs';
import { execSync } from 'child_process';

const files = [
  'src/app/api/phase2/performance-scraper/route.ts',
  'src/app/api/phase2/generate-lessons/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add force-dynamic
  if (!content.includes("export const dynamic = 'force-dynamic';")) {
    content = content.replace("export async function POST", "export const dynamic = 'force-dynamic';\n\nexport async function POST");
  }

  // Replace all fetch(...) with fetch(..., { ...options, cache: 'no-store' })
  // But wait, the options are already an object. We can just use string replacement.
  content = content.replace(/headers: { apikey/g, "cache: 'no-store', headers: { apikey");
  
  fs.writeFileSync(file, content);
}
