"use client";

import { FormEvent, useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

type SubmitState = "idle" | "loading" | "ready" | "blocked";

type EvidenceResponse = {
  ok?: boolean;
  state?: "ready" | "blocked";
  status?: number;
  message?: string;
  error?: string;
  receivedAt?: string;
};

type FormState = {
  contentItemId: string;
  claimBoundary: string;
  qaBoundary: string;
  taskOwnerRef: string;
};

const initialFormState: FormState = {
  contentItemId: "",
  claimBoundary: "",
  qaBoundary: "",
  taskOwnerRef: ""
};

export function Phase066EvidenceForm() {
  const { t } = useI18n("phase066");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [response, setResponse] = useState<EvidenceResponse | null>(null);

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("loading");
    setResponse(null);

    try {
      const result = await fetch("/api/phase066/evidence", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content_item_id: form.contentItemId,
          claim_boundary: form.claimBoundary,
          qa_boundary: form.qaBoundary,
          task_owner_ref: form.taskOwnerRef
        })
      });
      const payload = (await result.json().catch(() => ({}))) as EvidenceResponse;
      setResponse(payload);
      setSubmitState(result.ok && payload.state === "ready" ? "ready" : "blocked");
    } catch (error) {
      setResponse({
        ok: false,
        state: "blocked",
        message: t("evidence.feedback.networkError") ?? "Evidence submit failed before reaching the control plane.",
        error: error instanceof Error ? error.message : String(error)
      });
      setSubmitState("blocked");
    }
  }

  const statusLabel =
    submitState === "ready"
      ? t("evidence.status.ready") ?? "ready"
      : submitState === "blocked"
        ? t("evidence.status.blocked") ?? "blocked"
        : submitState === "loading"
          ? t("evidence.status.loading") ?? "submitting"
          : t("evidence.status.idle") ?? "idle";

  return (
    <div className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-950/75 p-5 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200">
            {t("evidence.form.kicker") ?? "Phase 066 evidence intake"}
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">{t("evidence.form.title") ?? "Controlled evidence packet"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {t("evidence.form.description") ?? "Submit governed evidence into the control plane. The UI never approves, publishes, or touches n8n runtime."}
          </p>
        </div>
        <div
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            submitState === "ready"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
              : submitState === "blocked"
                ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
                : "border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          {statusLabel}
        </div>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <EvidenceField
            id="phase066-content-item-id"
            label={t("evidence.field.contentItemId") ?? "content_item_id"}
            value={form.contentItemId}
            placeholder={t("evidence.placeholder.contentItemId") ?? "content item UUID or ref"}
            onChange={(value) => updateField("contentItemId", value)}
          />
          <EvidenceField
            id="phase066-task-owner-ref"
            label={t("evidence.field.taskOwnerRef") ?? "task_owner_ref"}
            value={form.taskOwnerRef}
            placeholder={t("evidence.placeholder.taskOwnerRef") ?? "operations:owner-ref"}
            onChange={(value) => updateField("taskOwnerRef", value)}
          />
        </div>

        <EvidenceTextArea
          id="phase066-claim-boundary"
          label={t("evidence.field.claimBoundary") ?? "claim_boundary"}
          value={form.claimBoundary}
          placeholder={t("evidence.placeholder.claimBoundary") ?? "Bounded marketing claim and proof scope"}
          onChange={(value) => updateField("claimBoundary", value)}
        />

        <EvidenceTextArea
          id="phase066-qa-boundary"
          label={t("evidence.field.qaBoundary") ?? "qa_boundary"}
          value={form.qaBoundary}
          placeholder={t("evidence.placeholder.qaBoundary") ?? "QA evidence, review ref, or safe boundary"}
          onChange={(value) => updateField("qaBoundary", value)}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/55 p-4">
          <div className="text-sm text-slate-300">
            {t("evidence.form.failClosed") ?? "Fail-closed: missing RPC/write contract returns blocked, not a hidden write."}
          </div>
          <button
            type="submit"
            disabled={submitState === "loading"}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitState === "loading"
              ? t("evidence.action.submitting") ?? "Submitting"
              : t("evidence.action.submit") ?? "Submit evidence packet"}
          </button>
        </div>
      </form>

      {response ? (
        <div
          className={`rounded-2xl border p-4 ${
            response.state === "ready"
              ? "border-emerald-400/30 bg-emerald-400/10"
              : "border-rose-400/30 bg-rose-400/10"
          }`}
        >
          <div className="text-sm font-semibold text-white">{response.message ?? (t("evidence.feedback.noMessage") ?? "No response message")}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-300 md:grid-cols-3">
            <ResponsePill label={t("evidence.response.state") ?? "State"} value={response.state ?? (t("evidence.status.blocked") ?? "blocked")} />
            <ResponsePill label={t("evidence.response.status") ?? "HTTP status"} value={String(response.status ?? "")} />
            <ResponsePill label={t("evidence.response.receivedAt") ?? "Received at"} value={response.receivedAt ?? (t("evidence.value.pending") ?? "Pending / N/A")} />
          </div>
          {response.error ? (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
              {response.error}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EvidenceField({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-200">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-400/30 transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2"
      />
    </label>
  );
}

function EvidenceTextArea({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-200">{label}</span>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-y rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-cyan-400/30 transition placeholder:text-slate-600 focus:border-cyan-400/50 focus:ring-2"
      />
    </label>
  );
}

function ResponsePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <div className="font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-1 break-words text-slate-200">{value}</div>
    </div>
  );
}
