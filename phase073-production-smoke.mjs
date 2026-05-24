import dns from "node:dns/promises";
import https from "node:https";
import tls from "node:tls";

const HOSTS = ["agent.pnmediaplus.com", "n8n.pnmediaplus.com"];
const ORIGIN = "https://agent.pnmediaplus.com";

function request(url, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: {
          "Cache-Control": "no-store",
          ...(body ? { "Content-Type": "application/json" } : {})
        }
      },
      (res) => {
        let text = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          text += chunk;
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            headers: res.headers,
            body: text
          });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

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

async function safeJson(body) {
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

const evidence = {
  evidence_at: new Date().toISOString(),
  origin: ORIGIN,
  hosts: {},
  routes: {}
};

for (const host of HOSTS) {
  try {
    const addresses = await dns.resolve4(host);
    evidence.hosts[host] = { dns: { ok: true, addresses } };
  } catch (error) {
    evidence.hosts[host] = {
      dns: {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  }

  try {
    const cert = await getTlsCert(host);
    evidence.hosts[host].tls = {
      ok: true,
      subject: cert.subject,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      fingerprint256: cert.fingerprint256
    };
  } catch (error) {
    evidence.hosts[host].tls = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

const endpoints = [
  ["department_governance", `${ORIGIN}/api/department-governance`, "GET"],
  ["auth_session", `${ORIGIN}/api/auth/session`, "GET"],
  ["tenant_integrations_get", `${ORIGIN}/api/tenant-integrations`, "GET"],
  ["tenant_integrations_create", `${ORIGIN}/api/tenant-integrations`, "POST"],
  ["tenant_integrations_rotate", `${ORIGIN}/api/tenant-integrations/phase073-smoke/rotate`, "POST"],
  ["tenant_integrations_revoke", `${ORIGIN}/api/tenant-integrations/phase073-smoke/revoke`, "POST"],
  ["tenant_integrations_broker_call", `${ORIGIN}/api/tenant-integrations/phase073-smoke/broker-call`, "POST"]
];

for (const [name, url, method] of endpoints) {
  try {
    const response = await request(url, method, method === "POST" ? {} : null);
    evidence.routes[name] = {
      ok: response.statusCode >= 200 && response.statusCode < 500,
      status_code: response.statusCode,
      content_type: response.headers["content-type"] ?? null,
      payload: await safeJson(response.body)
    };
  } catch (error) {
    evidence.routes[name] = {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

console.log(JSON.stringify(evidence, null, 2));
