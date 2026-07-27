import { loadArtifacts } from "@/lib/phase1-loader";
import { ArtifactsPageClient } from "./ArtifactsPageClient";

export const dynamic = "force-dynamic";

export default async function ArtifactsPage() {
  const res = await loadArtifacts();

  return <ArtifactsPageClient artifacts={res.data} />;
}
