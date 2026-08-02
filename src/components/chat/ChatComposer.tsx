"use client";

import { useI18n } from "@/lib/i18n/useI18n";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({ value, onChange, onSubmit }: ChatComposerProps) {
  const { t } = useI18n("chat");
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={t("chat.composer.placeholder") ?? "Type a command, ask for status, or request a task."}
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
      />
      <div className="mt-3 flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.24em] text-slate-400">{t("chat.composer.label") ?? "Human command"}</label>
        <button
          type="button"
          onClick={onSubmit}
          className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/20"
        >
          {t("chat.composer.send") ?? "Send command"}
        </button>
      </div>
    </div>
  );
}
