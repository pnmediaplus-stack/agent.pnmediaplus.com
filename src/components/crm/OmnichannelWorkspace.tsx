'use client';

import React, { useEffect } from 'react';
import useSWR from 'swr';
import InboxSidebar from './InboxSidebar';
import ChatArea from './ChatArea';
import CustomerProfile from './CustomerProfile';
import { useCrmStore } from '@/lib/stores/crmStore';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error('Không tải được dữ liệu');
  return r.json();
});

export default function OmnichannelWorkspace() {
  const { setThreads, setThreadsError, activeThreadId } = useCrmStore();

  const { data, error } = useSWR('/api/crm/threads', fetcher, {
    refreshInterval: 3000, // Near realtime polling every 3s
    revalidateOnFocus: true
  });

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setThreads(data);
    }
    if (error) {
      setThreadsError(error.message);
    }
  }, [data, error, setThreads, setThreadsError]);

  return (
    <div className="flex h-[calc(100vh-110px)] min-h-[640px] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden shadow-xl rounded-2xl border border-slate-200/80 dark:border-slate-800">
      {/* Left Sidebar - Chat & Threads List */}
      <div className="w-80 sm:w-84 min-w-[300px] max-w-[340px] shrink-0 border-r-2 border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-900/90 flex flex-col z-10 shadow-sm">
        <InboxSidebar />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-white dark:bg-slate-950 z-0">
        {activeThreadId ? (
          <ChatArea />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400 shadow-inner">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Omnichannel CRM Inbox</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">Chọn một cuộc hội thoại từ danh sách bên trái để tiếp nhận tin nhắn và tư vấn trực tiếp.</p>
          </div>
        )}
      </div>

      {/* Right Sidebar - Customer Profile */}
      {activeThreadId && (
        <div className="w-80 sm:w-84 shrink-0 border-l-2 border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-900/90 overflow-y-auto no-scrollbar z-10 shadow-sm">
          <CustomerProfile />
        </div>
      )}
    </div>
  );
}
