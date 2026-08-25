"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || "Lỗi tải dữ liệu");
  }
  return data;
};

export default function KnowledgeBasePage() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const { data: documents, error, mutate } = useSWR("/api/crm/knowledge", fetcher, {
    refreshInterval: 3000,
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tài liệu này? Các dữ liệu đã phân tích cũng sẽ bị xóa.")) return;
    try {
      const res = await fetch(`/api/crm/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Xóa thất bại");
      mutate();
    } catch (err) {
      alert("Lỗi: " + (err as Error).message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
    e.target.value = ""; // reset input
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

      try {
        const res = await fetch("/api/crm/knowledge/upload", {
          method: "POST",
          body: formData
        });
        
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Tải lên ${file.name} thất bại`);
        }
      } catch (err: any) {
        errorMessage += (errorMessage ? "\n" : "") + err.message;
        failedFiles.push(file);
      }
    }

    if (errorMessage) {
      setUploadError(errorMessage);
    }
    
    setSelectedFiles(failedFiles);
    mutate();
    setIsUploading(false);
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 h-full">
      <div className="w-full space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quản lý Tri thức (Knowledge Base)</h1>
          <p className="text-sm text-gray-500 mt-1">Upload tài liệu (PDF, TXT, DOCX) để huấn luyện AI Bot của bạn.</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center border-dashed">
          <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">Kéo thả file vào đây hoặc click để chọn file</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Hỗ trợ PDF, TXT, MD, DOC, DOCX. Tối đa 10MB.</p>
          
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors relative">
            Chon file tải lên
            <input 
              type="file" 
              multiple
              className="hidden" 
              accept=".pdf,.txt,.md,.doc,.docx" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
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
                <button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                  {isUploading ? "Đang tải lên..." : "Xác nhận tải lên"}
                </button>
              </div>
            </div>
          )}

          {uploadError && <p className="text-red-500 text-sm mt-4 whitespace-pre-line text-center">{uploadError}</p>}
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
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center whitespace-nowrap">
                        {doc.status === "ready" && <><CheckCircle2 className="h-4 w-4 text-green-500 mr-1.5" /><span className="text-sm text-green-700">Sẵn sàng</span></>}
                        {doc.status === "processing" && <><Loader2 className="animate-spin h-4 w-4 text-blue-500 mr-1.5" /><span className="text-sm text-blue-700">Đang xử lý (Chunking)</span></>}
                        {doc.status === "pending" && <span className="text-sm text-gray-500 px-2 py-1 bg-gray-100 rounded-full">Chờ xử lý</span>}
                        {doc.status === "failed" && <><XCircle className="h-4 w-4 text-red-500 mr-1.5" /><span className="text-sm text-red-700">Lỗi xử lý</span></>}
                      </div>
                      {doc.error_message && <p className="text-xs text-red-500 mt-2 break-words whitespace-normal max-w-md">{doc.error_message}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleDelete(doc.id)} 
                        className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-md transition-colors"
                        title="Xóa tài liệu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
