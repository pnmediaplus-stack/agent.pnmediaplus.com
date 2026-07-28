"use client";

import { useState } from "react";
import { createPhase2Idea } from "@/app/actions/phase2-actions";

export function CreateIdeaModal({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [ownerRef, setOwnerRef] = useState("human_founder");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await createPhase2Idea({
        title,
        brief,
        owner_ref: ownerRef
      });

      onSuccess();
      onClose();
      // Clear form
      setTitle("");
      setBrief("");
    } catch (err: any) {
      setError(err.message || "Failed to trigger pipeline");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white">Create Content Idea</h3>
        <p className="mt-1 text-sm text-slate-400">
          This will trigger the N8N Phase 2 Pipeline directly.
        </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <strong>BLOCKED:</strong> {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              placeholder="e.g. Q4 Marketing Push"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Brief</label>
            <textarea
              required
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
              placeholder="Detailed instructions for the AI agents..."
              rows={3}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Owner Ref</label>
            <input
              required
              value={ownerRef}
              onChange={(e) => setOwnerRef(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {isLoading ? "Triggering..." : "Create Idea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
