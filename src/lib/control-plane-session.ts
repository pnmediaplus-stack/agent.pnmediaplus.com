const CONTROL_PLANE_SESSION_COOKIE = "pn_cp_session";

type ControlPlaneSessionPayload = {
  actorType: "HUMAN";
  actorRef: string;
  issuedAt: string;
};

function getServerSecret() {
  return process.env.CONTROL_PLANE_SECRET?.trim() || "";
}

function toBase64Url(input: string | ArrayBuffer | Uint8Array) {
  const bytes =
    typeof input === "string"
      ? new TextEncoder().encode(input)
      : input instanceof Uint8Array
        ? input
        : new Uint8Array(input);

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "==".slice((value.length + 3) % 4);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function signValue(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(signature);
}

function parseCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return new Map<string, string>();

  return new Map(
    cookieHeader
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index < 0) return [part, ""];
        return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

export async function createControlPlaneSessionCookieValue(
  actorRef = "human:task-inbox-ui"
): Promise<string> {
  const secret = getServerSecret();
  if (!secret) {
    throw new Error("CONTROL_PLANE_SECRET is required to mint a control plane session.");
  }

  const payload: ControlPlaneSessionPayload = {
    actorType: "HUMAN",
    actorRef,
    issuedAt: new Date().toISOString()
  };

  const payloadJson = JSON.stringify(payload);
  const encodedPayload = toBase64Url(payloadJson);
  const signature = await signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyControlPlaneSessionCookieValue(value: string | undefined | null) {
  if (!value) throw new Error("Cookie value is empty.");

  const secret = getServerSecret();
  if (!secret) throw new Error("Server secret is empty.");

  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) throw new Error("Cookie format invalid (missing payload or signature).");

  const expectedSignature = await signValue(encodedPayload, secret);
  if (expectedSignature !== signature) throw new Error(`Signature mismatch. Expected: ${expectedSignature}, Got: ${signature}`);

  try {
    const payloadText = fromBase64Url(encodedPayload);
    const payload = JSON.parse(payloadText) as Partial<ControlPlaneSessionPayload>;
    if (payload.actorType !== "HUMAN") {
      throw new Error(`Invalid actorType: ${payload.actorType}`);
    }
    if (typeof payload.actorRef !== "string" || !payload.actorRef.trim()) {
      throw new Error(`Invalid actorRef: ${payload.actorRef}`);
    }

    return {
      actorType: payload.actorType,
      actorRef: payload.actorRef.trim(),
      issuedAt: typeof payload.issuedAt === "string" ? payload.issuedAt : ""
    } satisfies ControlPlaneSessionPayload;
  } catch (err) {
    throw new Error(`Payload parsing failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function readControlPlaneSessionCookie(headers: Headers | HeadersInit) {
  const normalized = new Headers(headers);
  const cookies = parseCookieHeader(normalized.get("cookie"));
  return cookies.get(CONTROL_PLANE_SESSION_COOKIE) || null;
}

export { CONTROL_PLANE_SESSION_COOKIE };
