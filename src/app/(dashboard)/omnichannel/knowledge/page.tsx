"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Lỗi tải dữ liệu');
  }
  return data;
};

export default function KnowledgeBasePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const { data: documents, error, mutate } = useSWR('/api/crm/knowledge', fetcher, {
    refreshInterval: 3000,
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    try {
      const res = await fetch('/api/crm/knowledge/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || 'Upload thất bại');
      }
      
      mutate(); // Refresh the list
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 h-full">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý Tri thức (Knowledge Base)</h1>
          <p className="text-sm text-gray-500 mt-1">Upload tài liệu (PDF, TXT, DOCX) để huấn luyện AI Bot của bạn.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center border-dashed">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">Kéo thả file vào đây hoặc click để chọn file</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Hỗ trợ PDF, TXT, MD, DOC, DOCX. Tối đa 10MB.</p>
          
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors relative">
            {isUploading ? (
              <span className="flex items-center"><Loader2 className="animate-spin h-4 w-4 mr-2"/> Đang tải lên...</span>
            ) : (
              "Chọn file tải lên"
            )}
            <input 
              type="file" 
              className="hidden" 
            accept=".pdf,.txt,.md,.doc,.docx" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
          
          {uploadError && <p className="text-red-500 text-sm mt-3">{uploadError}</p>}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Tài liệu đã tải lên</h2>
          </div>
          
          {error && <div className="p-6 text-red-500">Lỗi tải danh sách: {error.message}</div>}
          
          {!documents ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400 h-6 w-6"/></div>
          ) : !Array.isArray(documents) || documents.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Chưa có tài liệu nào.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên tài liệu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tải lên</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-sm font-medium text-gray-900">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {doc.status === 'ready' && <><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5" /><span className="text-sm text-green-700">Sẵn sàng</span></>}
                        {doc.status === 'processing' && <><Loader2 className="animate-spin h-4 w-4 text-blue-500 mr-1.5" /><span className="text-sm text-blue-700">Đang xử lý (Chunking)</span></>}
                        {doc.status === 'pending' && <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded-full">Chờ xử lý</span>}
                        {doc.status === 'failed' && <><XCircle className="h-4 w-4 text-red-500 mr-1.5" /><span className="text-sm text-red-700">Lỗi xử lý</span></>}
                      </div>
                      {doc.error_message && <p className="text-xs text-red-500 mt-1">{doc.error_message}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
