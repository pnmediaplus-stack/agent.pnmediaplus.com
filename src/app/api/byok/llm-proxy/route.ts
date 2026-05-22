import {
  ByokBrokerError,
  authorizeBrokerRedeemRequest,
  byokEnvelope,
  runBrokeredLlmCall
} from "@/lib/byok-secret-broker";
import type { ByokLlmProxyRequest } from "@/types/byok";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ByokLlmProxyRequest;

  try {
    const actor = await authorizeBrokerRedeemRequest(request.headers, payload);
    const result = await runBrokeredLlmCall(payload, actor);

    return Response.json(
      byokEnvelope("byok-llm-proxy", 200, "Brokered LLM call completed. No raw secret left server broker scope.", result),
      { status: 200 }
    );
  } catch (error) {
    const status = error instanceof ByokBrokerError ? error.status : 500;
    const code = error instanceof ByokBrokerError ? error.code : "BYOK_LLM_PROXY_FAILED";
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      byokEnvelope("byok-llm-proxy", status, message, undefined, code),
      { status }
    );
  }
}
