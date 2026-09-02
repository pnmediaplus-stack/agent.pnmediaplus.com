import type { VisualAsset } from "@/types/artifact";
"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { Paperclip, X, Loader2, Bot, FileText, AlertTriangle, Hash, Slash, Users, CheckSquare } from "lucide-react";

type ChatComposerProps = {
  initialValue?: string;
  onSubmit: (value: string, visual_assets?: VisualAsset[]) => void;
  onRequestCreateTask?: (currentValue: string) => void;
};

export function ChatComposer({ initialValue = "", onSubmit, onRequestCreateTask }: ChatComposerProps) {
  const [value, setValue] = useState(initialValue);
  const { t } = useI18n("chat");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const urls = selectedFiles.map(file => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      return null;
    });
    setPreviewUrls(urls as string[]);
    return () => urls.forEach(url => { if(url) URL.revokeObjectURL(url) });
  }, [selectedFiles]);
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
    { id: "approve", name: "approve", description: "Duyệt bài viết đang chờ (QA_ready)" },
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
        setAgentsError(t("chat.composer.registry_empty"));
      }
    } catch (e) {
      console.error("Failed to load agents", e);
      setAgents([]);
      setAgentsStatus("error");
      setAgentsError(t("chat.composer.registry_error"));
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
        setDepartmentsError(t("chat.composer.no_departments"));
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
      setPagesError(t("chat.composer.network_error_pages"));
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setValue(text);

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
      replacement = `/publish integration_key:${item.integration_key} `;
    } else {
      replacement = `#${item.artifact_key || item.canonical_name || item.id} `;
    }

    const before = value.substring(0, popupState.startIndex);
    const cursor = textareaRef.current?.selectionStart || value.length;
    const after = value.substring(cursor);

    setValue(before + replacement + after);
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

  
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          // Khởi tạo file mới với tên rõ ràng hơn nếu cần
          const pastedFile = new File([file], `pasted-image-${Date.now()}.png`, { type: file.type });
          setSelectedFiles(prev => [...prev, pastedFile]);
          setUploadError(null);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validTypes = ["image/png", "image/jpeg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"];
      const validFiles = files.filter(f => validTypes.includes(f.type) || f.name.endsWith('.md'));
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setUploadError(null);
        if (validFiles.length < files.length) {
          setUploadError(t("chat.composer.files_skipped"));
        }
      } else {
        setUploadError(t("chat.composer.files_unsupported"));
      }
    }
  };


  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Check if the related target is outside the main container to avoid flickering
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const validTypes = ["image/png", "image/jpeg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/markdown"];
      const validFiles = files.filter(f => validTypes.includes(f.type) || f.name.endsWith('.md'));
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
        setUploadError(null);
        if (validFiles.length < files.length) {
          setUploadError(t("chat.composer.files_skipped"));
        }
      } else {
        setUploadError(t("chat.composer.files_unsupported"));
      }
    }
  };

  const handleSend = async () => {
    if (!value.trim() && selectedFiles.length === 0) return;

    if (selectedFiles.length > 0) {
      setIsUploading(true);
      setUploadError(null);

        let appendedMarkdown = "";
        let visual_assets: VisualAsset[] = [];
        let remainingFiles: File[] = [];
        let errors: string[] = [];

      for (const file of selectedFiles) {
        try {
          const presignRes = await fetch("/api/chat-attachments/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, type: file.type, size: file.size })
          });
          if (!presignRes.ok) throw new Error("Không thể lấy quyền Upload");
          const presignData = await presignRes.json();
          if (!presignData.success) throw new Error(presignData.message);
          
          const uploadRes = await fetch(presignData.presignedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file
          });
            if (!uploadRes.ok) throw new Error("Lỗi tải lên file: " + file.name);
            
            visual_assets.push({ url: presignData.publicUrl, type: 'user_upload', source: 'chat_ui', batch_id: Date.now().toString() });
            const isImage = file.type.startsWith("image/");
            if (isImage) {
              appendedMarkdown += `\n\n![${file.name}](${presignData.publicUrl})`;
            } else {
              appendedMarkdown += `\n\n[📎 ${file.name}](${presignData.publicUrl})`;
          }
        } catch (err: any) {
          errors.push(`${file.name}: ${err.message}`);
          remainingFiles.push(file);
        }
      }

      if (appendedMarkdown || value.trim()) {
        const finalValue = value + appendedMarkdown;
        setValue("");
        setTimeout(() => {
          onSubmit(finalValue, visual_assets);
        }, 100);
      }

      setSelectedFiles(remainingFiles);
      
      if (errors.length > 0) {
        setUploadError("Upload có lỗi một số file: " + errors.join(", "));
      } else {
        setUploadError(null);
      }
      setIsUploading(false);
    } else {
      onSubmit(value);
      setValue("");
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full shrink-0 mt-auto">
      <div 
        className={`transition-all duration-200 p-4 relative ${
          isDragging 
            ? "rounded-2xl border-2 border-dashed border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.3)]" 
            : "rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shadow-sm"
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
      {isDragging && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-900/80 backdrop-blur-sm pointer-events-none border-2 border-dashed border-cyan-400">
          <div className="text-cyan-600 dark:text-cyan-400 flex flex-col items-center gap-2">
            <Paperclip className="h-8 w-8 animate-bounce" />
            <span className="font-semibold tracking-wider uppercase text-sm">{t("chat.composer.drop_file")}</span>
          </div>
        </div>
      )}
      {/* Autocomplete Popup */}
      {popupState.isOpen && (filteredSuggestions.length > 0 || (popupState.type === 'campaign' && campaignsStatus !== 'ready') || (popupState.type === 'page' && pagesStatus !== 'ready')) && (
        <div className="absolute bottom-full mb-2 left-4 w-80 max-h-64 overflow-y-auto rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-slate-900/95 backdrop-blur-md p-2 shadow-2xl z-50">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 px-2 pb-2 mb-1 border-b border-slate-200 dark:border-slate-800">
            {popupState.type === 'command' ? t('chat.composer.select_command') : popupState.type === 'agent' ? t('chat.composer.select_agent') : popupState.type === 'department' ? t('chat.composer.select_department') : popupState.type === 'campaign' ? t('chat.composer.select_campaign') : popupState.type === 'page' ? t('chat.composer.select_page') : t('chat.composer.select_data')}
          </div>
          
          {/* Handling loading/empty states for Page */}
          {popupState.type === 'page' && pagesStatus === 'loading' && (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
              Đang tải danh sách trang...
            </div>
          )}
          {popupState.type === 'page' && pagesStatus === 'error' && (
            <div className="px-3 py-4 text-center text-sm text-rose-400 flex flex-col items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {pagesError || t("chat.composer.error_pages")}
            </div>
          )}
          {popupState.type === 'page' && pagesStatus === 'empty' && (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {pagesError || t("chat.composer.no_pages")}
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
                  isActive ? 'bg-emerald-500/20 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
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
        <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-200">
          {agentsStatus === "loading" && t("chat.composer.loading_agents")}
          {agentsStatus === "empty" && (agentsError ?? t("chat.composer.no_agents"))}
          {agentsStatus === "error" && (agentsError ?? t("chat.composer.error_agents"))}
        </div>
      )}

      {popupState.isOpen && popupState.type === "agent" && agentsStatus === "empty" && (
        <div className="mb-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 p-3 text-xs text-slate-600 dark:text-slate-300">
          {t("chat.composer.missing_role_id")}
        </div>
      )}

      {popupState.isOpen && popupState.type === "department" && departmentsStatus !== "ready" && (
        <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-200">
          {departmentsStatus === "loading" && t("chat.composer.loading_departments")}
          {departmentsStatus === "empty" && (departmentsError ?? t("chat.composer.no_departments"))}
          {departmentsStatus === "error" && (departmentsError ?? t("chat.composer.error_departments"))}
        </div>
      )}

      {popupState.isOpen && popupState.type === "campaign" && campaignsStatus !== "ready" && (
        <div className="mb-3 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-200">
          {campaignsStatus === "loading" && t("chat.composer.loading_campaigns")}
          {campaignsStatus === "empty" && (campaignsError ?? t("chat.composer.no_campaigns"))}
          {campaignsStatus === "error" && (campaignsError ?? t("chat.composer.error_campaigns"))}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-3">
          {selectedFiles.map((file, idx) => (
            <div key={idx} className="relative rounded-lg border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-950/20 p-2 w-max max-w-full">
              <button
                type="button"
                onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                className="absolute -right-2 -top-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white z-10 shadow-lg"
                disabled={isUploading}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {previewUrls[idx] ? (
                <div className="flex flex-col gap-2">
                  <img src={previewUrls[idx]} alt="Preview" className="max-h-32 rounded-md object-contain border border-cyan-900/50 bg-black/20" />
                  <div className="flex items-center gap-1.5 text-xs text-cyan-300/80 px-1">
                    <Paperclip className="h-3 w-3" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 text-sm text-cyan-200 min-w-[150px]">
                  <Paperclip className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="flex-1 truncate">{file.name}</span>
                </div>
            )}
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-900/70 backdrop-blur-sm">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-600 dark:text-cyan-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="mb-3 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-950/30 p-2 text-sm text-red-600 dark:text-red-400">
          Error: {uploadError}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={isUploading}
        placeholder={t("chat.composer.placeholder")}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none placeholder:text-slate-400 resize-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner disabled:opacity-50"
      />
      <div className="mt-1.5 flex items-center justify-between">
        <label className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400 flex items-center gap-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, application/pdf, .docx, text/plain, text/markdown, .md" multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            disabled={isUploading}
          >
            <Paperclip className="h-4 w-4" />
            <span className="font-semibold tracking-wider">{t("chat.composer.attach")}</span>
          </button>
          {onRequestCreateTask && (
            <button
              type="button"
              onClick={() => onRequestCreateTask(value)}
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <CheckSquare className="h-4 w-4" />
              <span className="font-semibold tracking-wider">{t("chat.composer.create_task")}</span>
            </button>
          )}
        </label>
        <button
          type="button"
          onClick={handleSend}
          disabled={isUploading || (!value.trim() && selectedFiles.length === 0)}
          className="flex items-center gap-2 rounded-full border border-transparent bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isUploading && <Loader2 className="h-4 w-4 animate-spin text-blue-100" />}
          {isUploading ? (t("chat.composer.uploading")) : (t("chat.composer.send"))}
        </button>
      </div>
        </div>
    </div>
  );
}
