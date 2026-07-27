import { loadDepartments } from "@/lib/phase1-loader";
import { DepartmentsPageClient } from "./DepartmentsPageClient";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage() {
  const res = await loadDepartments();

  return <DepartmentsPageClient departments={res.data} />;
}
