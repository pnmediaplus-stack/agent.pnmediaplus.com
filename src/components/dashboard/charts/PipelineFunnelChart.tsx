"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Cell } from "recharts";
import { useI18n } from "@/lib/i18n/useI18n";

interface PipelineFunnelChartProps {
  data: { name: string; value: number }[];
}

// Colors from slate-300 to cyan-400 to emerald-400 to rose-400
const COLORS = [
  "#94a3b8", // idea
  "#cbd5e1", // visual_ready
  "#06b6d4", // caption_ready
  "#0891b2", // QA_ready
  "#10b981", // QA_passed
  "#34d399", // scheduled
  "#fb7185", // published
];

export default function PipelineFunnelChart({ data }: PipelineFunnelChartProps) {
  const { t } = useI18n("dashboard");
  
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <p className="text-sm text-slate-500">{t("dashboard.charts.noData") ?? "No pipeline data available"}</p>
      </div>
    );
  }

  // Translate labels
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      displayName: t(`dashboard.state.${item.name}`) ?? item.name
    }));
  }, [data, t]);

  return (
    <div className="h-[300px] w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4 pt-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
          <XAxis 
            type="number"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            allowDecimals={false}
          />
          <YAxis 
            type="category"
            dataKey="displayName"
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#cbd5e1' }} 
            width={120}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15, 23, 42, 0.5)' }}
            contentStyle={{ 
              backgroundColor: 'rgba(15, 23, 42, 0.9)', 
              borderColor: 'rgba(51, 65, 85, 0.5)',
              borderRadius: '0.75rem',
              backdropFilter: 'blur(8px)',
              fontSize: '0.75rem',
              color: '#f8fafc'
            }}
            itemStyle={{ fontSize: '0.75rem' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
