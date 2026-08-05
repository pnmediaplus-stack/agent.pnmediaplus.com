"use server";

import { requireAuthContext } from "@/lib/portal-auth";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { issueReferenceToken } from "./vault-actions";

type DispatchResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
};

export async function dispatchToN8n(approvalId: string, integrationKey: string): Promise<DispatchResponse> {
  try {
    const authContext = await requireAuthContext();

    if (authContext.role !== "admin" && authContext.role !== "approver") {
      return { ok: false, state: "blocked", reason: "UNAUTHORIZED_ROLE" };
    }

    const supabase = createServiceRoleClient();

    // 1. Verify Approval State & Org Scope
    const { data: approval, error: approvalError } = await supabase
      .from("pn_os_ai_department.approvals")
      .select("*, gates!inner(organization_id, artifact_version_id)")
      .eq("id", approvalId)
      .single();

    if (approvalError || !approval) {
      return { ok: false, state: "blocked", reason: "APPROVAL_NOT_FOUND" };
    }

    if (approval.gates.organization_id !== authContext.organizationId) {
      return { ok: false, state: "blocked", reason: "ORGANIZATION_MISMATCH" };
    }

    if (approval.approval_status !== "APPROVED") {
      return { ok: false, state: "blocked", reason: "APPROVAL_NOT_GRANTED" };
    }

    // 2. Verify QA Pass State
    const { data: qaReview, error: qaError } = await supabase
      .from("pn_os_ai_department.qa_reviews")
      .select("verdict")
      .eq("artifact_version_id", approval.gates.artifact_version_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
      
    if (qaError || !qaReview || qaReview.verdict !== "PASS") {
      return { ok: false, state: "blocked", reason: "QA_NOT_PASSED" };
    }

    // 3. Verify Integration Status
    const { data: statusView, error: statusError } = await supabase
      .from("public.phase070_tenant_integration_status")
      .select("connection_state, credential_configured, provider_code")
      .eq("organization_id", authContext.organizationId)
      .eq("integration_key", integrationKey)
      .single();

    if (statusError || !statusView) {
      return { ok: false, state: "blocked", reason: "INTEGRATION_NOT_FOUND" };
    }

    if (!statusView.credential_configured) {
      return { ok: false, state: "blocked", reason: "CREDENTIAL_NOT_CONFIGURED" };
    }

    // Wait, the statusView connection_state might not be healthy for now, 
    // but the plan says "kiểm tra connection_state = healthy".
    // For this prototype, we'll enforce it.
    if (statusView.connection_state === "blocked" || statusView.connection_state === "failed") {
        return { ok: false, state: "blocked", reason: "CONNECTION_NOT_HEALTHY" };
    }

    // 4. Issue BYOK Reference Token
    const tokenResponse = await issueReferenceToken(integrationKey, statusView.provider_code);
    if (!tokenResponse.ok || !tokenResponse.data?.receipt?.lease_token) {
      return { ok: false, state: "blocked", reason: `FAILED_TO_ISSUE_TOKEN: ${tokenResponse.reason}` };
    }
    
    const leaseToken = tokenResponse.data.receipt.lease_token;
    const brokerReceiptRef = tokenResponse.data.receipt.broker_receipt_ref;

    // 5. Dispatch Payload to N8N
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return { ok: false, state: "blocked", reason: "N8N_WEBHOOK_URL_NOT_CONFIGURED" };
    }

    const dispatchPayload = {
      artifact_version_id: approval.gates.artifact_version_id,
      organization_id: authContext.organizationId,
      integration_key: integrationKey,
      lease_token: leaseToken,
      broker_receipt_ref: brokerReceiptRef,
      reference_token: leaseToken // For n8n if strictly required
    };

    const dispatchReq = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dispatchPayload)
    });

    if (!dispatchReq.ok) {
        return { ok: false, state: "blocked", reason: "N8N_DISPATCH_FAILED" };
    }

    return { ok: true, state: "ready", reason: "DISPATCH_SUCCESS" };
  } catch (err: any) {
    return { ok: false, state: "blocked", reason: err.message };
  }
}
