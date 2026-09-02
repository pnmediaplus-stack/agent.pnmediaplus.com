type MetricCardProps = {
  label: string;
  value: string | number;
  note: string;
};

export function MetricCard({ label, value, note }: MetricCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 shadow-glow">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-5 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-100">{label}</div>
      </div>
      <div className="p-5">
        <div className="text-3xl font-semibold text-slate-900 dark:text-white">{value}</div>
        <div className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{note}</div>
      </div>
    </div>
  );
}
