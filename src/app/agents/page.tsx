import { loadAgents } from "@/lib/phase1-loader";
import { AgentsPageClient } from "./AgentsPageClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const res = await loadAgents();

  return <AgentsPageClient agents={res.data} />;
}
