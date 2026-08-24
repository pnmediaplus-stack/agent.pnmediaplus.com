'use client';

import React, { useEffect } from 'react';
import InboxSidebar from './InboxSidebar';
import ChatArea from './ChatArea';
import CustomerProfile from './CustomerProfile';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function OmnichannelWorkspace() {
  const { setThreads, activeThreadId } = useCrmStore();

  useEffect(() => {
    // Initial Fetch of Inbox
    fetch('/api/crm/threads')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setThreads(data);
      })
      .catch(err => console.error("Failed to fetch threads:", err));
    
    // In a full implementation, Supabase Realtime Subscription goes here
  }, [setThreads]);

  return (
    <div className="flex h-full w-full overflow-hidden border-t border-gray-200">
      {/* Cột 1: Inbox List */}
      <div className="w-1/4 border-r border-gray-200 bg-gray-50 flex flex-col">
        <InboxSidebar />
      </div>

      {/* Cột 2: Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeThreadId ? (
          <ChatArea />
        ) : (
          <div className="flex flex-1 items-center justify-center text-gray-500">
            Bạn vui lòng chọn một hội thoại để thao tác.
          </div>
        )}
      </div>

      {/* Cột 3: Customer Profile */}
      {activeThreadId && (
        <div className="w-1/4 border-l border-gray-200 bg-gray-50 overflow-y-auto">
          <CustomerProfile />
        </div>
      )}
    </div>
  );
}
