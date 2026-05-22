import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

const baseUrl = process.env.AUTH_SMOKE_BASE_URL?.trim() || "http://127.0.0.1:3000";
const controlPlaneSecret = process.env.CONTROL_PLANE_SECRET?.trim() || "control_plane_phase1_mock";

function toBase64Url(input: Buffer) {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function mintControlPlaneSessionCookieValue(actorRef: string) {
  const payload = {
    actorType: "HUMAN" as const,
    actorRef,
    issuedAt: new Date().toISOString()
  };

  const payloadText = JSON.stringify(payload);
  const encodedPayload = toBase64Url(Buffer.from(payloadText, "utf8"));
  const signature = toBase64Url(createHmac("sha256", controlPlaneSecret).update(encodedPayload).digest());
  return `pn_cp_session=${encodeURIComponent(`${encodedPayload}.${signature}`)}`;
}

async function postJson(path: string, body: unknown, cookie?: string | null) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify(body)
  });
}

test("state-update-request returns 401 without a session cookie", async () => {
  const response = await postJson("/api/n8n/state-update-request", {
    payload: {
      actor_type: "HUMAN",
      actor_external_ref: "human:smoke",
      current_state: "DRAFT",
      requested_transition: "REVIEW"
    }
  });

  assert.equal(response.status, 401);

  const envelope = (await response.json()) as {
    ok: boolean;
    mocked: boolean;
    route: string;
    status: number;
    message: string;
    error?: string;
    receivedAt: string;
  };

  assert.equal(envelope.ok, false);
  assert.equal(envelope.mocked, false);
  assert.equal(envelope.route, "state-update-request");
  assert.equal(envelope.status, 401);
  assert.match(envelope.message, /session/i);
  assert.equal(envelope.error, "MISSING_CONTROL_PLANE_SESSION");
  assert.match(envelope.receivedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("state-update-request returns 403 for non-human actor even with a valid session", async () => {
  const cookie = mintControlPlaneSessionCookieValue("human:smoke");
  const response = await postJson(
    "/api/n8n/state-update-request",
    {
      payload: {
        actor_type: "BOT",
        actor_external_ref: "bot:smoke",
        current_state: "DRAFT",
        requested_transition: "REVIEW"
      }
    },
    cookie
  );

  assert.equal(response.status, 403);

  const envelope = (await response.json()) as {
    ok: boolean;
    mocked: boolean;
    route: string;
    status: number;
    message: string;
    error?: string;
    receivedAt: string;
  };

  assert.equal(envelope.ok, false);
  assert.equal(envelope.mocked, false);
  assert.equal(envelope.route, "state-update-request");
  assert.equal(envelope.status, 403);
  assert.match(envelope.message, /human authority/i);
  assert.equal(envelope.error, "FORBIDDEN_ACTOR");
  assert.match(envelope.receivedAt, /^\d{4}-\d{2}-\d{2}T/);
});
