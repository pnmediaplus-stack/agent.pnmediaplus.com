"use client";

import { useState, memo } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatMessage } from "@/types/chat";
import { User, Bot, LayoutTemplate, Activity, ExternalLink, CheckCircle, XCircle, RefreshCw, Maximize2, Download, X, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PublishSelector } from "./PublishSelector";

export const ChatMessageList = memo(function ChatMessageList({ messages, isTyping, onCommand }: { messages: ChatMessage[], isTyping?: boolean, onCommand?: (cmd: string) => void }) {
  const { t } = useI18n("chat");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [markdownPreview, setMarkdownPreview] = useState<{
    title: string;
    url: string;
    content: string;
    loading: boolean;
    error: string | null;
  } | null>(null);

  const openMarkdownPreview = async (url: string, title: string) => {
    setMarkdownPreview({
      title,
      url,
      content: "",
      loading: true,
      error: null
    });

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch markdown (${res.status})`);
      const content = await res.text();
      setMarkdownPreview({
        title,
        url,
        content,
        loading: false,
        error: null
      });
    } catch (error: any) {
      setMarkdownPreview({
        title,
        url,
        content: "",
        loading: false,
        error: error?.message || "Không thể tải nội dung file."
      });
    }
  };
  
        return (
    
    <div className="space-y-3">
      {messages.map((message) => {
        const isHuman = message.sender === "human";
        const isAgent = message.sender === "agent";

        const displayBody = message.body?.startsWith('/publish ')
          ? message.body.replace(/\/publish integration_key:\S+ ([a-f0-9-]+)(?: --page="([^"]+)")?/, "Lệnh đăng bài **$1...** lên page **'$2'**")
          : message.body;

        return (
          <div
            key={message.id}
            className={`flex w-full ${isHuman ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[85%] overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl ${
                isHuman
                  ? "border-cyan-500/30 bg-cyan-950/40 shadow-cyan-900/20 rounded-tr-sm"
                  : isAgent
                    ? "border-emerald-500/30 bg-emerald-950/40 shadow-emerald-900/20 rounded-tl-sm"
                    : "border-slate-800/60 bg-slate-900/50 shadow-black/20 rounded-tl-sm"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    isHuman ? "border-cyan-500/50 bg-cyan-500/20" : isAgent ? "border-emerald-500/50 bg-emerald-500/20" : "border-slate-600 bg-slate-800"
                  }`}>
                    {isHuman ? (
                      <User className="h-3.5 w-3.5 text-cyan-300" />
                    ) : isAgent ? (
                      <Bot className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <LayoutTemplate className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-widest ${
                    isHuman ? "text-cyan-300" : isAgent ? "text-emerald-300" : "text-slate-400"
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

              <div className="text-sm leading-relaxed text-slate-200 prose prose-invert prose-sm max-w-none">
                {displayBody?.includes('[[CAMPAIGN_PROPOSAL]]') ? (
                    <div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-indigo-950/40 to-slate-900/40 rounded-2xl border border-indigo-500/30 shadow-xl my-2 w-[500px] max-w-full">
                      <div className="flex items-center gap-3 text-indigo-300 font-semibold text-base">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                          <FileText className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                          <div className="text-xs text-indigo-400/70 uppercase tracking-widest mb-0.5">Campaign Planner</div>
                          BẢN KẾ HOẠCH CHIẾN DỊCH HOÀN CHỈNH
                        </div>
                      </div>
                      <p className="text-sm text-slate-300/80 leading-relaxed">
                        Hệ thống Agent đã phân tích và thiết lập xong Kế hoạch chiến dịch 10 ngày (Từ A đến T) dựa trên yêu cầu của sếp.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMarkdownPreview({
                          url: '',
                          title: 'Kế hoạch Chiến dịch N8N',
                          content: displayBody.replace('[[CAMPAIGN_PROPOSAL]]', ''),
                          loading: false,
                          error: null
                        })}
                        className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2"
                      >
                        <Maximize2 className="w-4 h-4" /> Mở xem toàn màn hình
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
                            <Maximize2 className="h-8 w-8 text-white/80 drop-shadow-md" />
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
                        let colorClass = "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20";

                        if (actionType === 'approve') {
                          Icon = CheckCircle;
                          colorClass = "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20";
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
                          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300 no-underline hover:bg-cyan-500/20">
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
                <div className="mt-4 flex items-center gap-1.5 rounded bg-black/20 px-2.5 py-1 w-fit border border-white/5">
                  <Activity className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-mono text-[10px] text-slate-400">
                    {t("chat.message.intentPrefix") ?? "INTENT"}: <span className="text-indigo-300">{message.intent_type}</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      {isTyping && (
        <div className="flex w-full justify-start">
          <div className="relative max-w-[85%] overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl border-emerald-500/30 bg-emerald-950/40 shadow-emerald-900/20 rounded-tl-sm animate-pulse">
            <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20">
                  <Bot className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                  {t("chat.message.sender.agent") ?? "Agent"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
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
              className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-xl"
              title="Download Image"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors border border-white/20 backdrop-blur-md shadow-xl"
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
            className="relative flex max-h-[90vh] w-[min(92vw,960px)] flex-col overflow-hidden rounded-2xl border border-violet-500/20 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.24em] text-violet-300/70">Markdown Preview</div>
                <div className="truncate text-sm font-semibold text-white">{markdownPreview.title || 'Attachment'}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
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
                    className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
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
                    className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
                  >
                    <Download className="h-3.5 w-3.5" />
                    .txt
                  </button>
                  </div>
                <button
                  type="button"
                  onClick={() => setMarkdownPreview(null)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {markdownPreview.loading ? (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                  Đang tải nội dung...
                </div>
              ) : markdownPreview.error ? (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {markdownPreview.error}
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
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
