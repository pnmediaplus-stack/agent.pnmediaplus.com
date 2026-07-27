import { loadApprovals } from "@/lib/phase1-loader";
import { ApprovalsPageClient } from "./ApprovalsPageClient";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const res = await loadApprovals();

  return <ApprovalsPageClient approvals={res.data} />;
}
