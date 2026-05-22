import {
  ByokBrokerError,
  authorizeHumanRequest,
  byokEnvelope,
  issueReferenceToken
} from "@/lib/byok-secret-broker";
import type { ByokIssueTokenRequest } from "@/types/byok";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ByokIssueTokenRequest;

  try {
    const actor = await authorizeHumanRequest(request.headers, payload);
    const token = await issueReferenceToken(payload, actor);

    return Response.json(
      byokEnvelope("byok-reference-token", 200, "Reference token issued. Raw secret remains server-side only.", token),
      { status: 200 }
    );
  } catch (error) {
    const status = error instanceof ByokBrokerError ? error.status : 500;
    const code = error instanceof ByokBrokerError ? error.code : "BYOK_REFERENCE_TOKEN_FAILED";
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(
      byokEnvelope("byok-reference-token", status, message, undefined, code),
      { status }
    );
  }
}
