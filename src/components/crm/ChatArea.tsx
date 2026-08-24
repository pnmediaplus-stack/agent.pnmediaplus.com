'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function ChatArea() {
  const { activeThreadId, messages, setMessages, addMessage, threads, upsertThread } = useCrmStore();
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const threadMessages = activeThreadId ? messages[activeThreadId] || [] : [];

  useEffect(() => {
    if (activeThreadId && !messages[activeThreadId]) {
      fetch(`/api/crm/messages?threadId=${activeThreadId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMessages(activeThreadId, data);
        })
        .catch(err => console.error("Failed to fetch messages:", err));
    }
  }, [activeThreadId, messages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId || !activeThread) return;
    
    setIsSending(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/crm/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          content: inputText
        })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message || payload?.error || 'Không gửi được tin nhắn');
      }

      const newMessage = await res.json();
      addMessage(newMessage);
      setInputText('');
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Không gửi được tin nhắn');
    } finally {
      setIsSending(false);
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
    <div className="flex flex-col h-full">
      <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between bg-white shadow-sm z-10">
        <div className="font-semibold">{activeThread?.customer?.full_name || 'Đang tải...'}</div>
        <button 
          onClick={toggleHandoff}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${activeThread?.status === 'bot_handling' ? 'border-red-300 text-red-600 bg-red-50 hover:bg-red-100' : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'}`}
        >
          {activeThread?.status === 'bot_handling' ? 'Tắt Bot (Takeover)' : 'Bật lại Bot'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col space-y-4">
        {threadMessages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
              msg.sender_type === 'customer' ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm' :
              msg.sender_type === 'bot' ? 'bg-blue-100 text-blue-900 border border-blue-200 rounded-tr-sm' :
              'bg-blue-600 text-white rounded-tr-sm'
            }`}>
              <div className="mb-1">{msg.content}</div>
              <div className={`text-[10px] text-right mt-1 ${msg.sender_type === 'human' ? 'text-blue-100' : 'text-gray-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.sender_type !== 'customer' && (
                  <span className="ml-1">
                    ({msg.delivery_status === 'sent' || msg.delivery_status === 'delivered' ? 'Đã gửi' : 
                      msg.delivery_status === 'failed' ? 'Lỗi' : 'Đang gửi'})
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 bg-white">
        {errorMessage && (
          <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
        {activeThread?.status === 'bot_handling' ? (
          <div className="w-full text-center p-3 bg-gray-100 text-sm text-gray-500 rounded-md">
            AI đang xử lý hội thoại này. Hãy bấm "Tắt Bot" để giành quyền chat.
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Nhập tin nhắn..." 
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              disabled={isSending}
            />
            <button 
              type="submit" 
              disabled={isSending || !inputText.trim()}
              className="bg-blue-600 text-white rounded-full px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
