import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const baseDir = 'D:/Projects/CRM_PRODUCT_PACKAGING_OUTPUT_run_quick_1/TAI LIEU TRI THUC/TAI LIEU MARKETING';

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

if (supabaseUrl.includes('jrgkpbjsqefvnhbiiutz')) {
  console.error('FATAL: Target DB is PRODUCTION (jrgkpbjsqefvnhbiiutz). ABORTING!');
  process.exit(1);
}

console.log('Target Staging DB Clone:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const TARGET_ORG_ID = '8289488a-b255-4cb6-9bff-c9d2e71af160';

interface KnowledgeObjectManifestItem {
  id: string;
  canonical_file: string;
  object_class: string;
  semantic_type: string;
  sensitivity: string;
  namespace: string;
  version: string;
}

const MANIFEST_ITEMS: KnowledgeObjectManifestItem[] = [
  {
    id: 'KO-01',
    canonical_file: 'KO-01/PN_MEDIA_PLUS_MARKETING_01_EPISTEMIC_EVIDENCE_GOVERNANCE_v1.0_LOCKED.md',
    object_class: 'governance',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-02',
    canonical_file: 'KO-02/PN_MEDIA_PLUS_MARKETING_02_MARKET_INDUSTRY_RESEARCH_FRAMEWORK_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-03',
    canonical_file: 'KO-03/PN_MEDIA_PLUS_MARKETING_03_ICP_SELECTION_FRAMEWORK_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-04',
    canonical_file: 'KO-04/PN_MEDIA_PLUS_MARKETING_04_ICP_CUSTOMER_EVIDENCE_PACK_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'hypothesis',
    sensitivity: 'internal',
    namespace: 'marketing_evidence',
    version: '1.0',
  },
  {
    id: 'KO-05',
    canonical_file: 'KO-05/PN_MEDIA_PLUS_MARKETING_05_PAIN_EVIDENCE_PAIN_WEDGE_SELECTION_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'hypothesis',
    sensitivity: 'internal',
    namespace: 'marketing_evidence',
    version: '1.0',
  },
  {
    id: 'KO-06',
    canonical_file: 'KO-06/PN_MEDIA_PLUS_MARKETING_06_PRODUCT_GROUND_TRUTH_CAPABILITY_MATRIX_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-07',
    canonical_file: 'KO-07/PN_MEDIA_PLUS_MARKETING_07_PRODUCT_TO_PAIN_FIT_MATRIX_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'recommendation',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-08',
    canonical_file: 'KO-08/PN_MEDIA_PLUS_MARKETING_08_POSITIONING_MESSAGE_DECISION_SYSTEM_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-09',
    canonical_file: 'KO-09/PN_MEDIA_PLUS_MARKETING_09_CREATIVE_FUNNEL_ARCHITECTURE_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
  {
    id: 'KO-10',
    canonical_file: 'KO-10/PN_MEDIA_PLUS_MARKETING_10_EXPERIMENT_LEARNING_CAPTURE_v1.0.md',
    object_class: 'knowledge',
    semantic_type: 'pattern',
    sensitivity: 'internal',
    namespace: 'marketing_runtime_reasoning',
    version: '1.0',
  },
];

async function runDbBotNormalization() {
  console.log('================================================================');
  console.log('DB_BOT: NORMALIZE & INGEST MARKETING KNOWLEDGE ON STAGING');
  console.log('Target Organization ID:', TARGET_ORG_ID);
  console.log('================================================================\n');

  const report: {
    total: number;
    success: number;
    failed: number;
    items: Array<{
      ko_id: string;
      title: string;
      canonical_file: string;
      content_sha256: string;
      idempotency_key: string;
      semantic_type: string;
      doc_id?: string;
      status: string;
      error?: string;
    }>;
  } = {
    total: MANIFEST_ITEMS.length,
    success: 0,
    failed: 0,
    items: [],
  };

  for (const item of MANIFEST_ITEMS) {
    const fullPath = path.join(baseDir, item.canonical_file);

    if (!fs.existsSync(fullPath)) {
      console.error(`[FAIL] Missing file for ${item.id}: ${fullPath}`);
      report.failed++;
      report.items.push({
        ko_id: item.id,
        title: item.id,
        canonical_file: item.canonical_file,
        content_sha256: '',
        idempotency_key: '',
        semantic_type: item.semantic_type,
        status: 'FAILED_FILE_MISSING',
        error: `File not found: ${fullPath}`,
      });
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const h1Match = content.match(/^#\s+(.+)$/m);
    const title = h1Match ? h1Match[1].trim() : path.basename(item.canonical_file, '.md');

    const contentSha256 = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');

    const rawIdempString = `${TARGET_ORG_ID.trim().toLowerCase()}:${item.id.trim().toLowerCase()}:${item.version.trim().toLowerCase()}:${contentSha256.toLowerCase()}`;
    const idempotencyKey = crypto.createHash('sha256').update(rawIdempString, 'utf-8').digest('hex');

    if (item.semantic_type === 'fact') {
      throw new Error(`Rule 4 VIOLATION: Framework ${item.id} cannot be mapped to 'fact'`);
    }

    const allowedPurposes = ['internal_reasoning', 'planning'];
    const applicability = {
      departments: ['marketing'],
    };

    const normalizedMetadata = {
      knowledge_id: item.id,
      organization_id: TARGET_ORG_ID,
      title,
      version: item.version,
      object_class: item.object_class,
      semantic_type: item.semantic_type,
      governance_type: item.object_class === 'governance' ? 'rule' : 'none',
      epistemic_status: 'reviewed_framework',
      usage_authority: 'internal_reasoning_only',
      sensitivity: item.sensitivity,
      allowed_purposes: allowedPurposes,
      prohibited_purposes: ['public_content'],
      applicability,
      decision_scope: ['marketing_strategy', 'campaign_planning'],
      retrieval_namespace: item.namespace,
      provenance: {
        source_type: 'marketing_packaging_agent',
        source_document: item.canonical_file,
        source_sha256: contentSha256,
      },
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      approval_authority: 'human_founder',
      redaction: {
        is_redacted: false,
        rules: [],
        redaction_hash: null,
        rules_version: '1.0',
      },
      idempotency_key: idempotencyKey,
    };

    const { data: existingDoc, error: checkErr } = await supabase
      .from('crm_knowledge_documents')
      .select('id, idempotency_key, knowledge_status, ingestion_status')
      .eq('organization_id', TARGET_ORG_ID)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (checkErr) {
      console.error(`[ERROR] DB query error for ${item.id}:`, checkErr);
      report.failed++;
      report.items.push({
        ko_id: item.id,
        title,
        canonical_file: item.canonical_file,
        content_sha256: contentSha256,
        idempotency_key: idempotencyKey,
        semantic_type: item.semantic_type,
        status: 'FAILED_DB_CHECK',
        error: checkErr.message,
      });
      continue;
    }

    if (existingDoc) {
      console.log(`[EXISTING] ${item.id} already exists with doc ID ${existingDoc.id}`);
      report.success++;
      report.items.push({
        ko_id: item.id,
        title,
        canonical_file: item.canonical_file,
        content_sha256: contentSha256,
        idempotency_key: idempotencyKey,
        semantic_type: item.semantic_type,
        doc_id: existingDoc.id,
        status: 'ALREADY_EXISTS_IDEMPOTENT',
      });
      continue;
    }

    const insertPayload = {
      organization_id: TARGET_ORG_ID,
      title: `[MARKETING ${item.id}] ${title}`,
      file_url: `${TARGET_ORG_ID}/marketing/${item.canonical_file}`,
      namespace: item.namespace,
      status: 'pending',
      knowledge_status: 'REVIEWED',
      ingestion_status: 'PENDING',
      idempotency_key: idempotencyKey,
      knowledge_metadata: normalizedMetadata,
    };

    const { data: insertedDoc, error: insertErr } = await supabase
      .from('crm_knowledge_documents')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertErr) {
      console.error(`[INSERT FAILED] ${item.id}:`, insertErr);
      report.failed++;
      report.items.push({
        ko_id: item.id,
        title,
        canonical_file: item.canonical_file,
        content_sha256: contentSha256,
        idempotency_key: idempotencyKey,
        semantic_type: item.semantic_type,
        status: 'FAILED_INSERT',
        error: insertErr.message,
      });
    } else {
      console.log(`[SUCCESS] ${item.id} ingested with doc ID: ${insertedDoc.id}`);
      report.success++;
      report.items.push({
        ko_id: item.id,
        title,
        canonical_file: item.canonical_file,
        content_sha256: contentSha256,
        idempotency_key: idempotencyKey,
        semantic_type: item.semantic_type,
        doc_id: insertedDoc.id,
        status: 'INGESTED_SUCCESS',
      });
    }
  }

  console.log('\n================================================================');
  console.log('DB_BOT NORMALIZATION REPORT:');
  console.log(`Total KOs: ${report.total} | Success: ${report.success} | Failed: ${report.failed}`);
  console.log('================================================================\n');

  const reportPath = path.join(process.cwd(), 'docs/governance/DB_BOT_MARKETING_KNOWLEDGE_NORMALIZATION_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log('Report saved to:', reportPath);

  return report;
}

runDbBotNormalization().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
