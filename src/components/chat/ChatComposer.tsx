"use client";

import { useState, useRef } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { Paperclip, X, Loader2 } from "lucide-react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({ value, onChange, onSubmit }: ChatComposerProps) {
  const { t } = useI18n("chat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleSend = async () => {
    if (!value.trim() && !selectedFile) return;

    if (selectedFile) {
      setIsUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      try {
        const res = await fetch("/api/chat-attachments", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Upload failed");
        }

        // Append the markdown for the attachment
        const isImage = selectedFile.type.startsWith("image/");
        const markdown = isImage
          ? `\n\n![${selectedFile.name}](${data.signedUrl})`
          : `\n\n[📎 ${selectedFile.name}](${data.signedUrl})`;

        onChange(value + markdown);
        setSelectedFile(null); // Clear selection after successful attachment string injection

        // Wait a tick for React state to update before submitting
        setTimeout(() => {
          onSubmit();
          setIsUploading(false);
        }, 100);

      } catch (err: any) {
        setUploadError(err.message);
        setIsUploading(false);
        return; // Stop submission on error (Fail-closed)
      }
    } else {
      onSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 relative">
      {selectedFile && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/30 p-2 text-sm text-cyan-200">
          <Paperclip className="h-4 w-4 text-cyan-400" />
          <span className="flex-1 truncate">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="rounded hover:bg-cyan-900/50 p-1"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-950/30 p-2 text-sm text-red-400">
          Error: {uploadError}
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        disabled={isUploading}
        placeholder={t("chat.composer.placeholder") ?? "Type a command, ask for status, or request a task."}
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50 disabled:opacity-50"
      />
      <div className="mt-3 flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.24em] text-slate-400 flex items-center gap-4">
          <span>{t("chat.composer.label") ?? "Human command"}</span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, application/pdf, .docx, text/plain"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors"
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4" />
            <span className="font-semibold tracking-wider">ATTACH</span>
          </button>
        </label>
        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || (!value.trim() && !selectedFile)}
          className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition-colors hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isUploading ? "Uploading..." : (t("chat.composer.send") ?? "Send command")}
        </button>
      </div>
    </div>
  );
}
