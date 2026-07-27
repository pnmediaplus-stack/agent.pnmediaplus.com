import { loadQaReviews } from "@/lib/phase1-loader";
import { QaReviewsPageClient } from "./QaReviewsPageClient";

export const dynamic = "force-dynamic";

export default async function QAReviewsPage() {
  const res = await loadQaReviews();

  return <QaReviewsPageClient reviews={res.data} />;
}
