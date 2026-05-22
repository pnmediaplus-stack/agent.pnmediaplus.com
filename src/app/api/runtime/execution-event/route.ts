import {
  ingestRuntimeExecutionEvent,
  RuntimeExecutionIngressError
} from "@/lib/runtime-execution-ingress";
import type { RuntimeExecutionIngressEnvelope } from "@/types/runtime";

function envelope<TData>(
  status: number,
  message: string,
  data?: TData,
  error?: string
): RuntimeExecutionIngressEnvelope<TData> {
  return {
    ok: status >= 200 && status < 300,
    route: "runtime-execution-event",
    status,
    message,
    ...(data === undefined ? {} : { data }),
    ...(error ? { error } : {}),
    receivedAt: new Date().toISOString()
  };
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const result = await ingestRuntimeExecutionEvent(rawBody, request.headers);

    return Response.json(
      envelope(
        202,
        "Runtime execution fact accepted by Next.js ingress and forwarded to append-only write surface.",
        result
      ),
      { status: 202 }
    );
  } catch (error) {
    const status = error instanceof RuntimeExecutionIngressError ? error.status : 500;
    const code = error instanceof RuntimeExecutionIngressError ? error.code : "RUNTIME_INGRESS_UNEXPECTED_ERROR";
    const message = error instanceof Error ? error.message : String(error);

    return Response.json(envelope(status, message, undefined, code), { status });
  }
}
