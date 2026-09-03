'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, Edit2, Trash2, Mail, MailOpen, Tag, X } from 'lucide-react';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function InboxSidebar() {
  const { threads, activeThreadId, setActiveThreadId, isLoadingThreads, threadsError, setThreads, updateCustomerProfile } = useCrmStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterTag, setFilterTag] = React.useState('');
  const [filterChannel, setFilterChannel] = React.useState('');
  const [filterUnread, setFilterUnread] = React.useState(false);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [tagModalThread, setTagModalThread] = useState<any>(null);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSavingTags, setIsSavingTags] = useState(false);

  const getTagColor = (tagName: string) => {
    const tag = availableTags.find(t => t.tag_name === tagName);
    const colorStr = tag?.color || '#3b82f6';
    try {
      if (colorStr.startsWith('{')) return JSON.parse(colorStr);
    } catch (e) {}
    return { bg: colorStr, text: '#ffffff', border: colorStr };
  };
  const getContrastColor = (hexcolor: string) => {
    hexcolor = hexcolor.replace("#", "");
    if (hexcolor.length === 3) hexcolor = hexcolor.split("").map(c => c + c).join("");
    const r = parseInt(hexcolor.substr(0,2),16) || 0;
    const g = parseInt(hexcolor.substr(2,2),16) || 0;
    const b = parseInt(hexcolor.substr(4,2),16) || 0;
    const yiq = ((r*299)+(g*587)+(b*114))/1000;
    return (yiq >= 128) ? '#1f2937' : '#ffffff'; // gray-800 or white
  };



  useEffect(() => {
    fetch('/api/crm/tags')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableTags(data);
      })
      .catch(console.error);
  }, []);


  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (action: string, thread: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenDropdownId(null);
    if (action === 'tag') {
      setTagModalThread(thread);
      setSelectedTags(thread.customer?.tags || []);
      setIsTagModalOpen(true);
    } else if (action === 'rename') {
      const newName = window.prompt("Nhập tên hiển thị mới:", thread.customer?.full_name || "");
      if (newName !== null && newName.trim() !== "") {
        await fetch("/api/crm/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: thread.customer_id, full_name: newName })
        });
        updateCustomerProfile(thread.id, { full_name: newName });
      }
    } else if (action === 'handoff') {
      await fetch("/api/crm/threads/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id, status: 'human_handling' })
      });
      setThreads(threads.map(t => t.id === thread.id ? { ...t, status: 'human_handling' } : t));
    } else if (action === 'delete') {
      if (window.confirm("Bạn có chắc chắn muốn xóa cuộc hội thoại này?")) {
        await fetch(`/api/crm/threads/${thread.id}`, { method: "DELETE" });
        setThreads(threads.filter(t => t.id !== thread.id));
        if (activeThreadId === thread.id) setActiveThreadId(null);
      }
    } else if (action === 'unread' || action === 'read') {
      const newUnreadCount = action === 'unread' ? 1 : 0;
      await fetch(`/api/crm/threads/${thread.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unread_count: newUnreadCount })
      });
      setThreads(threads.map(t => t.id === thread.id ? { ...t, unread_count: newUnreadCount } : t));
    }
  };

  const uniqueChannels = Array.from(new Set(threads.map(t => t.channel?.channel_name).filter(Boolean)));
  const normalizedSearch = searchTerm.trim().toLowerCase();
  
  const filteredThreads = threads.filter((thread) => {
    // 1. Search text
    if (normalizedSearch) {
      const customer = thread.customer;
      const match = [
        customer?.full_name,
        customer?.phone_number,
        customer?.email,
        thread.channel?.channel_name,
        ...(customer?.tags || [])
      ].filter(Boolean).some((val) => String(val).toLowerCase().includes(normalizedSearch));
      if (!match) return false;
    }
    
    // 2. Filter Unread
    if (filterUnread && !(thread.unread_count > 0)) return false;
    
    // 3. Filter Tag
    if (filterTag) {
      if (!thread.customer?.tags || !thread.customer.tags.includes(filterTag)) return false;
    }
    
    // 4. Filter Channel
    if (filterChannel && thread.channel?.channel_name !== filterChannel) return false;
    
    return true;
  });

  if (isLoadingThreads) {
    return <div className="p-4 flex justify-center text-sm text-slate-500 dark:text-slate-400">Đang tải...</div>;
  }
  if (threadsError) {
    return <div className="p-4 flex justify-center text-sm text-red-500">{threadsError}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-100/60 dark:bg-slate-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Search & Filter */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20 flex flex-col gap-2.5 shadow-xs">
          {/* Search Input */}
          <div className="relative flex items-center">
            <svg className="w-4 h-4 absolute left-3 text-slate-400 dark:text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm tên, SĐT, tag..."
              className="w-full text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 shadow-xs transition-all font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Single-Line 3-Column Equal Filter Bar (Elevated Controls) */}
          <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-xs w-full">
            {/* Unread Filter Button */}
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={`w-full py-1.5 px-1.5 text-[11px] font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 truncate shadow-xs ${
                filterUnread
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80'
              }`}
              title={filterUnread ? "Hiển thị tất cả" : "Chỉ xem chưa đọc"}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${filterUnread ? 'bg-white' : 'bg-blue-500'}`}></span>
              <span className="truncate">Chưa đọc</span>
            </button>

            {/* Tag Select */}
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className={`w-full text-[11px] font-semibold border rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate text-center shadow-xs ${
                filterTag
                  ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white dark:border-blue-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
              }`}
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Thẻ</option>
              {availableTags.map(t => (
                <option key={t.id || t.tag_name} value={t.tag_name} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{t.tag_name}</option>
              ))}
            </select>

            {/* Channel Select */}
            <select
              value={filterChannel}
              onChange={e => setFilterChannel(e.target.value)}
              className={`w-full text-[11px] font-semibold border rounded-lg px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer truncate text-center shadow-xs ${
                filterChannel
                  ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-600 dark:text-white dark:border-blue-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/80'
              }`}
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">Kênh</option>
              {uniqueChannels.map(c => (
                <option key={String(c)} value={String(c)} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">{String(c)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Thread List Area */}
        <div className="flex flex-col flex-1 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar py-2">
        {filteredThreads.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center text-xs text-slate-500 dark:text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            {threads.length === 0 ? 'Hộp thư trống' : 'Không tìm thấy cuộc hội thoại nào'}
          </div>
        ) : (
          filteredThreads.map(thread => {
            const isActive = activeThreadId === thread.id;
            const isUnread = (thread.unread_count || 0) > 0;

            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id);
                  if (isUnread) {
                    setThreads(threads.map(t => t.id === thread.id ? { ...t, unread_count: 0 } : t));
                    fetch(`/api/crm/threads/${thread.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ unread_count: 0 })
                    }).catch(e => {
                      console.error("Auto-read failed", e);
                    });
                  }
                }}
                className={`group relative mx-2 my-1 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500/40 dark:border-blue-500/50 shadow-md ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Left Active Accent Pill */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 dark:bg-blue-500 rounded-r-full"></span>
                )}

                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  {thread.customer?.avatar_url ? (
                    <img src={thread.customer.avatar_url} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-slate-200/80 dark:border-slate-700 shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm border border-white/20">
                      {thread.customer?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className={`text-xs font-semibold truncate ${
                        isUnread ? 'text-slate-900 dark:text-white font-bold' : (isActive ? 'text-blue-900 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200')
                      }`}>
                        {thread.customer?.full_name || 'Khách hàng ẩn danh'}
                      </h4>

                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                        {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Subtitle & Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {/* Bot/Human Status Pill */}
                      <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-semibold border ${
                        thread.status === 'bot_handling'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${thread.status === 'bot_handling' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        {thread.status === 'bot_handling' ? 'Bot' : 'Human'}
                      </span>

                      {/* Channel Name */}
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[120px]">
                        {thread.channel?.channel_name || 'Kênh hệ thống'}
                      </span>

                      {/* Unread Badge */}
                      {isUnread && (
                        <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full shadow-sm">
                          {thread.unread_count}
                        </span>
                      )}
                    </div>

                    {/* Customer Tag Badges */}
                    {thread.customer?.tags && thread.customer.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {thread.customer.tags.slice(0, 3).map(tag => (
                          <span key={tag} style={{ backgroundColor: getTagColor(tag).bg, color: getTagColor(tag).text, border: `1px solid ${getTagColor(tag).border}` }} className="px-1.5 py-0.5 text-[9px] rounded font-semibold shadow-2xs">
                            {tag}
                          </span>
                        ))}
                        {thread.customer.tags.length > 3 && (
                          <span className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-[9px] rounded font-semibold">
                            +{thread.customer.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dropdown Menu Trigger */}
                  <div className="relative shrink-0" ref={openDropdownId === thread.id ? dropdownRef : null}>
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(openDropdownId === thread.id ? null : thread.id); 
                      }} 
                      className={`p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ${
                        openDropdownId === thread.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {openDropdownId === thread.id && (
                      <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                        {thread.customer_id && (
                          <>
                            <button onClick={(e) => handleAction('rename', thread, e)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                              <Edit2 className="w-3.5 h-3.5 text-slate-400" /> Đổi tên
                            </button>
                            <button onClick={(e) => handleAction('tag', thread, e)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-slate-400" /> Gắn thẻ
                            </button>
                          </>
                        )}
                        {isUnread ? (
                          <button onClick={(e) => handleAction('read', thread, e)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                            <MailOpen className="w-3.5 h-3.5 text-slate-400" /> Đánh dấu đã đọc
                          </button>
                        ) : (
                          <button onClick={(e) => handleAction('unread', thread, e)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" /> Đánh dấu chưa đọc
                          </button>
                        )}
                        <button onClick={(e) => handleAction('delete', thread, e)} className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Xóa cuộc chat
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>

      {/* Tag Modal */}
      {isTagModalOpen && tagModalThread && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-semibold text-slate-800 dark:text-white">Gắn thẻ khách hàng</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {availableTags.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Chưa có thẻ nào được cấu hình trên Dashboard.</div>
              ) : (
                <div className="space-y-2">
                  {availableTags.map(tag => (
                    <label key={tag.id || tag.tag_name} className="flex items-center p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        checked={selectedTags.includes(tag.tag_name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTags([...selectedTags, tag.tag_name]);
                          } else {
                            setSelectedTags(selectedTags.filter(t => t !== tag.tag_name));
                          }
                        }}
                      />
                      <div className="ml-3 flex items-center gap-2">
                        
                        {(() => {
                          let c = { bg: tag.color || '#3b82f6', text: '#fff', border: tag.color || '#3b82f6' };
                          try { if (tag.color?.startsWith('{')) c = JSON.parse(tag.color); } catch(e){}
                          return <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}></span>;
                        })()}

                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{tag.tag_name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-2">
              <button onClick={() => setIsTagModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700">
                Hủy
              </button>
              <button 
                disabled={isSavingTags}
                onClick={async () => {
                  setIsSavingTags(true);
                  try {
                    const res = await fetch("/api/crm/customers", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: tagModalThread.customer_id, tags: selectedTags })
                    });
                    if (!res.ok) throw new Error("Save failed");
                    updateCustomerProfile(tagModalThread.id, { tags: selectedTags });
                    setIsTagModalOpen(false);
                  } catch (e) {
                    alert("Lỗi khi lưu thẻ!");
                  } finally {
                    setIsSavingTags(false);
                  }
                }} 
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingTags ? "Đang lưu..." : "Lưu lại"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
