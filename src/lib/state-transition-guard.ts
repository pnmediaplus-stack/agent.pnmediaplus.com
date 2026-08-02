import { allowedTransitions } from "@/lib/state-machine";
import {
  readControlPlaneSessionCookie,
  verifyControlPlaneSessionCookieValue
} from "@/lib/control-plane-session";
import type { LifecycleState } from "@/types/state";

type StateUpdateRequestLike = {
  current_state?: string;
  requested_transition?: string;
  actor_type?: string;
  entity_type?: string;
  entity_id?: string;
  task_id?: string;
  reason?: string;
  payload?: unknown;
};

type HeadersLike = Headers | HeadersInit;

function normalizeState(value: unknown): LifecycleState | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  const states = Object.keys(allowedTransitions) as LifecycleState[];
  return states.includes(normalized as LifecycleState) ? (normalized as LifecycleState) : null;
}

function extractRequest(payload: unknown): StateUpdateRequestLike {
  if (!payload || typeof payload !== "object") return {};

  const body = payload as Record<string, unknown>;
  const nestedPayload = body.payload && typeof body.payload === "object" ? (body.payload as Record<string, unknown>) : null;
  const source = nestedPayload ?? body;

  return {
    current_state: typeof source.current_state === "string" ? source.current_state : undefined,
    requested_transition: typeof source.requested_transition === "string" ? source.requested_transition : undefined,
    actor_type: typeof source.actor_type === "string" ? source.actor_type : undefined,
    entity_type: typeof source.entity_type === "string" ? source.entity_type : undefined,
    entity_id: typeof source.entity_id === "string" ? source.entity_id : undefined,
    task_id: typeof source.task_id === "string" ? source.task_id : undefined,
    reason: typeof source.reason === "string" ? source.reason : undefined,
    payload: nestedPayload ?? source
  };
}

export class ControlPlaneRequestError extends Error {
  status: 401 | 403;
  code: string;

  constructor(status: 401 | 403, code: string, message: string) {
    super(message);
    this.name = "ControlPlaneRequestError";
    this.status = status;
    this.code = code;
  }
}

export type StateTransitionGuardDecision =
  | {
      allowed: false;
      status: number;
      guard: "INVALID_STATE_UPDATE_REQUEST" | "FORBIDDEN_TRANSITION";
      message: string;
      currentState?: string;
      requestedTransition?: string;
      allowedTransitions?: LifecycleState[];
      reason?: string;
    }
  | {
      allowed: true;
      status: number;
      guard: "STATE_TRANSITION_ALLOWED";
      message: string;
      currentState: LifecycleState;
      requestedTransition: LifecycleState;
      allowedTransitions: LifecycleState[];
      controlPlaneDecision: {
        owner: "NEXTJS_CONTROL_PLANE";
        authority: "STATE_TRANSITION_GUARD";
        decision: "ALLOW";
      };
      normalizedPayload: StateUpdateRequestLike & {
        current_state: LifecycleState;
        requested_transition: LifecycleState;
      };
    };

export type ControlPlaneAuthorityDecision =
  | {
      allowed: true;
      actorType: "HUMAN";
      actorRef: string;
      guard: "CONTROL_PLANE_AUTHORIZED";
    }
  | {
      allowed: false;
      status: 401 | 403;
      guard: "MISSING_CONTROL_PLANE_SESSION" | "INVALID_CONTROL_PLANE_SESSION" | "FORBIDDEN_ACTOR";
      message: string;
    };

export async function authorizeControlPlaneRequest(
  headers: HeadersLike,
  payload: unknown
): Promise<ControlPlaneAuthorityDecision> {
  const sessionValue = readControlPlaneSessionCookie(headers);

  if (!sessionValue) {
    throw new ControlPlaneRequestError(
      401,
      "MISSING_CONTROL_PLANE_SESSION",
      "Control plane session cookie is required."
    );
  }

  let session;
  try {
    session = await verifyControlPlaneSessionCookieValue(sessionValue);
  } catch (err) {
    throw new ControlPlaneRequestError(
      401,
      "INVALID_CONTROL_PLANE_SESSION",
      `Control plane session cookie is invalid: ${err instanceof Error ? err.message : String(err)}. Please restart your Next.js dev server.`
    );
  }

  if (!session) {
    throw new ControlPlaneRequestError(
      401,
      "INVALID_CONTROL_PLANE_SESSION",
      "Control plane session cookie is invalid."
    );
  }

  const request = extractRequest(payload);
  const actorType = String(request.actor_type ?? "").trim().toUpperCase();
  const actorRef =
    (typeof request.payload === "object" && request.payload && "actor_external_ref" in request.payload
      ? String((request.payload as Record<string, unknown>).actor_external_ref ?? "").trim()
      : "") || session.actorRef;

  if (actorType !== "HUMAN") {
    throw new ControlPlaneRequestError(
      403,
      "FORBIDDEN_ACTOR",
      "Human authority is required at the control plane boundary."
    );
  }

  if (!actorRef) {
    throw new ControlPlaneRequestError(
      403,
      "FORBIDDEN_ACTOR",
      "Human identity is required at the control plane boundary."
    );
  }

  return {
    allowed: true,
    actorType: "HUMAN",
    actorRef,
    guard: "CONTROL_PLANE_AUTHORIZED"
  };
}

export function guardStateTransitionRequest(payload: unknown): StateTransitionGuardDecision {
  const request = extractRequest(payload);
  const currentState = normalizeState(request.current_state);
  const requestedTransition = normalizeState(request.requested_transition);

  if (!currentState || !requestedTransition) {
    return {
      allowed: false,
      status: 400,
      guard: "INVALID_STATE_UPDATE_REQUEST",
      message: "current_state and requested_transition are required valid lifecycle states.",
      currentState: request.current_state,
      requestedTransition: request.requested_transition
    };
  }

  if (currentState === requestedTransition) {
    return {
      allowed: false,
      status: 409,
      guard: "FORBIDDEN_TRANSITION",
      message: `No-op transition is not allowed: ${currentState} -> ${requestedTransition}.`,
      currentState,
      requestedTransition,
      allowedTransitions: allowedTransitions[currentState]
    };
  }

  const allowed = allowedTransitions[currentState] ?? [];
  if (!allowed.includes(requestedTransition)) {
    return {
      allowed: false,
      status: 409,
      guard: "FORBIDDEN_TRANSITION",
      message: `Forbidden transition: ${currentState} -> ${requestedTransition}.`,
      currentState,
      requestedTransition,
      allowedTransitions: allowed
    };
  }

  return {
    allowed: true,
    status: 200,
    guard: "STATE_TRANSITION_ALLOWED",
    message: "State transition approved by Next.js control plane.",
    currentState,
    requestedTransition,
    allowedTransitions: allowed,
    controlPlaneDecision: {
      owner: "NEXTJS_CONTROL_PLANE",
      authority: "STATE_TRANSITION_GUARD",
      decision: "ALLOW"
    },
    normalizedPayload: {
      ...request,
      current_state: currentState,
      requested_transition: requestedTransition
    }
  };
}
