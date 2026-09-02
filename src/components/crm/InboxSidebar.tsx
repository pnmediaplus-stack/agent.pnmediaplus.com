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
    return <div className="p-4 flex justify-center text-sm text-gray-500">Đang tải...</div>;
  }
  if (threadsError) {
    return <div className="p-4 flex justify-center text-sm text-red-500">{threadsError}</div>;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-200 bg-white sticky top-0 z-20 flex flex-col gap-2">
          <div className="relative flex items-center">
            <svg className="w-4 h-4 absolute left-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 pb-1 mt-1">
            <button 
              onClick={() => setFilterUnread(!filterUnread)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterUnread ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
              Chưa đọc
            </button>
            <select 
              value={filterTag} 
              onChange={e => setFilterTag(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px] truncate"
            >
              <option value="">Tất cả Thẻ</option>
              {availableTags.map(t => (
                <option key={t.id || t.tag_name} value={t.tag_name}>{t.tag_name}</option>
              ))}
            </select>
            <select 
              value={filterChannel} 
              onChange={e => setFilterChannel(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 text-gray-600 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px] truncate"
            >
              <option value="">Tất cả Kênh</option>
              {uniqueChannels.map(c => (
                <option key={String(c)} value={String(c)}>{String(c)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col flex-1 bg-white overflow-y-auto no-scrollbar">
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
              onClick={() => {
                setActiveThreadId(thread.id);
                if ((thread.unread_count || 0) > 0) {
                  setThreads(threads.map(t => t.id === thread.id ? { ...t, unread_count: 0 } : t));
                  fetch(`/api/crm/threads/${thread.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ unread_count: 0 })
                  }).then(res => {
                    if (!res.ok) throw new Error("Failed to mark as read");
                  }).catch(e => {
                    console.error("Auto-read failed, rolling back", e);
                    const currentThreads = useCrmStore.getState().threads;
                    setThreads(currentThreads.map(t => t.id === thread.id ? { ...t, unread_count: thread.unread_count } : t));
                  });
                }
              }}
              className={`group relative p-4 border-b border-gray-50 cursor-pointer transition-all duration-200 ${
                activeThreadId === thread.id 
                  ? 'bg-blue-50/60 border-l-4 border-l-blue-600' 
                  : 'bg-white border-l-4 border-l-transparent hover:bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="absolute right-2 top-2 z-20" ref={openDropdownId === thread.id ? dropdownRef : null}>
                  <div className="relative">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setOpenDropdownId(openDropdownId === thread.id ? null : thread.id); 
                      }} 
                      className={`p-1 rounded text-gray-500 ${openDropdownId === thread.id ? 'bg-gray-200 block' : 'hover:bg-gray-200 hidden group-hover:block'}`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {openDropdownId === thread.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-100 py-1 z-50">
                        {thread.customer_id && (
                          <>
                            <button onClick={(e) => handleAction('rename', thread, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                              <Edit2 className="w-3.5 h-3.5 mr-2 text-gray-400" /> Đổi tên
                            </button>
                            <button onClick={(e) => handleAction('tag', thread, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                              <Tag className="w-3.5 h-3.5 mr-2 text-gray-400" /> Gắn thẻ
                            </button>
                          </>
                        )}
                        {(thread.unread_count || 0) > 0 ? (
                          <button onClick={(e) => handleAction('read', thread, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                            <MailOpen className="w-3.5 h-3.5 mr-2 text-gray-400" /> Đánh dấu đã đọc
                          </button>
                        ) : (
                          <button onClick={(e) => handleAction('unread', thread, e)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center">
                            <Mail className="w-3.5 h-3.5 mr-2 text-gray-400" /> Đánh dấu chưa đọc
                          </button>
                        )}
                        <button onClick={(e) => handleAction('delete', thread, e)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                          <Trash2 className="w-3.5 h-3.5 mr-2 text-red-400" /> Xóa
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`font-semibold text-sm truncate pr-2 flex items-center gap-2 ${
                  (thread.unread_count || 0) > 0 ? 'font-bold text-gray-900' : (activeThreadId === thread.id ? 'text-blue-900' : 'text-gray-800')
                }`}>
                  {thread.customer?.avatar_url ? (
                    <img src={thread.customer.avatar_url} alt="Avatar" className="w-5 h-5 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold">
                      {thread.customer?.full_name?.charAt(0) || '?'}
                    </div>
                  )}
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
                    <span key={tag} style={{ backgroundColor: getTagColor(tag).bg, color: getTagColor(tag).text, border: `1px solid ${getTagColor(tag).border}` }} className="px-1.5 py-0.5 border text-[10px] rounded-md font-medium">
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

      {/* Tag Modal */}
      {isTagModalOpen && tagModalThread && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Gắn thẻ khách hàng</h3>
              <button onClick={() => setIsTagModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {availableTags.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">Chưa có thẻ nào được cấu hình trên Dashboard.</div>
              ) : (
                <div className="space-y-2">
                  {availableTags.map(tag => (
                    <label key={tag.id || tag.tag_name} className="flex items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
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

                        <span className="text-sm font-medium text-gray-700">{tag.tag_name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsTagModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
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

