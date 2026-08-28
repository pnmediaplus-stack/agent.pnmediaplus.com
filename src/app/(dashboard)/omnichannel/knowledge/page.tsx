"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Trash2, Settings, MessageSquare, Bot , Tag, Plus, X} from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Lỗi tải dữ liệu");
  return data;
};

export default function AIControlCenterPage() {
  const [activeTab, setActiveTab] = useState("knowledge");
  
  return (
    <div className="flex-1 overflow-auto bg-gray-50 h-full flex flex-col">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Trung Tâm Điều Khiển AI</h1>
        <p className="text-sm text-gray-500 mt-1">Cấu hình tri thức, tính cách và chiến dịch chủ động cho trợ lý ảo của bạn.</p>
      </div>

      <div className="px-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setActiveTab("knowledge")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'knowledge' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center"><FileText className="w-4 h-4 mr-2"/> Kho Tri Thức</div>
          </button>
          <button 
            onClick={() => setActiveTab("persona")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'persona' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center"><Bot className="w-4 h-4 mr-2"/> Lệnh Chỉ Đạo (Prompt)</div>
          </button>
          <button 
            onClick={() => setActiveTab("campaigns")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'campaigns' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> Chiến Dịch Chủ Động</div>
          </button>
        
          <button 
            onClick={() => setActiveTab("tags")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center"><Tag className="w-4 h-4 mr-2"/> Quản Lý Thẻ (Tags)</div>
          </button>

          </nav>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {activeTab === "knowledge" && <KnowledgeTab />}
        {activeTab === "persona" && <PersonaTab />}
        {activeTab === "campaigns" && <CampaignsTab />}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 1: KNOWLEDGE BASE
// ----------------------------------------------------
function KnowledgeTab() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: documents, error: docsError, mutate: mutateDocs } = useSWR("/api/crm/knowledge", fetcher, { refreshInterval: 3000 });
  const { data: channels, error: channelsError } = useSWR("/api/crm/channels/prompt", fetcher);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    const failedFiles: File[] = [];
    let errorMessage = "";

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      if (selectedChannelId) {
        formData.append("channel_id", selectedChannelId);
      }

      try {
        const res = await fetch("/api/crm/knowledge/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Tải lên ${file.name} thất bại`);
        }
      } catch (err: any) {
        errorMessage += (errorMessage ? "\n" : "") + err.message;
        failedFiles.push(file);
      }
    }

    if (errorMessage) setUploadError(errorMessage);
    setSelectedFiles(failedFiles);
    mutateDocs();
    setIsUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa tài liệu này?")) return;
    try {
      const res = await fetch(`/api/crm/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      mutateDocs();
      setSelectedDocumentIds(prev => prev.filter(docId => docId !== id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocumentIds.length === 0) return;
    if (!confirm(`Xóa ${selectedDocumentIds.length} tài liệu đã chọn?`)) return;
    
    setIsDeleting(true);
    let errorCount = 0;
    
    for (const id of selectedDocumentIds) {
      try {
        const res = await fetch(`/api/crm/knowledge/${id}`, { method: "DELETE" });
        if (!res.ok) errorCount++;
      } catch (e) {
        errorCount++;
      }
    }
    
    if (errorCount > 0) alert(`Có lỗi khi xóa ${errorCount} tài liệu. Vui lòng thử lại.`);
    setSelectedDocumentIds([]);
    mutateDocs();
    setIsDeleting(false);
  };

  const toggleSelectAll = () => {
    if (!documents) return;
    if (selectedDocumentIds.length === documents.length) {
      setSelectedDocumentIds([]);
    } else {
      setSelectedDocumentIds(documents.map((d: any) => d.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedDocumentIds(prev => 
      prev.includes(id) ? prev.filter(docId => docId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Upload Box */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center border-dashed">
        <div className="w-full max-w-lg mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi tài liệu (Scope)</label>
          <select 
            className="w-full bg-white text-gray-900 border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border"
            value={selectedChannelId || ""}
            onChange={(e) => setSelectedChannelId(e.target.value || null)}
          >
            <option value="">Tài liệu dùng chung (Tất cả Page)</option>
            {channels && channels.map((c: any) => (
              <option key={c.id} value={c.id}>Tài liệu riêng: {c.channel_name}</option>
            ))}
          </select>
        </div>

        <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Kéo thả file vào đây hoặc click để chọn file</p>
        <p className="text-xs text-gray-500 mt-1 mb-4">Hỗ trợ PDF, TXT, MD, DOC, DOCX. Tối đa 10MB.</p>
        
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors relative">
          Chọn file tải lên
          <input type="file" multiple className="hidden" accept=".pdf,.txt,.md,.doc,.docx" onChange={handleFileChange} disabled={isUploading}/>
        </label>
        
        {selectedFiles.length > 0 && (
          <div className="w-full max-w-lg mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Đã chọn ({selectedFiles.length} file)</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((f, i) => (
                <li key={i} className="flex justify-between items-center text-sm text-gray-600 bg-white p-2.5 rounded border border-gray-200">
                  <span className="truncate flex-1 pr-4">{f.name}</span>
                  <button onClick={() => removeSelectedFile(i)} className="text-red-500 hover:text-red-700" disabled={isUploading}>
                    <XCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button onClick={handleUpload} disabled={isUploading} className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
                {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                {isUploading ? "Đang tải lên..." : "Xác nhận tải lên"}
              </button>
            </div>
          </div>
        )}
        {uploadError && <p className="text-red-500 text-sm mt-4 whitespace-pre-line text-center">{uploadError}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Tài liệu đã tải lên</h2>
          {selectedDocumentIds.length > 0 && (
            <button 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors"
            >
              {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Xóa {selectedDocumentIds.length} mục đã chọn
            </button>
          )}
        </div>
        {docsError && <div className="p-6 text-red-500">Lỗi tải danh sách: {docsError.message}</div>}
        {!documents ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400 h-6 w-6"/></div>
        ) : !Array.isArray(documents) || documents.length === 0 ? (
          <div className="p-10 text-center text-gray-500">Chưa có tài liệu nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto"
                      checked={documents.length > 0 && selectedDocumentIds.length === documents.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên tài liệu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phạm vi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tải lên</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto"
                        checked={selectedDocumentIds.includes(doc.id)}
                        onChange={() => toggleSelectOne(doc.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><FileText className="h-5 w-5 text-gray-400 mr-3" /><span className="text-sm font-medium text-gray-900">{doc.title}</span></div></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center whitespace-nowrap">
                        {doc.status === "ready" || !doc.status ? <><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5" /><span className="text-sm text-green-700">Đã xử lý xong</span></> : null}
                        {doc.status === "processing" && <><Loader2 className="animate-spin h-4 w-4 text-blue-500 mr-1.5" /><span className="text-sm text-blue-700">Đang học (Chunking)</span></>}
                        {doc.status === "pending" && <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded-full">Chờ xử lý</span>}
                        {doc.status === "failed" && <><XCircle className="h-4 w-4 text-red-500 mr-1.5" /><span className="text-sm text-red-700">Lỗi xử lý</span></>}
                      </div>
                      {doc.error_message && <p className="text-xs text-red-500 mt-2 break-words whitespace-normal max-w-md">{doc.error_message}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.channel_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Tài liệu riêng biệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Tài liệu dùng chung
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.created_at).toLocaleString("vi-VN")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 2: PERSONA / PROMPT
// ----------------------------------------------------
function PersonaTab() {
  const { data: channels, error, mutate } = useSWR("/api/crm/channels/prompt", fetcher);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [prompt, setPrompt] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (channels && channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0]);
      setPrompt(channels[0].bot_system_prompt || "");
    }
  }, [channels, selectedChannel]);

  const handleSave = async () => {
    if (!selectedChannel) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/crm/channels/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel_id: selectedChannel.id, bot_system_prompt: prompt })
      });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d.error || "Lưu thất bại");
      }
      alert("Đã lưu Master Prompt thành công!");
      mutate();
    } catch (e: any) {
      alert(e.message);
    }
    setIsSaving(false);
  };

  if (error) return <div className="p-4 text-red-500">Lỗi tải dữ liệu kênh: {error.message}</div>;
  if (!channels) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400 h-6 w-6"/></div>;
  if (channels.length === 0) return <div className="p-6 text-gray-500">Chưa có kênh nào được kết nối.</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Chọn kênh để cấu hình</label>
        <select 
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedChannel?.id || ""}
          onChange={(e) => {
            const ch = channels.find((c: any) => c.id === e.target.value);
            setSelectedChannel(ch);
            setPrompt(ch?.bot_system_prompt || "");
          }}
        >
          {channels.map((ch: any) => (
            <option key={ch.id} value={ch.id}>{ch.channel_name} (ID: {ch.id})</option>
          ))}
        </select>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Bản thiết kế nhân cách (Master System Prompt)</label>
        <p className="text-xs text-gray-500 mb-3">Nhập các chỉ thị cứng cho AI (Ví dụ: Tone giọng, cách tư vấn, quy tắc trả lời). Prompt này sẽ tự động được gửi kèm cho n8n mỗi khi khách hàng nhắn tin.</p>
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-96 border border-gray-300 rounded-lg p-4 text-sm text-gray-900 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nhập prompt tại đây..."
        />
      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center"
      >
        {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Settings className="h-4 w-4 mr-2"/>}
        {isSaving ? "Đang lưu..." : "Lưu cấu hình AI"}
      </button>
    </div>
  );
}

// ----------------------------------------------------
// TAB 3: CAMPAIGNS
// ----------------------------------------------------
function CampaignsTab() {
  const { data: channels, error: channelsError } = useSWR('/api/crm/channels/prompt', fetcher);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [hours, setHours] = useState(24);
  const [prompt, setPrompt] = useState('');

  // Lấy danh sách chiến dịch khi chọn kênh
  useEffect(() => {
    if (selectedChannel) {
      setIsLoading(true);
      fetch(`/api/crm/campaigns?channel_id=${selectedChannel}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            console.error('Fetch campaigns error:', data);
            return [];
          }
          return data;
        })
        .then(data => {
          setCampaigns(Array.isArray(data) ? data : []);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setIsLoading(false);
        });
    } else {
      setCampaigns([]);
    }
  }, [selectedChannel]);

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setName(c.name);
    setIsActive(c.is_active);
    setHours(c.condition_hours_inactive);
    setPrompt(c.system_prompt_override);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setIsActive(false);
    setHours(24);
    setPrompt('');
  };

  const handleSave = async () => {
    if (!selectedChannel || !name || !prompt) return alert('Vui lòng nhập đầy đủ Tên và Prompt');
    setIsSaving(true);

    const payload = {
      id: editingId,
      channel_id: selectedChannel,
      name,
      is_active: isActive,
      condition_hours_inactive: hours,
      system_prompt_override: prompt
    };

    const method = editingId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch('/api/crm/campaigns', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        let newData = [...campaigns];
        if (editingId) {
          newData = newData.map(c => c.id === editingId ? saved : c);
        } else {
          newData = [saved, ...newData];
        }
        setCampaigns(newData);
        handleCancelEdit();
      } else {
        const errData = await res.json().catch(() => null);
        alert(`Lỗi lưu chiến dịch: ${errData?.error || res.statusText} - ${errData?.details || ''}`);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa chiến dịch này?')) return;
    try {
      await fetch(`/api/crm/campaigns?id=${id}`, { method: 'DELETE' });
      setCampaigns(campaigns.filter(c => c.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/crm/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      if (res.ok) {
        setCampaigns(campaigns.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quản lý Chiến Dịch Chủ Động</h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Chọn kênh áp dụng</label>
          <select 
            className="w-full bg-white text-gray-900 border border-gray-300 px-3 py-2 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={selectedChannel}
            onChange={(e) => {
              setSelectedChannel(e.target.value);
              handleCancelEdit();
            }}
          >
            <option value="">-- Chọn kênh --</option>
            {channels?.map((ch: any) => (
              <option key={ch.id} value={ch.id}>{ch.channel_name}</option>
            ))}
          </select>
        </div>

        {selectedChannel && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">{editingId ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tên chiến dịch</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white text-gray-900 px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500" placeholder="VD: Hỏi thăm sau 24h" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thời gian chờ (Giờ)</label>
                  <div className="flex items-center space-x-2">
                    <input type="range" min="1" max="168" value={hours} onChange={e => setHours(parseInt(e.target.value))} className="w-full accent-blue-600 bg-white" />
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{hours}h</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Gửi tin nếu khách không chat sau {hours} giờ.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">System Prompt</label>
                  <textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-white text-gray-900 px-3 py-2 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-blue-500" placeholder="Ép AI nói gì? VD: Bạn hãy tặng khách mã giảm giá 10%..." />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto bg-white border-gray-300 rounded" />
                  <label className="ml-2 text-sm text-gray-700">Kích hoạt ngay</label>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {isSaving ? 'Đang lưu...' : 'Lưu chiến dịch'}
                  </button>
                  {editingId && (
                    <button onClick={handleCancelEdit} className="px-3 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300">
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
              ) : campaigns.length === 0 ? (
                <div className="text-center p-10 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 text-sm">
                  Chưa có chiến dịch nào cho kênh này.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`p-4 border rounded-lg flex items-start justify-between ${c.is_active ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-medium text-gray-900">{c.name}</h5>
                          {c.is_active ? (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">Đang chạy</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">Tạm dừng</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">Chờ: <span className="font-semibold">{c.condition_hours_inactive} giờ</span></p>
                        <p className="text-xs text-gray-500 line-clamp-2 italic border-l-2 border-gray-300 pl-2">{c.system_prompt_override}</p>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button onClick={() => toggleActive(c.id, c.is_active)} className={`px-3 py-1 rounded text-xs font-medium border ${c.is_active ? 'border-orange-300 text-orange-600 hover:bg-orange-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}>
                          {c.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button onClick={() => handleEdit(c)} className="px-3 py-1 rounded text-xs font-medium border border-blue-300 text-blue-600 hover:bg-blue-50">Sửa</button>
                        <button onClick={() => handleDelete(c.id)} className="px-3 py-1 rounded text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50">Xóa</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



// ----------------------------------------------------
// TAB 4: TAGS
// ----------------------------------------------------
function TagsTab() {
  const { data: tags, error, mutate } = useSWR('/api/crm/tags', fetcher);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#3B82F6');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/crm/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: tagName, color: tagColor })
      });
      if (res.ok) {
        setTagName('');
        mutate();
      } else {
        const err = await res.json();
        alert('Lỗi: ' + err.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa thẻ này? AI sẽ không thể dùng thẻ này nữa.')) return;
    try {
      await fetch(`/api/crm/tags?id=${id}`, { method: 'DELETE' });
      mutate();
    } catch (error) {
      console.error(error);
    }
  };

  if (error) return <div className="text-red-500">Lỗi tải danh sách thẻ</div>;
  if (!tags) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gray-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Danh Sách Thẻ Của AI</h3>
        <p className="text-sm text-gray-500 mb-6">Đây là các thẻ (Tags) hợp lệ mà Trợ lý AI có thể tự động gán cho khách hàng trong quá trình trò chuyện (VD: VIP, Spam, Khách sỉ...).</p>
        
        <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên Thẻ (Tag Name)</label>
            <input type="text" value={tagName} onChange={e => setTagName(e.target.value)} placeholder="VD: Khách sỉ" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 bg-white" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Màu sắc</label>
            <input type="color" value={tagColor} onChange={e => setTagColor(e.target.value)} className="h-9 w-14 cursor-pointer bg-white border border-gray-300 rounded-lg p-1" />
          </div>
          <button type="submit" disabled={isAdding || !tagName.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center h-9">
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Thêm Thẻ</>}
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          {tags.length === 0 ? (
            <div className="text-gray-500 text-sm italic w-full text-center py-6">Chưa có thẻ nào được tạo.</div>
          ) : (
            tags.map((tag: any) => (
              <div key={tag.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium shadow-sm transition-all bg-white hover:bg-gray-50" style={{ borderColor: tag.color + '40', color: tag.color }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                {tag.tag_name}
                <button onClick={() => handleDelete(tag.id)} className="ml-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
