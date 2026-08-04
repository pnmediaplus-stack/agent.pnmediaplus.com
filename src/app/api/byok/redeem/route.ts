import {
  ByokBrokerError,
  authorizeBrokerRedeemRequest,
  byokEnvelope,
  redeemReferenceToken
} from "@/lib/byok-secret-broker";

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    
    // We expect reference_token, organization_id, integration_key
    if (!payload.reference_token || typeof payload.reference_token !== "string") {
      throw new ByokBrokerError(400, "MISSING_REFERENCE_TOKEN", "reference_token is required.");
    }

    if (!payload.organization_id || typeof payload.organization_id !== "string") {
      throw new ByokBrokerError(400, "MISSING_ORGANIZATION_ID", "organization_id is required.");
    }

    if (!payload.integration_key || typeof payload.integration_key !== "string") {
      throw new ByokBrokerError(400, "MISSING_INTEGRATION_KEY", "integration_key is required.");
    }

    // Auth verification for broker/n8n specifically
    const actor = await authorizeBrokerRedeemRequest(request.headers, payload);

    const redeemed = await redeemReferenceToken(
      payload.reference_token,
      payload.organization_id,
      payload.integration_key,
      actor
    );

    return Response.json(
      byokEnvelope("byok-redeem-token", 200, "Token redeemed successfully.", redeemed),
      { status: 200 }
    );
  } catch (error) {
    const status = error instanceof ByokBrokerError ? error.status : 500;
    const code = error instanceof ByokBrokerError ? error.code : "BYOK_REDEEM_FAILED";
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      byokEnvelope("byok-redeem-token", status, message, undefined, code),
      { status }
    );
  }
}
