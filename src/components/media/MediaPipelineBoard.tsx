"use client";

type MediaStage = {
  id: string;
  stage: string;
  status: string;
  owner: string;
  note: string;
};

export function MediaPipelineBoard({ stages }: { stages: MediaStage[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stages.map((stage) => (
        <div key={stage.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-white">{stage.stage}</div>
              <div className="mt-1 text-sm text-slate-400">{stage.owner}</div>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
              {stage.status}
            </span>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            {stage.note}
          </div>
        </div>
      ))}
    </div>
  );
}
