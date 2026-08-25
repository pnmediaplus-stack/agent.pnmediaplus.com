"use client";

import React, { useState, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { Send, Bot, User, Settings2 } from 'lucide-react';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Lỗi tải dữ liệu');
  return res.json();
};

export default function SimulatorPage() {
  const [message, setMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('https://n8n.pnmediaplus.com/webhook-test/omnichannel-cskh');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showConfig, setShowConfig] = useState(false);

  const { data: messages, error } = useSWR(
    '/api/internal/simulator/messages?threadId=33333333-3333-4333-8333-333333333333',
    fetcher,
    { refreshInterval: 2000 }
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;
    
    setIsSending(true);
    const txt = message;
    setMessage('');

    try {
      const res = await fetch('/api/internal/simulator/trigger-n8n', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: txt, n8nWebhookUrl: webhookUrl })
      });
      if (!res.ok) {
        alert('Lỗi: ' + await res.text());
      }
    } catch (err: any) {
      alert('Lỗi gửi tin: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 flex items-center">
            <Bot className="w-6 h-6 mr-2 text-blue-600" />
            Livechat Simulator (Test Bot)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Đóng vai khách hàng chat với AI Agent</p>
        </div>
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Cấu hình Webhook"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>

      {showConfig && (
        <div className="bg-white p-4 border-b border-gray-200 shadow-inner">
          <label className="block text-sm font-medium text-gray-700 mb-1">n8n Test Webhook URL</label>
          <input 
            type="text" 
            value={webhookUrl}
            onChange={(e: any) => setWebhookUrl(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
            placeholder="http://localhost:5678/webhook-test/..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Mở n8n, click "Test Workflow", copy URL dán vào đây để xem bot chạy live.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
        <div className="text-center text-xs text-gray-400 my-4">Bắt đầu phiên Chat giả lập</div>
        
        {error && <div className="text-center text-red-500 text-sm">Lỗi tải tin nhắn: {error.message}</div>}
        
        {messages?.map((msg: any) => {
          const isBot = msg.sender_type === 'bot' || msg.sender_type === 'human';
          return (
            <div key={msg.id} className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`flex items-end max-w-[70%] ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isBot ? 'bg-blue-100 text-blue-600 mr-2' : 'bg-gray-200 text-gray-600 ml-2'}`}>
                  {isBot ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${isBot ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-none' : 'bg-blue-600 text-white rounded-br-none'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        {isSending && (
          <div className="flex justify-end">
            <div className="px-4 py-2 rounded-2xl text-sm bg-blue-600 text-white rounded-br-none opacity-50">
              Đang gửi...
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center relative">
          <input
            type="text"
            value={message}
            onChange={(e: any) => setMessage(e.target.value)}
            disabled={isSending}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border border-gray-300 rounded-full pl-6 pr-14 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
          />
          <button 
            type="submit" 
            disabled={!message.trim() || isSending}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
