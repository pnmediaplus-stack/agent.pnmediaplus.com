"use client";

import { useState, useEffect } from "react";
import { PageFrame } from "@/components/shared/PageFrame";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Task } from "@/types/task";
import type { Department } from "@/types/department";
import type { Agent } from "@/types/agent";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function TasksPageClient() {
  const { t } = useI18n("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskKey, setTaskKey] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [priority, setPriority] = useState(50);
  const [deptId, setDeptId] = useState("");
  const [agentId, setAgentId] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tRes, dRes, aRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/departments"),
        fetch("/api/agents")
      ]);

      if (tRes.ok) {
        const tData = await tRes.json();
        setTasks(tData.tasks || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDepartments(dData.departments || []);
        if (dData.departments && dData.departments.length > 0) {
          setDeptId(dData.departments[0].id);
        }
      }
      if (aRes.ok) {
        const aData = await aRes.json();
        setAgents(aData.agents || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load task board data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptId) {
      toast.error("Please select a department.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_key: taskKey,
          title,
          summary,
          priority: Number(priority),
          department_id: deptId,
          owner_agent_id: agentId || null
        })
      });

      const data = await res.json();

      if (!res.ok) {
        // Red toast for 403 or other errors
        if (res.status === 403) {
           toast.error(data.message || "FORBIDDEN: You do not have permission to assign tasks.", {
             style: { background: '#ef4444', color: '#fff', border: 'none' }
           });
        } else {
           toast.error(data.error || "Failed to create task");
        }
        setIsSubmitting(false);
        return;
      }

      toast.success("Task assigned successfully!");
      setShowForm(false);
      setTaskKey("");
      setTitle("");
      setSummary("");
      setPriority(50);
      setAgentId("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableAgents = agents.filter(a => a.department_id === deptId);

  return (
    <PageFrame
      title={t("tasks.page.title") ?? "Tasks"}
      purpose={t("tasks.page.purpose") ?? "Central queue for all active and pending reasoning tasks."}
      statusLabel={t("tasks.page.statusLabel") ?? "Task queue"}
      statusValue="PASS"
      statusDisplayValue={t("tasks.state.ready") ?? "Sẵn sàng"}
      allowedActions={[
        t("tasks.page.allowed.viewTasks") ?? "View task queue",
        t("tasks.page.allowed.submitReview") ?? "Submit tasks for review",
        t("tasks.page.allowed.checkStatus") ?? "Check status"
      ]}
      forbiddenActions={[
        t("tasks.page.forbidden.approveBypass") ?? "Approve without review",
        t("tasks.page.forbidden.changePriority") ?? "Change priority of critical tasks",
        t("tasks.page.forbidden.deleteTasks") ?? "Delete active tasks"
      ]}
    >
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{t("tasks.board.title") ?? "Task Board"}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-400 border border-indigo-500/30 transition-all hover:bg-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? (t("tasks.form.cancel") ?? "Cancel") : (t("tasks.form.assign") ?? "Assign Task")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-xl shadow-lg">
          <h3 className="mb-6 text-lg font-bold text-slate-200">{t("tasks.form.title") ?? "Assign New Task"}</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.keyLabel") ?? "Task Key (Unique identifier)"}</label>
              <input
                type="text"
                required
                pattern="[a-z0-9_]+"
                value={taskKey}
                onChange={(e) => setTaskKey(e.target.value)}
                placeholder={t("tasks.form.keyPlaceholder") ?? "e.g. generate_report_1"}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.titleLabel") ?? "Title"}</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("tasks.form.titlePlaceholder") ?? "e.g. Generate Q3 Financial Report"}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="lg:col-span-3">
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.summaryLabel") ?? "Summary (Optional)"}</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("tasks.form.summaryPlaceholder") ?? "Details about what needs to be done..."}
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.priorityLabel") ?? "Priority (1-100)"}</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.departmentLabel") ?? "Department"}</label>
              <select
                required
                value={deptId}
                onChange={(e) => {
                  setDeptId(e.target.value);
                  setAgentId(""); // reset agent when dept changes
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{d.canonical_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">{t("tasks.form.agentLabel") ?? "Assign to Agent (Optional)"}</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="" className="bg-slate-900">{t("tasks.form.agentUnassigned") ?? "-- Unassigned --"}</option>
                {availableAgents.map(a => (
                  <option key={a.id} value={a.id} className="bg-slate-900">{a.canonical_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("tasks.form.submit") ?? "Dispatch Task"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : (
        <TaskTable tasks={tasks} />
      )}
    </PageFrame>
  );
}
