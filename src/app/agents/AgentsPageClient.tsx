"use client";

import { useState, useEffect } from "react";
import { PageFrame } from "@/components/shared/PageFrame";
import { AgentCard } from "@/components/agents/AgentCard";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Agent } from "@/types/agent";
import type { Department } from "@/types/department";
import { Plus, Loader2, Filter } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "content_writer", label: "Content Writer" },
  { value: "seo_specialist", label: "SEO Specialist" },
  { value: "media_buyer", label: "Media Buyer" },
  { value: "data_analyst", label: "Data Analyst" },
  { value: "gatekeeper_sentinel", label: "Gatekeeper Sentinel" },
  { value: "system_orchestrator", label: "System Orchestrator" }
];

const AUTHORITY_SCOPES = [
  "READ_ONLY",
  "REVIEW_ONLY",
  "TASK_OWNER",
  "DEPARTMENT_OWNER",
  "SERVICE"
];

export function AgentsPageClient() {
  const { t } = useI18n("agents");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterDept, setFilterDept] = useState("ALL");

  // Form states
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [scope, setScope] = useState(AUTHORITY_SCOPES[0]);
  const [deptId, setDeptId] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [agRes, dpRes] = await Promise.all([
        fetch("/api/agents"),
        fetch("/api/departments")
      ]);
      
      if (!agRes.ok || !dpRes.ok) throw new Error("Failed to load data");
      
      const agData = await agRes.json();
      const dpData = await dpRes.json();
      
      if (agData.agents) setAgents(agData.agents);
      if (dpData.departments) {
        setDepartments(dpData.departments);
        if (dpData.departments.length > 0) {
          setDeptId(dpData.departments[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not load agents data");
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
      toast.error("Please create a department first!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_key: key,
          canonical_name: name,
          department_id: deptId,
          role_code: role,
          authority_scope: scope
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create agent");
      }

      toast.success("Agent assigned successfully!");
      setShowForm(false);
      setKey("");
      setName("");
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAgents = filterDept === "ALL" 
    ? agents 
    : agents.filter(a => a.department_id === filterDept);

  return (
    <PageFrame
      title={t("agents.page.title") ?? "Agents"}
      purpose={t("agents.page.purpose") ?? "Directory of reasoning and artifact workers, grouped by department and current focus."}
      statusLabel={t("agents.page.statusLabel") ?? "Agent directory"}
      statusValue="PASS"
      statusDisplayValue="Fully Operational"
      allowedActions={[
        t("agents.page.allowed.inspectFocus") ?? "Inspect agent focus",
        t("agents.page.allowed.checkStatus") ?? "Check status",
        t("agents.page.allowed.reviewDepartmentMapping") ?? "Review department mapping"
      ]}
      forbiddenActions={[
        t("agents.page.forbidden.assignDestructiveWork") ?? "Assign destructive work",
        t("agents.page.forbidden.overrideAuthority") ?? "Override authority",
        t("agents.page.forbidden.publishArtifacts") ?? "Publish artifacts"
      ]}
    >
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
          <Filter className="ml-2 h-4 w-4 text-slate-400" />
          <select 
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-transparent p-1.5 text-sm text-slate-200 outline-none"
          >
            <option value="ALL" className="bg-slate-900">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id} className="bg-slate-900">{d.canonical_name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-indigo-500/20 px-4 py-2 text-sm font-semibold text-indigo-400 border border-indigo-500/30 transition-all hover:bg-indigo-500/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "Assign Agent"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-2xl border border-slate-700/50 bg-slate-800/30 p-6 backdrop-blur-xl shadow-lg">
          <h3 className="mb-6 text-lg font-bold text-slate-200">Assign New Agent</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-400">Agent Key</label>
              <input
                type="text"
                required
                pattern="[a-z0-9_]+"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="e.g. content_bot_1"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-400">Display Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alpha Content Writer"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Department</label>
              <select
                required
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-900">{d.canonical_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Role</label>
              <select
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {ROLE_OPTIONS.map(r => (
                  <option key={r.value} value={r.value} className="bg-slate-900">{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-400">Authority Scope</label>
              <select
                required
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 p-2.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {AUTHORITY_SCOPES.map(s => (
                  <option key={s} value={s} className="bg-slate-900">{s}</option>
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
              Assign Agent
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-slate-400">
          <p>No agents found.</p>
          <p className="text-sm">Click "Assign Agent" to onboard one.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
