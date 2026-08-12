"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Department = { id: string; canonical_name: string; };

type DraftContentModalProps = {
  initialTitle: string;
  onClose: () => void;
  onSuccess: (contentItemId: string, title: string) => void;
};

export function DraftContentModal({ initialTitle, onClose, onSuccess }: DraftContentModalProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [title, setTitle] = useState(initialTitle);
  const [brief, setBrief] = useState("");
  const [deptId, setDeptId] = useState("");
  // Generate a short ID for preview content_key, e.g. CT-1234
  const [contentKey, setContentKey] = useState(`CT-${Math.floor(Math.random() * 10000)}`);

  useEffect(() => {
    fetch("/api/departments")
      .then(r => r.json())
      .then(data => {
        setDepartments(data.departments || []);
        if (data.departments?.length > 0) {
          setDeptId(data.departments[0].id);
        }
      })
      .catch(() => toast.error("Không tải được phòng ban"))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deptId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/content-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_key: contentKey,
          title,
          brief,
          task_owner_ref: deptId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
           toast.error(data.message || "TỪ CHỐI: Bạn không có quyền tạo content.", {
             style: { background: '#ef4444', color: '#fff', border: 'none' }
           });
        } else {
           toast.error(data.error || "Không thể tạo nội dung.");
        }
        setIsSubmitting(false);
        return;
      }

      toast.success("Tạo content item thành công! Đang gọi lệnh...");
      onSuccess(data.contentItem.id, title);
    } catch (err: any) {
      toast.error("Lỗi mạng khi tạo nội dung");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Tạo Content Draft & Chạy</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Tiêu đề bài viết</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Phòng ban gắn thẻ (Metadata)</label>
              <select
                value={deptId}
                onChange={e => setDeptId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-cyan-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id} className="bg-slate-800 text-white">
                    {d.canonical_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Mô tả (Brief - Không bắt buộc)</label>
              <textarea 
                value={brief} 
                onChange={e => setBrief(e.target.value)} 
                rows={2}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Content Key (ID hiển thị)</label>
              <input 
                type="text" 
                value={contentKey} 
                onChange={e => setContentKey(e.target.value)} 
                required 
                className="w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-white outline-none focus:border-cyan-500"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                disabled={isSubmitting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button 
                type="submit"
                disabled={isSubmitting || !title || !deptId}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Tạo & Chạy lệnh
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
