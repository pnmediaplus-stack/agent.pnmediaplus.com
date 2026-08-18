import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  // Cron jobs on Vercel are triggered via GET requests
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Optionally secure the cron endpoint
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch PENDING records from outbox
    const { data: pendingJobs, error: fetchErr } = await supabase
      .from('llm_ledger_outbox')
      .select('*')
      .eq('status', 'PENDING')
      .limit(50); // Batch size

    if (fetchErr || !pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ status: 'ok', processed: 0 });
    }

    let processedCount = 0;

    for (const job of pendingJobs) {
      // 2. Lock the job (set to PROCESSING)
      const { error: lockErr } = await supabase
        .from('llm_ledger_outbox')
        .update({ status: 'PROCESSING', locked_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'PENDING'); // Optimistic locking

      if (lockErr) continue; // Someone else locked it

      try {
        // Fetch original usage record to get model_code if it's unknown
        let modelCode = job.model_code;
        if (!modelCode || modelCode === 'unknown') {
           const { data: usageRecord } = await supabase.from('phase2_llm_usage').select('model').eq('id', job.usage_id).single();
           if (usageRecord) modelCode = usageRecord.model;
        }

        // 3. Calculate Cost
        let estimatedCost = 0;
        let pricingMissing = false;
        let pricingMissingReason = null;

        // Fetch provider catalog to get the cost
        const { data: providerConfig } = await supabase
          .from('tenant_integration_vault.integration_providers')
          .select('public_metadata')
          .eq('provider_code', job.provider_code)
          .single();

        if (providerConfig && providerConfig.public_metadata && (providerConfig.public_metadata as any).models) {
          const models = (providerConfig.public_metadata as any).models;
          const modelConfig = models.find((m: any) => m.code === modelCode);
          
          if (modelConfig) {
             if (modelConfig.completion_cost !== undefined) {
               // Assuming 1 image per job for now, normalized per 1k in adapter
               estimatedCost = (1 / 1000) * modelConfig.completion_cost;
             } else {
               pricingMissing = true;
               pricingMissingReason = 'MISSING_TEXT_PRICING'; // using same reason string as adapter
             }
          }
        } else {
           pricingMissing = true;
           pricingMissingReason = 'PROVIDER_CONFIG_NOT_FOUND';
        }

        // 4. Update phase2_llm_usage (finalize_llm_usage RPC logic)
        // Since we bypass invokeLlm's updateUsageRecord, we do it here
        const { error: finalizeErr } = await supabase.rpc('finalize_llm_usage', {
          p_record_id: job.usage_id,
          p_status: 'COMPLETED',
          p_prompt_tokens: 0,
          p_completion_tokens: 0, // Images don't use tokens
          p_total_tokens: 0,
          p_estimated_cost: estimatedCost,
          p_pricing_missing: pricingMissing,
          p_pricing_missing_reason: pricingMissingReason
        });

        if (finalizeErr) throw new Error(`finalize_llm_usage failed: ${finalizeErr.message}`);

        // 5. Insert into ai_token_ledger
        const { error: ledgerErr } = await supabase
          .from('ai_token_ledger')
          .insert({
            organization_id: job.tenant_id,
            provider_code: job.provider_code,
            model_used: modelCode || 'unknown',
            workflow_run_id: job.task_id || job.id, // Using task_id as workflow_run_id for traceability
            unit: 'images',
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            estimated_cost_usd: estimatedCost,
            pricing_missing: pricingMissing,
            pricing_missing_reason: pricingMissingReason
          });

        if (ledgerErr) throw new Error(`ai_token_ledger insert failed: ${ledgerErr.message}`);

        // 6. Mark Outbox as COMPLETED
        await supabase
          .from('llm_ledger_outbox')
          .update({ 
             status: 'COMPLETED', 
             estimated_cost: estimatedCost,
             pricing_missing: pricingMissing,
             pricing_missing_reason: pricingMissingReason,
             processed_at: new Date().toISOString() 
          })
          .eq('id', job.id);
          
        processedCount++;

      } catch (jobErr: any) {
        // 7. Mark Outbox as FAILED
        await supabase
          .from('llm_ledger_outbox')
          .update({ 
             status: 'FAILED', 
             last_error: jobErr.message,
             attempt_count: job.attempt_count + 1
          })
          .eq('id', job.id);
      }
    }

    return NextResponse.json({ status: 'ok', processed: processedCount });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
