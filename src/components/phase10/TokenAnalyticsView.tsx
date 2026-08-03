"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Loader2, AlertCircle } from "lucide-react";

type AnalyticsData = {
  tenant_id: string;
  billing: {
    monthly_quota_usd: number;
    current_spend_usd: number;
    status: string;
  };
  chartData: Array<{ date: string; openai: number; fal_ai: number }>;
  distribution: Array<{ name: string; value: number; fill: string }>;
};

export function TokenAnalyticsView() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/phase10/analytics", { cache: "no-store", credentials: "include" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load analytics");
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-rose-900/50 bg-rose-950/30 p-6 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-rose-400 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-rose-400">Error loading analytics</h3>
          <p className="mt-1 text-sm text-rose-400/80">{error}</p>
        </div>
      </div>
    );
  }

  const { billing, chartData, distribution } = data;
  const spendPercent = Math.min((billing.current_spend_usd / billing.monthly_quota_usd) * 100, 100);
  const isExceeded = billing.status === "EXCEEDED";

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-md">
          <div className="text-sm font-medium text-slate-400">Current Spend</div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-4xl font-bold ${isExceeded ? "text-rose-400" : "text-emerald-400"}`}>
              ${billing.current_spend_usd.toFixed(2)}
            </span>
            <span className="text-sm text-slate-500">/ ${billing.monthly_quota_usd.toFixed(2)}</span>
          </div>
          
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isExceeded ? "bg-rose-500" : "bg-emerald-500"}`}
              style={{ width: `${spendPercent}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>0%</span>
            <span>{spendPercent.toFixed(1)}% Used</span>
            <span>100%</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-md">
           <div className="text-sm font-medium text-slate-400 mb-4">Cost Distribution (By Model)</div>
           <div className="h-24">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={45} stroke="none">
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }} 
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur-md">
        <div className="text-sm font-medium text-slate-400 mb-6">Daily Spend (Last 5 Days)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.5 }} 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="openai" name="OpenAI" stackId="a" fill="#06b6d4" radius={[0, 0, 4, 4]} />
              <Bar dataKey="fal_ai" name="Fal AI" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
