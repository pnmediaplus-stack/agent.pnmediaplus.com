import { loadTasks, loadDepartments } from "@/lib/phase1-loader";
import { TasksPageClient } from "./TasksPageClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasksRes, departmentsRes] = await Promise.all([
    loadTasks(),
    loadDepartments()
  ]);

  return <TasksPageClient tasks={tasksRes.data} departments={departmentsRes.data} />;
}
