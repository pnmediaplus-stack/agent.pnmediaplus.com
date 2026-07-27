import { loadAuditLogs } from "@/lib/phase1-loader";
import { AuditLogsPageClient } from "./AuditLogsPageClient";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const res = await loadAuditLogs();

  return <AuditLogsPageClient logs={res.data} />;
}
