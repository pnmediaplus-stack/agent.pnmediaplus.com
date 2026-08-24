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
    <div className="flex h-full w-full overflow-hidden border-t border-gray-200">
      <div className="w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col">
        <InboxSidebar />
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {activeThreadId ? (
          <ChatArea />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Bạn vui lòng chọn một hội thoại để thao tác.
          </div>
        )}
      </div>

      {activeThreadId && (
        <div className="w-1/4 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <CustomerProfile />
        </div>
      )}
    </div>
  );
}
