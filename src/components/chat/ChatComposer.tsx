"use client";

import { useState, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { Paperclip, X, Loader2, Bot, FileText, AlertTriangle } from "lucide-react";

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

  // Autocomplete State
  const [agents, setAgents] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    type: 'agent' | 'artifact' | null;
    searchTerm: string;
    startIndex: number;
  }>({ isOpen: false, type: null, searchTerm: '', startIndex: -1 });
  const [activeIndex, setActiveIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadAgents = async () => {
    if (agents.length > 0) return;
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (e) {
      console.error("Failed to load agents", e);
    }
  };

  const loadArtifacts = async () => {
    if (artifacts.length > 0) return;
    try {
      const res = await fetch('/api/artifacts');
      const data = await res.json();
      if (data.artifacts) setArtifacts(data.artifacts);
    } catch (e) {
      console.error("Failed to load artifacts", e);
    }
  };

  const handleTextChange = (text: string) => {
    onChange(text);

    const cursorPosition = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPosition);

    // Match @agent or #data right before cursor
    const match = textBeforeCursor.match(/(^|\s)([@#])([a-zA-Z0-9_-]*)$/);

    if (match) {
      const trigger = match[2];
      const term = match[3];
      const startIndex = match.index! + match[1].length;

      setPopupState({
        isOpen: true,
        type: trigger === '@' ? 'agent' : 'artifact',
        searchTerm: term,
        startIndex
      });
      setActiveIndex(0);

      if (trigger === '@') loadAgents();
      else loadArtifacts();
    } else {
      setPopupState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    }
  };

  const filteredSuggestions = useMemo(() => {
    if (!popupState.isOpen) return [];
    const term = popupState.searchTerm.toLowerCase();

    if (popupState.type === 'agent') {
      return agents.filter(a =>
        (a.alias || '').toLowerCase().includes(term) ||
        (a.id || '').toLowerCase().includes(term) ||
        (a.role || '').toLowerCase().includes(term)
      ).slice(0, 10); // Max 10 results
    } else {
      return artifacts.filter(a =>
        (a.name || a.title || a.key || a.id || '').toLowerCase().includes(term)
      ).slice(0, 10);
    }
  }, [popupState, agents, artifacts]);

  const selectSuggestion = (item: any) => {
    if (!popupState.isOpen) return;

    let replacement = '';
    if (popupState.type === 'agent') {
      replacement = `@${item.alias || item.id} `;
    } else {
      replacement = `#${item.key || item.id || item.name || item.title} `;
    }

    const before = value.substring(0, popupState.startIndex);
    const cursor = textareaRef.current?.selectionStart || value.length;
    const after = value.substring(cursor);

    onChange(before + replacement + after);
    setPopupState(prev => ({ ...prev, isOpen: false }));

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = before.length + replacement.length;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (popupState.isOpen && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setPopupState(prev => ({ ...prev, isOpen: false }));
        return;
      }
    } else {
      // Default enter behavior
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  };

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

        const isImage = selectedFile.type.startsWith("image/");
        const markdown = isImage
          ? `\n\n![${selectedFile.name}](${data.signedUrl})`
          : `\n\n[📎 ${selectedFile.name}](${data.signedUrl})`;

        onChange(value + markdown);
        setSelectedFile(null);

        setTimeout(() => {
          onSubmit();
          setIsUploading(false);
        }, 100);

      } catch (err: any) {
        setUploadError(err.message);
        setIsUploading(false);
        return;
      }
    } else {
      onSubmit();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 relative">
      {/* Autocomplete Popup */}
      {popupState.isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-full mb-2 left-4 w-80 max-h-64 overflow-y-auto rounded-xl border border-indigo-500/30 bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-50">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 px-2 pb-2 mb-1 border-b border-slate-800">
            {popupState.type === 'agent' ? 'Select Agent' : 'Select Data Reference'}
          </div>
          {filteredSuggestions.map((item, idx) => {
            const isActive = idx === activeIndex;
            const Icon = popupState.type === 'agent' ? Bot : FileText;
            const title = popupState.type === 'agent' ? (item.alias || item.id) : (item.key || item.title || item.name || item.id);
            const subTitle = popupState.type === 'agent' ? item.role : item.type;
            const isAmbiguous = popupState.type === 'agent' && !item.alias;

            return (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => selectSuggestion(item)}
                className={`w-full text-left flex flex-col gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-500/20 text-white' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span className="font-medium text-sm truncate">{title}</span>
                  {isAmbiguous && (
                    <span title="Missing alias, using ID instead" className="flex shrink-0">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    </span>
                  )}
                </div>
                {subTitle && (
                  <div className="text-xs text-slate-500 pl-6 truncate">{subTitle}</div>
                )}
              </button>
            );
          })}
        </div>
      )}

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
        ref={textareaRef}
        value={value}
        onChange={(event) => handleTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={isUploading}
        placeholder={t("chat.composer.placeholder") ?? "Type a command, ask for status, or request a task. Use @ to tag agents, # to reference data."}
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
