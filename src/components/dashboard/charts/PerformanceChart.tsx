"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useI18n } from "@/lib/i18n/useI18n";

interface PerformanceChartProps {
  data: any[];
}

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const { t } = useI18n("dashboard");
  
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/50">
        <p className="text-sm text-slate-500">{t("dashboard.charts.noData") ?? "No performance data available"}</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-4 pt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: '#64748b' }} 
            tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value)}
          />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <Tooltip
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
          <Area 
            type="monotone" 
            dataKey="impressions" 
            name={t("dashboard.charts.impressions") ?? "Impressions"} 
            stroke="#06b6d4" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorImpressions)" 
          />
          <Area 
            type="monotone" 
            dataKey="views" 
            name={t("dashboard.charts.views") ?? "Views"} 
            stroke="#10b981" 
            strokeWidth={2} 
            fillOpacity={1} 
            fill="url(#colorViews)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
