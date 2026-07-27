import { loadGates } from "@/lib/phase1-loader";
import { GatesPageClient } from "./GatesPageClient";

export const dynamic = "force-dynamic";

export default async function GatesPage() {
  const res = await loadGates();

  return <GatesPageClient gates={res.data} />;
}
