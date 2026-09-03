'use client';

import React, { useEffect, useState, useRef } from 'react';
import useSWR from 'swr';
import { useCrmStore } from '@/lib/stores/crmStore';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ChatArea() {
  const { activeThreadId, messages, setMessages, addMessage, threads, upsertThread } = useCrmStore();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEmoji = (e: any) => {
    const sym = e.unified.split("-");
    const codesArray: any[] = [];
    sym.forEach((el: any) => codesArray.push("0x" + el));
    const emoji = String.fromCodePoint(...codesArray);
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const activeThread = threads.find(t => t.id === activeThreadId);
  const threadMessages = activeThreadId ? messages[activeThreadId] || [] : [];

  const { data: fetchedMessages } = useSWR(
    activeThreadId ? `/api/crm/messages?threadId=${activeThreadId}` : null,
    fetcher,
    { refreshInterval: 3000, revalidateOnFocus: true }
  );

  useEffect(() => {
    if (activeThreadId && Array.isArray(fetchedMessages)) {
      // Basic merge/overwrite strategy. In production, consider merging to preserve local 'failed' bubbles
      setMessages(activeThreadId, fetchedMessages);
    }
  }, [activeThreadId, fetchedMessages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId || isSending) return;

    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/crm/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          content: inputText.trim()
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Lỗi gửi tin nhắn');
      }

      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !activeThreadId) return;

    if (fileInputRef.current) fileInputRef.current.value = '';

    setIsUploadingFile(true);
    setErrorMessage(null);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('threadId', activeThreadId);
        formData.append('file', file);

        const res = await fetch('/api/crm/messages/attachment', {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || `Lỗi đính kèm file ${file.name}`);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const toggleHandoff = async () => {
    if (!activeThreadId || !activeThread) return;
    const newStatus = activeThread.status === 'bot_handling' ? 'human_handling' : 'bot_handling';
    setErrorMessage(null);
    try {
      const res = await fetch('/api/crm/threads/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId, status: newStatus })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || 'Không đổi được trạng thái hội thoại');
      }

      upsertThread(await res.json());
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Không đổi được trạng thái hội thoại');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      {/* Header (Gray background) */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between bg-slate-100 dark:bg-slate-900 shadow-xs z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {activeThread?.customer?.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-white leading-tight">{activeThread?.customer?.full_name || 'Đang tải...'}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{activeThread?.channel?.channel_name || 'Livechat Simulator'}</div>
          </div>
        </div>
        <button 
          onClick={toggleHandoff}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full border transition-all shadow-xs ${
            activeThread?.status === 'bot_handling' 
              ? 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
              : 'border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/60'
          }`}
        >
          {activeThread?.status === 'bot_handling' ? (
             <>
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
               </svg>
               Giành quyền Chat
             </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Bật lại AI Bot
            </>
          )}
        </button>
      </div>

      {/* Messages Area (Pure White background) */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-6 custom-scrollbar bg-white dark:bg-slate-950">
        {threadMessages.map(msg => {
          const isCustomer = msg.sender_type === 'customer';
          const isBot = msg.sender_type === 'bot';
          return (
            <div key={msg.id} className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[75%] flex flex-col group">
                <div className={`px-5 py-3 text-[14px] leading-relaxed shadow-2xs ${
                  isCustomer
                    ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tl-sm'
                    : isBot
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 rounded-2xl rounded-tr-sm'
                    : 'bg-blue-600 dark:bg-blue-700 text-white rounded-2xl rounded-tr-sm'
                }`}>
                  {msg.content.split('\n').map((line, i) => {
                    if (line.startsWith('[File đính kèm]:')) {
                      const url = line.replace('[File đính kèm]:', '').trim();
                      const isImg = url.match(/\.(jpeg|jpg|gif|png)(\?|$)/i);
                      return (
                        <React.Fragment key={i}>
                          {isImg ? (
                            <a href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Attachment" className="max-w-full h-auto rounded-lg mt-1 mb-2 max-h-48 object-cover border border-black/10" />
                            </a>
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg text-blue-600 dark:text-blue-300 hover:underline mt-1 mb-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              Xem tệp đính kèm
                            </a>
                          )}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      );
                    }
                    return (
                      <React.Fragment key={i}>
                        {line}
                        {i < msg.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className={`text-[11px] mt-1.5 px-1 font-medium text-slate-400 dark:text-slate-500 ${isCustomer ? 'text-left' : 'text-right'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {!isCustomer && (
                    <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      • {msg.delivery_status === 'sent' || msg.delivery_status === 'delivered' ? 'Đã gửi' : 
                          msg.delivery_status === 'failed' ? 'Lỗi gửi' : 'Đang gửi'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer (Gray background) */}
      <div className="p-4 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 sticky bottom-0">
        {errorMessage && (
          <div className="mb-3 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-2.5 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMessage}
          </div>
        )}
        
        {activeThread?.status === 'bot_handling' ? (
          <div className="w-full text-center py-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 border-dashed rounded-xl flex flex-col items-center justify-center">
             <svg className="w-6 h-6 text-slate-400 dark:text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
             </svg>
             <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">AI đang tự động chăm sóc hội thoại này.</p>
             <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Bấm "Giành quyền Chat" nếu bạn muốn xen vào.</p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-3 pr-2 py-2 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all shadow-sm">
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*,.pdf,.doc,.docx" 
              multiple
            />
            <button 
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
              title="Đính kèm tệp"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingFile}
            >
              {isUploadingFile ? (
                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Nhập tin nhắn..." 
              className="flex-1 bg-transparent resize-none max-h-32 min-h-[24px] outline-none py-2 text-[14px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full"
              disabled={isSending || isUploadingFile}
              rows={1}
              style={{ height: inputText.split('\n').length > 1 ? `${Math.min(inputText.split('\n').length * 24 + 16, 128)}px` : '40px' }}
            />

            <div className="flex items-center gap-1 flex-shrink-0 relative">
              <button 
                type="button"
                className="p-2 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                title="Chọn Emoji"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-14 right-12 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                  <Picker data={data} onEmojiSelect={addEmoji} theme="auto" locale="vi" />
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={isSending || isUploadingFile || !inputText.trim()}
                className="w-10 h-10 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all flex items-center justify-center shadow-sm"
              >
                {isSending ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 translate-x-[-1px] translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
