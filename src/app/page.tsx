import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

export default async function HomePage() {
  const requestHeaders = await headers();
  const accessToken = readPortalAccessToken(requestHeaders);
  const user = await verifySupabaseAccessToken(accessToken);

  if (!accessToken || !user) {
    redirect("/login?next=%2Fdashboard");
  }

  const organizationContext = await loadPortalOrganizationContext(accessToken, user.id);
  if (organizationContext.state !== "ready") {
    redirect("/login?next=%2Fdashboard");
  }

  redirect("/dashboard");
}
