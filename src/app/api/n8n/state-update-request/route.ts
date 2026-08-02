import { postN8nWebhook } from "@/lib/n8n-client";
import {
  authorizeControlPlaneRequest,
  ControlPlaneRequestError,
  guardStateTransitionRequest
} from "@/lib/state-transition-guard";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));

  try {
    await authorizeControlPlaneRequest(request.headers, payload);
  } catch (error) {
    if (error instanceof ControlPlaneRequestError) {
      return Response.json(
        {
          ok: false,
          mocked: false,
          route: "state-update-request",
          status: error.status,
          message: error.message,
          error: error.code,
          receivedAt: new Date().toISOString()
        },
        { status: error.status }
      );
    }

    return Response.json(
      {
        ok: false,
        mocked: false,
        route: "state-update-request",
        status: 500,
        message: "Control plane authentication failed unexpectedly.",
        error: error instanceof Error ? error.message : String(error),
        receivedAt: new Date().toISOString()
      },
      { status: 500 }
    );
  }

  const decision = guardStateTransitionRequest(payload);

  if (!decision.allowed) {
    return Response.json(
      {
        ok: false,
        mocked: false,
        route: "state-update-request",
        status: decision.status,
        message: decision.message,
        guard: decision.guard,
        currentState: decision.currentState,
        requestedTransition: decision.requestedTransition,
        allowedTransitions: decision.allowedTransitions ?? [],
        receivedAt: new Date().toISOString()
      },
      { status: decision.status }
    );
  }

  const forwardedPayload = {
    received: true,
    payload,
    control_plane_guard: decision.controlPlaneDecision,
    normalized_state_update: {
      current_state: decision.currentState,
      requested_transition: decision.requestedTransition,
      allowed_transitions: decision.allowedTransitions
    }
  };

  try {
    const result = await postN8nWebhook("state-update-request", forwardedPayload);
    return Response.json(
      {
        ...result,
        guard: decision.guard,
        currentState: decision.currentState,
        requestedTransition: decision.requestedTransition,
        allowedTransitions: decision.allowedTransitions,
        receivedAt: new Date().toISOString()
      },
      { status: result.status }
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        mocked: false,
        route: "state-update-request",
        status: 502,
        message: "Control plane approved the transition, but n8n forwarding failed.",
        guard: decision.guard,
        currentState: decision.currentState,
        requestedTransition: decision.requestedTransition,
        allowedTransitions: decision.allowedTransitions,
        downstreamError: error instanceof Error ? error.message : String(error),
        receivedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}
