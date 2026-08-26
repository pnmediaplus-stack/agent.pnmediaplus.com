'use client';

import React from 'react';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function InboxSidebar() {
  const { threads, activeThreadId, setActiveThreadId, isLoadingThreads, threadsError } = useCrmStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredThreads = normalizedSearch
    ? threads.filter((thread) => {
        const customer = thread.customer;
        return [
          customer?.full_name,
          customer?.phone_number,
          customer?.email,
          thread.channel?.channel_name,
          ...(customer?.tags || [])
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      })
    : threads;

  if (isLoadingThreads) {
    return <div className="p-4 text-center text-sm text-gray-500">Đang tải hội thoại...</div>;
  }

  if (threadsError) {
    return <div className="p-4 text-center text-sm text-red-600">{threadsError}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-white">
      <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Tìm tên, số điện thoại..." 
            className="w-full text-sm border-none bg-gray-100 rounded-full pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-gray-800 placeholder-gray-500"
          />
        </div>
      </div>
      <div className="flex flex-col flex-1 bg-white">
        {filteredThreads.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-sm text-gray-500">
            <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            {threads.length === 0 ? 'Hộp thư trống' : 'Không tìm thấy kết quả'}
          </div>
        ) : (
          filteredThreads.map(thread => (
            <div 
              key={thread.id} 
              onClick={() => setActiveThreadId(thread.id)}
              className={`p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 ${
                activeThreadId === thread.id 
                  ? 'bg-blue-50/60 border-l-4 border-l-blue-600' 
                  : 'bg-white border-l-4 border-l-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`font-semibold text-sm truncate pr-2 flex items-center gap-2 ${
                  (thread.unread_count || 0) > 0 ? 'font-bold text-gray-900' : (activeThreadId === thread.id ? 'text-blue-900' : 'text-gray-800')
                }`}>
                  {thread.customer?.full_name || 'Khách hàng ẩn danh'}
                  {(thread.unread_count || 0) > 0 && (
                    <span className="flex h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </span>
                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                  {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-sm font-medium border ${
                  thread.status === 'bot_handling' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${thread.status === 'bot_handling' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {thread.status === 'bot_handling' ? 'Bot' : 'Human'}
                </span>
                <span className="text-xs text-gray-500 truncate">
                  {thread.channel?.channel_name || 'Kênh hệ thống'}
                </span>
              </div>
              
              {thread.customer?.tags && thread.customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {thread.customer.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 text-[10px] rounded-md font-medium">
                      {tag}
                    </span>
                  ))}
                  {thread.customer.tags.length > 3 && (
                    <span className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-500 text-[10px] rounded-md font-medium">
                      +{thread.customer.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
