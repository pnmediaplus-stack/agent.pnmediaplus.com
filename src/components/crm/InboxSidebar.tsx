'use client';

import React from 'react';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function InboxSidebar() {
  const { threads, activeThreadId, setActiveThreadId, isLoadingThreads } = useCrmStore();

  if (isLoadingThreads) {
    return <div className="p-4 text-center text-sm text-gray-500">Đang tải hội thoại...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-3 border-b border-gray-200 bg-white sticky top-0">
        <input 
          type="text" 
          placeholder="Tìm tên, số điện thoại..." 
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500"
        />
      </div>
      <div className="flex flex-col">
        {threads.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">Chưa có hội thoại nào</div>
        ) : (
          threads.map(thread => (
            <div 
              key={thread.id} 
              onClick={() => setActiveThreadId(thread.id)}
              className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors ${activeThreadId === thread.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm truncate">
                  {thread.customer?.full_name || 'Khách hàng'}
                </span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate mb-1">
                {thread.status === 'bot_handling' ? '🤖 Bot đang xử lý' : '👤 Nhân sự đang xử lý'}
              </div>
              
              {/* Tags */}
              {thread.customer?.tags && thread.customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {thread.customer.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
