"use client";

import { useState, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { Paperclip, X, Loader2, Bot, FileText, AlertTriangle, Hash, Slash, Users, CheckSquare } from "lucide-react";

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onRequestCreateTask?: () => void;
};

export function ChatComposer({ value, onChange, onSubmit, onRequestCreateTask }: ChatComposerProps) {
  const { t } = useI18n("chat");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Autocomplete State
  const [agents, setAgents] = useState<any[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [campaignsStatus, setCampaignsStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [departmentsStatus, setDepartmentsStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [agentsStatus, setAgentsStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [pagesStatus, setPagesStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [pagesError, setPagesError] = useState<string | null>(null);
  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    type: 'agent' | 'artifact' | 'command' | 'department' | 'campaign' | 'page' | null;
    searchTerm: string;
    startIndex: number;
  }>({ isOpen: false, type: null, searchTerm: '', startIndex: -1 });
  const [activeIndex, setActiveIndex] = useState(0);

  const slashCommands = useMemo(() => ([
    { id: "auto_content", name: "auto_content", description: "Tạo nội dung tự động" },
    { id: "viral_research", name: "viral_research", description: "Nghiên cứu viral" },
    { id: "publish", name: "publish", description: "Đăng nội dung lên page (VD: /publish integration_key:<ID>)" },
    { id: "plan_campaign", name: "plan_campaign", description: "Lập kế hoạch chiến dịch" },
    { id: "approve_campaign", name: "approve_campaign", description: "Duyệt và tạo chiến dịch từ kế hoạch (VD: /approve_campaign Tên)" },
    { id: "brainstorm", name: "brainstorm", description: "Lên ý tưởng nội dung dựa trên kế hoạch hoặc xu hướng" },
    { id: "status", name: "status", description: "Xem trạng thái" },
    { id: "campaign", name: "campaign", description: "Gắn chiến dịch (VD: /campaign set <tên>)" }
  ]), []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadAgents = async () => {
    if (agents.length > 0) return;
    try {
      setAgentsStatus("loading");
      setAgentsError(null);
      const res = await fetch('/api/governance/marketing-agents');
      const data = await res.json();
      if (data.state === "blocked") {
        setAgents([]);
        setAgentsStatus("error");
        setAgentsError(`Marketing registry blocked: ${data.reason || "unknown_reason"}.`);
        return;
      }

      const registryAgents = Array.isArray(data?.data?.agents) ? data.data.agents : [];
      if (registryAgents.length > 0) {
        setAgents(registryAgents);
        setAgentsStatus("ready");
      } else {
        setAgents([]);
        setAgentsStatus("empty");
        setAgentsError("Marketing registry hiện tại không có agent nào khả dụng.");
      }
    } catch (e) {
      console.error("Failed to load agents", e);
      setAgents([]);
      setAgentsStatus("error");
      setAgentsError("Không tải được marketing registry từ /api/governance/marketing-agents.");
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

  const loadDepartments = async () => {
    if (departments.length > 0) return;
    try {
      setDepartmentsStatus("loading");
      setDepartmentsError(null);
      const res = await fetch('/api/governance/departments');
      const data = await res.json();
      if (data.state === "blocked") {
        setDepartments([]);
        setDepartmentsStatus("error");
        setDepartmentsError(`Department registry blocked: ${data.reason || "unknown_reason"}.`);
        return;
      }
      
      const registryDeps = Array.isArray(data?.departments) ? data.departments : [];
      if (registryDeps.length > 0) {
        setDepartments(registryDeps);
        setDepartmentsStatus("ready");
      } else {
        setDepartments([]);
        setDepartmentsStatus("empty");
        setDepartmentsError("Không có phòng ban nào khả dụng.");
      }
    } catch (e) {
      console.error("Failed to load departments", e);
      setDepartments([]);
      setDepartmentsStatus("error");
      setDepartmentsError("Lỗi kết nối khi tải danh sách phòng ban.");
    }
  };

  const loadCampaigns = async () => {
    if (campaigns.length > 0) return;
    try {
      setCampaignsStatus("loading");
      setCampaignsError(null);
      const res = await fetch('/api/governance/campaigns');
      const data = await res.json();
      
      const list = Array.isArray(data?.data) ? data.data : [];
      if (list.length > 0) {
        setCampaigns(list);
        setCampaignsStatus("ready");
      } else {
        setCampaigns([]);
        setCampaignsStatus("empty");
        setCampaignsError("Không có chiến dịch nào đang active.");
      }
    } catch (e) {
      console.error("Failed to load campaigns", e);
      setCampaigns([]);
      setCampaignsStatus("error");
      setCampaignsError("Lỗi kết nối khi tải danh sách chiến dịch.");
    }
  };

  const loadPages = async () => {
    if (pages.length > 0) return;
    try {
      setPagesStatus("loading");
      setPagesError(null);
      const res = await fetch('/api/tenant-integrations');
      const data = await res.json();
      
      if (!data.ok) {
        setPages([]);
        setPagesStatus("error");
        setPagesError(`Lỗi tải integrations: ${data.reason || "unknown_reason"}.`);
        return;
      }

      // Strictly filter for facebook_page to avoid surfacing non-page integrations
      const validProviders = (data.data?.providers || [])
        .filter((p: any) => p.provider_code === 'facebook_page')
        .map((p: any) => p.provider_code);
        
      const list = (data.data?.integrations || []).filter(
        (i: any) => (i.status === 'active' || i.status === 'connected' || i.connection_state === 'verified' || i.connection_state === 'healthy') && validProviders.includes(i.provider_code)
      );

      if (list.length > 0) {
        setPages(list);
        setPagesStatus("ready");
      } else {
        setPages([]);
        setPagesStatus("empty");
        setPagesError("Chưa có fanpage/social nào được kết nối.");
      }
    } catch (e) {
      console.error("Failed to load pages", e);
      setPages([]);
      setPagesStatus("error");
      setPagesError("Lỗi mạng khi tải danh sách page.");
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    const cursorPosition = textareaRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.substring(0, cursorPosition);

    const match = textBeforeCursor.match(/(^|\s)([\/@#])([a-zA-Z0-9_-]*)$/);
    const planCampaignMatch = textBeforeCursor.match(/(^|\s)(\/plan_campaign\s+)([^\s]*)$/);
    const campaignSetMatch = textBeforeCursor.match(/(^|\s)(\/campaign\s+set\s+)([^\s]*)$/);
    const publishMatch = textBeforeCursor.match(/(^|\s)(\/publish\s+)([^\s]*)$/);

    if (campaignSetMatch) {
      const term = campaignSetMatch[3];
      const startIndex = campaignSetMatch.index! + campaignSetMatch[1].length;

      setPopupState({
        isOpen: true,
        type: 'campaign',
        searchTerm: term,
        startIndex
      });
      setActiveIndex(0);
      loadCampaigns();
    } else if (publishMatch) {
      const term = publishMatch[3];
      const startIndex = publishMatch.index! + publishMatch[1].length;

      setPopupState({
        isOpen: true,
        type: 'page',
        searchTerm: term,
        startIndex
      });
      setActiveIndex(0);
      loadPages();
    } else if (planCampaignMatch) {
      const term = planCampaignMatch[3];
      const startIndex = planCampaignMatch.index! + planCampaignMatch[1].length;

      setPopupState({
        isOpen: true,
        type: 'department',
        searchTerm: term,
        startIndex
      });
      setActiveIndex(0);
      loadDepartments();
    } else if (match) {
      const trigger = match[2];
      const term = match[3];
      const startIndex = match.index! + match[1].length;

      setPopupState({
        isOpen: true,
        type: trigger === '/' ? 'command' : (trigger === '@' ? 'agent' : 'artifact'),
        searchTerm: term,
        startIndex
      });
      setActiveIndex(0);

      if (trigger === '@') loadAgents();
      else if (trigger === '#') loadArtifacts();
    } else {
      setPopupState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
    }
  };

  const filteredSuggestions = useMemo(() => {
    if (!popupState.isOpen) return [];
    const term = popupState.searchTerm.toLowerCase();

    if (popupState.type === 'command') {
      return slashCommands.filter(cmd =>
        cmd.name.toLowerCase().includes(term) ||
        cmd.description.toLowerCase().includes(term)
      ).slice(0, 8);
    }

    if (popupState.type === 'agent') {
      return agents.filter(a =>
        (a.role_id || '').toLowerCase().includes(term) ||
        (a.role_name || '').toLowerCase().includes(term) ||
        (a.capability_boundary?.must || []).join(" ").toLowerCase().includes(term) ||
        (a.capability_boundary?.may || []).join(" ").toLowerCase().includes(term) ||
        (a.capability_boundary?.must_not || []).join(" ").toLowerCase().includes(term)
      ).slice(0, 10);
    } else if (popupState.type === 'department') {
      return departments.filter(d =>
        (d.department_id || '').toLowerCase().includes(term) ||
        (d.department_name || '').toLowerCase().includes(term)
      ).slice(0, 10);
    } else if (popupState.type === 'campaign') {
      return campaigns.filter(c =>
        (c.id || '').toLowerCase().includes(term) ||
        (c.name || '').toLowerCase().includes(term)
      ).slice(0, 10);
    } else if (popupState.type === 'page') {
      return pages.filter(p =>
        (p.integration_key || '').toLowerCase().includes(term) ||
        (p.integration_name || '').toLowerCase().includes(term) ||
        (p.provider_name || '').toLowerCase().includes(term)
      ).slice(0, 10);
    } else {
      return artifacts.filter(a =>
        (a.artifact_key || '').toLowerCase().includes(term) ||
        (a.canonical_name || '').toLowerCase().includes(term) ||
        (a.id || '').toLowerCase().includes(term)
      ).slice(0, 10);
    }
  }, [popupState, agents, artifacts, departments, campaigns, pages, slashCommands]);

  const selectSuggestion = (item: any) => {
    if (!popupState.isOpen) return;

    let replacement = '';
    if (popupState.type === 'command') {
      replacement = `/${item.name} `;
    } else if (popupState.type === 'agent') {
      replacement = `@${item.role_id} `;
    } else if (popupState.type === 'department') {
      replacement = `/plan_campaign department_id:${item.department_id} `;
    } else if (popupState.type === 'campaign') {
      replacement = `/campaign set ${item.name || item.id} `;
    } else if (popupState.type === 'page') {
      replacement = `integration_key:${item.integration_key} `;
    } else {
      replacement = `#${item.artifact_key || item.canonical_name || item.id} `;
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
      {popupState.isOpen && (filteredSuggestions.length > 0 || (popupState.type === 'campaign' && campaignsStatus !== 'ready') || (popupState.type === 'page' && pagesStatus !== 'ready')) && (
        <div className="absolute bottom-full mb-2 left-4 w-80 max-h-64 overflow-y-auto rounded-xl border border-indigo-500/30 bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-50">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 px-2 pb-2 mb-1 border-b border-slate-800">
            {popupState.type === 'command' ? 'Select Command' : popupState.type === 'agent' ? 'Select Agent' : popupState.type === 'department' ? 'Select Department' : popupState.type === 'campaign' ? 'Select Campaign' : popupState.type === 'page' ? 'Select Page' : 'Select Data Reference'}
          </div>
          
          {/* Handling loading/empty states for Page */}
          {popupState.type === 'page' && pagesStatus === 'loading' && (
            <div className="px-3 py-4 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              Đang tải danh sách trang...
            </div>
          )}
          {popupState.type === 'page' && pagesStatus === 'error' && (
            <div className="px-3 py-4 text-center text-sm text-rose-400 flex flex-col items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {pagesError || "Lỗi tải danh sách"}
            </div>
          )}
          {popupState.type === 'page' && pagesStatus === 'empty' && (
            <div className="px-3 py-4 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {pagesError || "Không có trang nào"}
            </div>
          )}

          {/* Render List */}
          {filteredSuggestions.map((item, idx) => {
            const isActive = idx === activeIndex;
            const Icon = popupState.type === 'command' ? Slash : popupState.type === 'agent' ? Bot : popupState.type === 'department' ? Users : popupState.type === 'campaign' ? FileText : popupState.type === 'page' ? CheckSquare : FileText;
            const title =
              popupState.type === 'command'
                ? item.name
                : popupState.type === 'agent'
                  ? (item.role_name || item.role_id)
                  : popupState.type === 'department'
                    ? (item.department_name || item.department_id)
                    : popupState.type === 'campaign'
                      ? item.name
                      : popupState.type === 'page'
                        ? item.integration_name
                        : (item.canonical_name || item.artifact_key || item.id);
            const subTitle =
              popupState.type === 'command'
                ? item.description
                : popupState.type === 'agent'
                  ? [item.role_id, item.authority_level, item.constitutional_layer].filter(Boolean).join(" • ")
                  : popupState.type === 'department'
                    ? `department_id:${item.department_id}`
                    : popupState.type === 'campaign'
                      ? item.description
                      : popupState.type === 'page'
                        ? `[${item.provider_name}] ${item.integration_key}`
                        : item.artifact_type;
            const isAmbiguous = popupState.type === 'agent' && !item.role_id;

            return (
              <button
                key={popupState.type === "department" ? item.department_id : item.id}
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
                  {popupState.type === 'agent' && isAmbiguous && (
                    <span title="Missing role_id, mention will fail-closed" className="flex shrink-0">
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

      {popupState.isOpen && popupState.type === "agent" && agentsStatus !== "ready" && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-950/30 p-3 text-xs text-amber-200">
          {agentsStatus === "loading" && "Đang tải danh sách agent..."}
          {agentsStatus === "empty" && (agentsError ?? "Không có agent nào khả dụng.")}
          {agentsStatus === "error" && (agentsError ?? "Không tải được danh sách agent.")}
        </div>
      )}

      {popupState.isOpen && popupState.type === "agent" && agentsStatus === "empty" && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
          Registry governance rỗng hoặc chưa load được. Mention cần `@role_id` hợp lệ, nếu không hệ thống sẽ fail-closed.
        </div>
      )}

      {popupState.isOpen && popupState.type === "department" && departmentsStatus !== "ready" && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-950/30 p-3 text-xs text-amber-200">
          {departmentsStatus === "loading" && "Đang tải danh sách phòng ban..."}
          {departmentsStatus === "empty" && (departmentsError ?? "Không có phòng ban nào khả dụng.")}
          {departmentsStatus === "error" && (departmentsError ?? "Không tải được danh sách phòng ban.")}
        </div>
      )}

      {popupState.isOpen && popupState.type === "campaign" && campaignsStatus !== "ready" && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-950/30 p-3 text-xs text-amber-200">
          {campaignsStatus === "loading" && "Đang tải danh sách chiến dịch..."}
          {campaignsStatus === "empty" && (campaignsError ?? "Không có chiến dịch nào khả dụng.")}
          {campaignsStatus === "error" && (campaignsError ?? "Không tải được danh sách chiến dịch.")}
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
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={isUploading}
        placeholder={t("chat.composer.placeholder") ?? "Type a command, ask for status, or request a task. Use / for commands, @ to tag agents, # to reference data."}
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
          {onRequestCreateTask && (
            <button
              type="button"
              onClick={onRequestCreateTask}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="font-semibold tracking-wider">{t("chat.composer.create_task") ?? "CREATE TASK"}</span>
            </button>
          )}
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
