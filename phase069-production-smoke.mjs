// save as phase069-production-smoke.mjs
import dns from "node:dns/promises";
import tls from "node:tls";
import https from "node:https";

const PRODUCTION_HOST = "agent.pnmediaplus.com";
const PRODUCTION_ORIGIN = `https://${PRODUCTION_HOST}`;
const READ_SURFACE_PATH = "/api/department-governance";

const deploymentId = "dba5115_VPS_DOCKER_ENV";

function request(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers: { "Cache-Control": "no-store" } }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

function getTlsCert(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        servername: hostname,
        port: 443,
        rejectUnauthorized: true
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        socket.end();
        resolve(cert);
      }
    );
    socket.on("error", reject);
  });
}

const result = {
  deployment_id: deploymentId,
  host: PRODUCTION_HOST,
  origin: PRODUCTION_ORIGIN,
  evidence_at: new Date().toISOString()
};

try {
  result.dns = {
    ok: true,
    addresses: await dns.resolve4(PRODUCTION_HOST)
  };
} catch (error) {
  result.dns = { ok: false, error: error instanceof Error ? error.message : String(error) };
}

try {
  const cert = await getTlsCert(PRODUCTION_HOST);
  result.ssl = {
    ok: true,
    subject: cert.subject,
    issuer: cert.issuer,
    valid_from: cert.valid_from,
    valid_to: cert.valid_to,
    fingerprint256: cert.fingerprint256
  };
} catch (error) {
  result.ssl = { ok: false, error: error instanceof Error ? error.message : String(error) };
}

try {
  const response = await request(`${PRODUCTION_ORIGIN}${READ_SURFACE_PATH}`);
  let parsed = null;
  try {
    parsed = JSON.parse(response.body);
  } catch {
    parsed = response.body;
  }

  result.read_surface = {
    ok: response.statusCode >= 200 && response.statusCode < 500,
    status_code: response.statusCode,
    content_type: response.headers["content-type"] ?? null,
    payload: parsed
  };
} catch (error) {
  result.read_surface = { ok: false, error: error instanceof Error ? error.message : String(error) };
}

console.log(JSON.stringify(result, null, 2));