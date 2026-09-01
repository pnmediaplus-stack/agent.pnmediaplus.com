"use client";

import { useState, memo } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatMessage } from "@/types/chat";
import { User, Bot, LayoutTemplate, Activity, ExternalLink, CheckCircle, XCircle, RefreshCw, Maximize2, Download, X, FileText, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PublishSelector } from "./PublishSelector";


const agentThemes: Record<string, any> = {
  violet: {
    border: "border-violet-200 dark:border-violet-800 hover:border-violet-300 dark:hover:border-violet-700",
    bg: "bg-violet-50/30 dark:bg-violet-950/20",
    text: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-100 dark:bg-violet-900/40 border-violet-300 dark:border-violet-700",
  },
  rose: {
    border: "border-rose-200 dark:border-rose-800 hover:border-rose-300 dark:hover:border-rose-700",
    bg: "bg-rose-50/30 dark:bg-rose-950/20",
    text: "text-rose-700 dark:text-rose-300",
    iconBg: "bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-800 hover:border-amber-300 dark:hover:border-amber-700",
    bg: "bg-amber-50/30 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700",
    bg: "bg-emerald-50/30 dark:bg-emerald-950/20",
    text: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700",
  },
  blue: {
    border: "border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700",
    bg: "bg-blue-50/30 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    iconBg: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700",
  },
  slate: {
    border: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
    bg: "bg-slate-50/30 dark:bg-slate-950/20",
    text: "text-slate-700 dark:text-slate-300",
    iconBg: "bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-700",
  }
};

function getAgentTheme(message: any) {
  const body = message.body || "";
  const intent = message.intent_type || "";
  
  if (intent === "agent_progress") return agentThemes.blue;
  if (intent === "clarify_missing_scope") return agentThemes.amber;
  if (message.sender === "n8n") return agentThemes.emerald;
  
  if (body.includes("Agent 1") || body.includes("Research")) return agentThemes.violet;
  if (body.includes("Agent 2") || body.includes("Copywriter")) return agentThemes.emerald;
  if (body.includes("Gatekeeper")) return agentThemes.rose;
  
  // Deterministic fallback based on id length
  const keys = Object.keys(agentThemes).filter(k => k !== 'slate');
  const index = (message.id?.length || 0) % keys.length;
  return agentThemes[keys[index]];
}

export const ChatMessageList = memo(function ChatMessageList({ messages, isTyping, onCommand }: { messages: ChatMessage[], isTyping?: boolean, onCommand?: (cmd: string) => void }) {
  const { t } = useI18n("chat");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [markdownPreview, setMarkdownPreview] = useState<{
    title: string;
    url: string;
    content: string;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const openMarkdownPreview = async (url: string, title: string) => {
    setMarkdownPreview({ title, url, content: "", loading: true, error: null });
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch markdown content");
      const text = await res.text();
      setMarkdownPreview(prev => prev ? { ...prev, content: text, loading: false } : null);
    } catch (err: any) {
      setMarkdownPreview(prev => prev ? { ...prev, loading: false, error: err.message } : null);
    }
  };
  
        return (
    
    <div className="space-y-3">
      {messages.map((message) => {
        const isHuman = message.sender === "human";
        const isAgent = message.sender === "agent" || message.sender === "n8n";

        const loopMatch = message.body?.match(/\(Lượt\s+(\d+\/\d+|NaN\/\d+)\)/i);
        const loopText = loopMatch ? `Lượt ${loopMatch[1]}` : null;
        
        const displayBody = message.body?.startsWith('/publish ')
          ? message.body.replace(/\/publish integration_key:\S+ ([a-f0-9-]+)(?: --page="([^"]+)")?/, "Lệnh đăng bài **$1...** lên page **'$2'**")
          : message.body;

        return (
          <div
            key={message.id}
            className={`flex w-full ${isHuman ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[85%] overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
                isHuman
                  ? "border-slate-200 hover:border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm hover:shadow-md dark:shadow-slate-900/50"
                  : isAgent
                    ? `${getAgentTheme(message).border} ${getAgentTheme(message).bg} shadow-sm hover:shadow-md dark:shadow-slate-900/50`
                    : "border-slate-200 bg-slate-50 dark:bg-slate-900/50 shadow-sm hover:shadow-md"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    isHuman ? "border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700" : isAgent ? getAgentTheme(message).iconBg : "border-slate-600 bg-slate-100 dark:bg-slate-800"
                  }`}>
                    {isHuman ? (
                      <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                    ) : isAgent ? (
                      <Bot className={`h-3.5 w-3.5 ${getAgentTheme(message).text}`} />
                    ) : (
                      <LayoutTemplate className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-widest ${
                    isHuman ? "text-slate-500 dark:text-slate-300" : isAgent ? getAgentTheme(message).text : "text-slate-500 dark:text-slate-400"
                  }`}>
                    {isHuman
                      ? (t("chat.message.sender.human") ?? "Human")
                      : isAgent
                        ? (t("chat.message.sender.agent") ?? "Agent")
                        : (t("chat.message.sender.system") ?? "System")}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-500">{new Date(message.created_at).toLocaleTimeString()}</div>
              </div>

              <div className="text-sm leading-relaxed text-slate-800 dark:text-slate-100 prose dark:prose-invert prose-sm max-w-none">
                {displayBody?.includes('[[CAMPAIGN_PROPOSAL]]') || (message.intent_type as string) === 'campaign_proposal' ? (
                    <div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/40 dark:to-slate-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 shadow-xl my-2 w-[500px] max-w-full">
                      <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-300 font-semibold text-base">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                          <FileText className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <div>
                          <div className="text-xs text-emerald-500 dark:text-emerald-400/70 uppercase tracking-widest mb-0.5 flex items-center justify-between"><span>Campaign Planner</span>{loopText && <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold">{loopText}</span>}</div>
                          {t("chat.proposal.title") ?? "BẢN KẾ HOẠCH CHIẾN DỊCH HOÀN CHỈNH"}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300/80 leading-relaxed">
                        {t("chat.proposal.desc") ?? "Hệ thống Agent đã phân tích và thiết lập xong Kế hoạch chiến dịch 10 ngày (Từ A đến T) dựa trên yêu cầu của sếp."}
                      </p>
                      <button
                        type="button"
                        onClick={() => setMarkdownPreview({
                          url: '',
                          title: t("chat.proposal.docTitle") ?? 'Kế hoạch Chiến dịch N8N',
                          content: displayBody.replace('[[CAMPAIGN_PROPOSAL]]', ''),
                          loading: false,
                          error: null
                        })}
                        className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
                      >
                        <Maximize2 className="w-4 h-4" /> {t("chat.proposal.expand") ?? "Mở xem toàn màn hình"}
                      </button>
                    </div>
                  ) : (
                    <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    img: ({ node, ...props }) => {
                      return (
                        <span 
                          className="my-4 relative overflow-hidden rounded-xl border border-white/10 shadow-lg max-h-[300px] flex items-center justify-center bg-black/50 group cursor-pointer"
                          onClick={() => setLightboxImage(typeof props.src === 'string' ? props.src : null)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img {...props} className="max-h-[300px] w-auto object-contain transition-transform duration-300 group-hover:scale-105" alt={props.alt || 'Chat media'} />
                          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <Maximize2 className="h-8 w-8 text-slate-900 dark:text-white/80 drop-shadow-md" />
                          </span>
                        </span>
                      );
                    },
                    a: ({ node, ...props }) => {
                      const href = props.href || '';

                      // Action buttons mapping: [Duyệt](action:approve:123)
                      if (href.startsWith('action:')) {
                        const [, actionType, id] = href.split(':');

                        let Icon = RefreshCw;
                        let colorClass = "border-emerald-200 dark:border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/20";

                        if (actionType === 'approve') {
                          Icon = CheckCircle;
                          colorClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/20";
                        } else if (actionType === 'reject') {
                          Icon = XCircle;
                          colorClass = "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20";
                        }

                        return (
                          <button
                            type="button"
                            className={`my-2 mr-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${colorClass}`}
                            onClick={async (e) => {
                              const btn = e.currentTarget;
                              const originalText = btn.innerHTML;
                              btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing...`;
                              btn.disabled = true;

                              try {
                                const res = await fetch('/api/runtime/execution-event', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    type: `human_action_${actionType}`,
                                    payload: { targetId: id, action: actionType, timestamp: new Date().toISOString() }
                                  })
                                });

                                if (!res.ok) throw new Error('Action failed');

                                btn.innerHTML = `<svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg> Success`;
                                btn.className = btn.className.replace(/border-.*-500\/30/, 'border-green-500/30 bg-green-500/10 text-green-300');
                              } catch (err) {
                                console.error('Action error', err);
                                btn.innerHTML = `<svg class="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Failed`;
                                btn.className = btn.className.replace(/border-.*-500\/30/, 'border-red-500/30 bg-red-500/10 text-red-300');
                                setTimeout(() => {
                                  btn.innerHTML = originalText;
                                  btn.disabled = false;
                                }, 2000);
                              }
                            }}
                          >
                            <Icon className="h-4 w-4" />
                            {props.children}
                          </button>
                        );
                      }

                      const isAttachment = Array.isArray(props.children)
                        ? typeof props.children[0] === 'string' && props.children[0].includes('📎')
                        : typeof props.children === 'string' && props.children.includes('📎');

                      const isMarkdownAttachment =
                        href.toLowerCase().endsWith('.md') ||
                        href.toLowerCase().endsWith('.markdown') ||
                        (Array.isArray(props.children)
                          ? props.children.some((child) => typeof child === 'string' && child.toLowerCase().includes('.md'))
                          : typeof props.children === 'string' && props.children.toLowerCase().includes('.md'));

                      // File attachments link
                      if (isAttachment) {
                        if (isMarkdownAttachment) {
                          const markdownTitle = Array.isArray(props.children)
                            ? props.children
                                .filter((child): child is string => typeof child === 'string')
                                .join(' ')
                                .replace(/^📎\s*/, '')
                            : String(props.children || '').replace(/^📎\s*/, '');

                          return (
                            <button
                              type="button"
                              onClick={() => openMarkdownPreview(href, markdownTitle || 'Markdown attachment')}
                              className="inline-flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-left text-xs font-semibold text-violet-200 no-underline hover:bg-violet-500/20"
                            >
                              <FileText className="h-4 w-4 text-violet-300" />
                              <span className="flex flex-col leading-tight">
                                <span className="uppercase tracking-wider text-[10px] text-violet-300/80">Markdown</span>
                                <span className="max-w-[260px] truncate">{props.children}</span>
                              </span>
                            </button>
                          );
                        }

                        return (
                          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300 no-underline hover:bg-cyan-100 dark:bg-cyan-500/20">
                            {props.children}
                          </a>
                        );
                      }

                      // Normal link
                      return (
                        <a href={href} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 underline underline-offset-2">
                          {props.children} <ExternalLink className="h-3 w-3 inline" />
                        </a>
                      );
                    }
                  }}
                >
                  {displayBody?.replace('[[CAMPAIGN_PROPOSAL]]', '')}
                </ReactMarkdown>
                  )}
              {message.intent_type === 'publish_prompt' && onCommand && (
                <PublishSelector contentItemId={message.metadata?.contentItemId || ''} onCommand={onCommand} />
              )}
    
              </div>

              {message.intent_type ? (
                <div className="mt-4 flex items-center gap-1.5 rounded bg-slate-100 dark:bg-black/20 px-2.5 py-1 w-fit border border-slate-200 dark:border-white/5">
                  <Activity className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                    {t("chat.message.intentPrefix") ?? "INTENT"}: <span className="text-emerald-600 dark:text-emerald-300">{message.intent_type}</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex w-full justify-start">
          <div className="relative max-w-[85%] overflow-hidden rounded-2xl border p-4 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 shadow-sm rounded-tl-sm animate-pulse">
            <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                  <Bot className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {t("chat.message.sender.agent") ?? "Agent"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-slate-400/50 dark:bg-slate-500/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-slate-400/50 dark:bg-slate-500/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-slate-400/50 dark:bg-slate-500/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" 
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 flex gap-4">
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch(lightboxImage);
                  if (!res.ok) throw new Error("Network error");
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = lightboxImage.split('/').pop() || 'image.jpg';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                } catch (err) {
                  console.error("Failed to download image", err);
                  // Fallback for cross-origin or signed URLs
                  window.open(lightboxImage, '_blank');
                }
              }}
              className="p-3 bg-black/50 hover:bg-black/80 text-slate-900 dark:text-white rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-xl"
              title="Download Image"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-3 bg-black/50 hover:bg-black/80 text-slate-900 dark:text-white rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-xl"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={lightboxImage} 
            alt="Enlarged view" 
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {markdownPreview && (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setMarkdownPreview(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-[min(95vw,1000px)] flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-200 dark:border-slate-700/50 bg-white dark:bg-[#0f1117] shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 backdrop-blur-md">
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 mb-1">{t("chat.markdown.preview") ?? "Markdown Preview"}</div>
                <div className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{markdownPreview.title || (t("chat.markdown.attachment") ?? 'Attachment')}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        let textContent = markdownPreview.content;
                        if (!textContent && markdownPreview.url) {
                          const res = await fetch(markdownPreview.url);
                          textContent = await res.text();
                        }
                        await navigator.clipboard.writeText(textContent);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      } catch (err) {
                        console.error("Failed to copy markdown", err);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? t("chat.markdown.copied") ?? "Copied" : t("chat.markdown.copy") ?? "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        let blob;
                        if (markdownPreview.url) {
                          const res = await fetch(markdownPreview.url);
                          if (!res.ok) throw new Error("Network error");
                          blob = await res.blob();
                        } else {
                          blob = new Blob([markdownPreview.content], { type: 'text/markdown' });
                        }
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = markdownPreview.title ? `${markdownPreview.title}.md` : (markdownPreview.url ? (markdownPreview.url.split('/').pop() || 'Proposal.md') : 'Proposal.md');
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (err) {
                        console.error("Failed to download markdown", err);
                        if (markdownPreview.url) window.open(markdownPreview.url, '_blank');
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .md
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        let textContent = markdownPreview.content;
                        if (!textContent && markdownPreview.url) {
                          const res = await fetch(markdownPreview.url);
                          textContent = await res.text();
                        }
                        const blob = new Blob([textContent], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        a.download = markdownPreview.title ? `${markdownPreview.title}.txt` : 'Proposal.txt';
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      } catch (err) {
                        console.error("Failed to download text", err);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .txt
                  </button>
                  </div>
                <button
                  type="button"
                  onClick={() => setMarkdownPreview(null)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-900 dark:text-white/80 hover:bg-white/10"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {markdownPreview.loading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  Đang tải nội dung...
                </div>
              ) : markdownPreview.error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {markdownPreview.error}
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none prose-headings:text-slate-900 dark:prose-headings:text-slate-100 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-a:text-emerald-500 dark:prose-a:text-emerald-400 hover:prose-a:text-emerald-600 dark:hover:prose-a:text-emerald-300 prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-ul:text-slate-700 dark:prose-ul:text-slate-300 prose-ol:text-slate-700 dark:prose-ol:text-slate-300 prose-li:marker:text-slate-400 dark:prose-li:marker:text-slate-500 prose-code:text-emerald-600 dark:prose-code:text-emerald-300 prose-code:bg-emerald-500/10 dark:prose-code:bg-emerald-400/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-pre:bg-slate-50 dark:prose-pre:bg-[#0d0f15] prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-800 prose-blockquote:border-l-emerald-500 prose-blockquote:bg-emerald-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-slate-700 dark:prose-blockquote:text-slate-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownPreview.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
