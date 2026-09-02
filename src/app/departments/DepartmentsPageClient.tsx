"use client";

import { useState, useEffect } from "react";
import { PageFrame } from "@/components/shared/PageFrame";
import { DepartmentCard } from "@/components/departments/DepartmentCard";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Department } from "@/types/department";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function DepartmentsPageClient() {
  const { t } = useI18n("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agentsCountMap, setAgentsCountMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [deptRes, agentRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/agents")
      ]);
      if (!deptRes.ok) throw new Error("Tải phòng ban thất bại");
      
      const deptData = await deptRes.json();
      if (deptData.departments) {
        setDepartments(deptData.departments);
      }

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.agents) {
          const counts: Record<string, number> = {};
          agentData.agents.forEach((a: any) => {
            counts[a.department_id] = (counts[a.department_id] || 0) + 1;
          });
          setAgentsCountMap(counts);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Không thể tải phòng ban");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department_key: key,
          canonical_name: name,
          description: desc
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Tạo phòng ban thất bại");
      }

      toast.success("Tạo phòng ban thành công!");
      setShowForm(false);
      setKey("");
      setName("");
      setDesc("");
      fetchData(); // Refresh list
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const chartData = departments.map(d => ({
    name: d.canonical_name,
    agents: agentsCountMap[d.id] || 0
  })).sort((a, b) => b.agents - a.agents);

  const COLORS = ['#06b6d4', '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];

  return (
    <PageFrame
      title={t("departments.page.title") ?? "Phòng ban"}
      purpose={t("departments.page.purpose") ?? "Danh bạ phòng ban nội bộ với quyền sở hữu, mục đích và số tác vụ đang mở."}
      statusLabel={t("departments.page.statusLabel") ?? "Danh bạ phòng ban"}
      statusValue="PASS"
      statusDisplayValue={t("departments.state.ready") ?? "Sẵn sàng"}
      allowedActions={[
        t("departments.page.allowed.inspectOwnership") ?? "Xem quyền sở hữu phòng ban",
        t("departments.page.allowed.viewOpenTasks") ?? "Xem tác vụ đang mở",
        t("departments.page.allowed.routeIncomingWork") ?? "Định tuyến công việc đầu vào"
      ]}
      forbiddenActions={[
        t("departments.page.forbidden.createTenant") ?? "Tạo khách hàng",
        t("departments.page.forbidden.exposePublicAccount") ?? "Công khai tài khoản",
        t("departments.page.forbidden.changeAuthority") ?? "Đổi quyền hạn"
      ]}
    >
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("departments.title") ?? "Cấu trúc tổ chức"}</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <Plus className="h-4 w-4" />
          {showForm ? (t("departments.form.cancel") ?? "Hủy bỏ") : (t("departments.form.add") ?? "Thêm phòng ban")}
        </button>
      </div>

      {!isLoading && chartData.length > 0 && chartData.some(d => d.agents > 0) && (
        <div className="mb-8 h-[200px] rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/30 p-6 backdrop-blur-xl shadow-lg">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("departments.chart.title") ?? "Phân bổ đặc vụ"}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip 
                cursor={{ fill: '#334155', opacity: 0.2 }}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#38bdf8', fontWeight: 600 }}
              />
              <Bar dataKey="agents" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-slate-800/30 p-6 backdrop-blur-xl shadow-lg">
          <h3 className="mb-6 text-lg font-bold text-slate-700 dark:text-slate-200">{t("departments.form.title") ?? "Tạo phòng ban mới"}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">{t("departments.form.keyLabel") ?? "Mã phòng ban (ID duy nhất)"}</label>
              <input
                type="text"
                required
                pattern="[a-z0-9_]+"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t("departments.form.keyPlaceholder") ?? "vd: sales_team"}
                className="w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <p className="mt-1 text-xs text-slate-500">{t("departments.form.keyHint") ?? "Chỉ sử dụng chữ cái viết thường, số, và dấu gạch dưới."}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">{t("departments.form.nameLabel") ?? "Tên hiển thị"}</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("departments.form.namePlaceholder") ?? "vd: Khối Kinh doanh"}
                className="w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-500 dark:text-slate-400">{t("departments.form.descLabel") ?? "Mục đích / Mô tả"}</label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={t("departments.form.descPlaceholder") ?? "Phòng ban này đảm nhận chức năng gì?"}
                rows={2}
                className="w-full rounded-lg border border-slate-600 bg-white dark:bg-slate-900 p-2.5 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-slate-900 dark:text-white transition-all hover:bg-cyan-500 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t("departments.form.submit") ?? "Tạo phòng ban"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      ) : departments.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
          <p>{t("departments.empty.title") ?? "Không tìm thấy phòng ban nào."}</p>
          <p className="text-sm">{t("departments.empty.hint") ?? "Nhấn \"Thêm phòng ban\" để tạo mới."}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {departments.map((department) => (
            <DepartmentCard key={department.id} department={department} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
