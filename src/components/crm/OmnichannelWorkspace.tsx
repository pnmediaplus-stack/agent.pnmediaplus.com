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
    <div className="flex min-h-[600px] h-[calc(100vh-15rem)] w-full overflow-hidden bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
      <div className="w-1/4 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
        <InboxSidebar />
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {activeThreadId ? (
          <ChatArea />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-gray-400 bg-gray-50/30">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Chọn một cuộc hội thoại để bắt đầu</p>
          </div>
        )}
      </div>

      {activeThreadId && (
        <div className="w-1/4 border-l border-gray-200 bg-gray-50/50 overflow-y-auto">
          <CustomerProfile />
        </div>
      )}
    </div>
  );
}
