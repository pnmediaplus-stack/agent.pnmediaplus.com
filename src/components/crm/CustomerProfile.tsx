
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
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-center flex-col relative">
        {isEditing && (
          <button onClick={handleSave} disabled={isSaving} className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
            {isSaving ? "Đang lưu..." : "Lưu lại"}
          </button>
        )}
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 px-3 py-1 rounded text-xs font-medium">
            Sửa
          </button>
        )}
        {customer.avatar_url ? (
          <img src={customer.avatar_url} alt={customer.full_name || 'Avatar'} className="w-16 h-16 rounded-full object-cover mb-2 shadow-sm border border-gray-200" />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 shadow-sm">
            {customer.full_name?.charAt(0) || '?'}
          </div>
        )}
        <h3 className="font-semibold text-gray-800">{customer.full_name}</h3>
        <p className="text-xs text-gray-500">{activeThread?.channel?.channel_name || 'Khách vãng lai'}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 text-sm">
        <div className="flex-1 py-3 text-center font-medium text-blue-600 border-b-2 border-blue-600">Khách hàng</div>
        <div className="flex-1 py-3 text-center text-gray-500 cursor-not-allowed">Đơn hàng</div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4 text-sm flex-1 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Họ tên</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.full_name : customer.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Chưa có" className={`w-full border rounded px-2 py-1.5 ${isEditing ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} text-gray-700 font-medium`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.email : customer.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Chưa có" className={`w-full border rounded px-2 py-1.5 ${isEditing ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} text-gray-700`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Điện thoại</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.phone_number : customer.phone_number || ''} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="Chưa có" className={`w-full border rounded px-2 py-1.5 ${isEditing ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} text-gray-700`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Địa chỉ</label>
          <input type="text" readOnly={!isEditing} value={isEditing ? formData.address : customer.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Chưa có" className={`w-full border rounded px-2 py-1.5 ${isEditing ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} text-gray-700`} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Ghi chú</label>
          <textarea readOnly={!isEditing} value={isEditing ? formData.notes : customer.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Nhập ghi chú..." rows={3} className={`w-full border rounded px-2 py-1.5 ${isEditing ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} text-gray-700 resize-none`} />
        </div>

        {/* Tags Array Display */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Thẻ phân loại (AI Tags)</label>
          <div className="flex flex-wrap gap-2">
            {customer.tags && customer.tags.length > 0 ? (
              customer.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md border border-blue-200">
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-xs italic">Chưa có thẻ</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
