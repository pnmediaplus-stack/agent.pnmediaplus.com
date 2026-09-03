
'use client';

import React, { useState, useEffect } from 'react';
import { useCrmStore } from '@/lib/stores/crmStore';

export default function CustomerProfile() {
  const { activeThreadId, threads, updateCustomerProfile } = useCrmStore();
  const activeThread = threads.find(t => t.id === activeThreadId);
  const customer = activeThread?.customer;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/crm/tags')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAvailableTags(data);
      })
      .catch(console.error);
  }, []);

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
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        email: customer.email || '',
        phone_number: customer.phone_number || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
      setIsEditing(false);
    }
  }, [customer?.id, customer?.full_name, customer?.email, customer?.phone_number, customer?.address, customer?.notes]);

  if (!customer) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/crm/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, ...formData })
      });
      if (res.ok) {
        updateCustomerProfile(activeThreadId!, formData);
        setIsEditing(false);
      } else {
        alert("Lỗi khi lưu thông tin!");
      }
    } catch (e) {
      alert("Lỗi mạng!");
    }
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100/90 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-center flex-col relative">
        {isEditing && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => {
              setIsEditing(false);
              setFormData({
                full_name: customer.full_name || '',
                email: customer.email || '',
                phone_number: customer.phone_number || '',
                address: customer.address || '',
                notes: customer.notes || ''
              });
            }} disabled={isSaving} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded text-xs font-medium hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50">
              Hủy
            </button>
            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
              {isSaving ? "Đang lưu..." : "Lưu lại"}
            </button>
          </div>
        )}
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 px-3 py-1 rounded text-xs font-medium">
            Sửa
          </button>
        )}
        {customer.avatar_url ? (
          <img src={customer.avatar_url} alt={customer.full_name || 'Avatar'} className="w-16 h-16 rounded-full object-cover mb-2 shadow-sm border border-slate-200 dark:border-slate-700" />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 shadow-sm">
            {customer.full_name?.charAt(0) || '?'}
          </div>
        )}
        <h3 className="font-semibold text-slate-900 dark:text-white">{customer.full_name}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{activeThread?.channel?.channel_name || 'Khách vãng lai'}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 text-sm">
        <div className="flex-1 py-3 text-center font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">Khách hàng</div>
        <div className="flex-1 py-3 text-center text-slate-400 dark:text-slate-500 cursor-not-allowed">Đơn hàng</div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4 text-xs flex-1">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Họ tên</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.full_name : customer.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Chưa có" className={`w-full border rounded-xl px-3 py-2 text-xs transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-2xs'} font-semibold`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Email</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.email : customer.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Chưa có" className={`w-full border rounded-xl px-3 py-2 text-xs transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-2xs'}`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Điện thoại</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.phone_number : customer.phone_number || ''} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="Chưa có" className={`w-full border rounded-xl px-3 py-2 text-xs transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-2xs'}`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Địa chỉ</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.address : customer.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Chưa có" className={`w-full border rounded-xl px-3 py-2 text-xs transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-white' : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-2xs'}`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ghi chú</label>
          <textarea readOnly={!isEditing} value={isEditing ? formData.notes : customer.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Nhập ghi chú..." rows={3} className={`w-full border rounded-xl px-3 py-2 text-xs transition-all ${isEditing ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white dark:bg-slate-800 text-slate-900 dark:text-white' : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 shadow-2xs'} resize-none`} />
        </div>

        {/* Tags Array Display */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Thẻ phân loại (AI Tags)</label>
          <div className="flex flex-wrap gap-2">
            {customer.tags && customer.tags.length > 0 ? (
              customer.tags.map(tag => (
                <span key={tag} style={{ backgroundColor: getTagColor(tag).bg, color: getTagColor(tag).text, border: `1px solid ${getTagColor(tag).border}` }} className="px-2 py-1 text-xs rounded-md border font-medium">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-slate-400 dark:text-slate-500 text-xs italic">Chưa có thẻ</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
