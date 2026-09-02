"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

export function Phase4CampaignBuilder() {
  const { t } = useI18n("dashboard");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [numIdeas, setNumIdeas] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    // Explicit opt-in warning logic could go here or via a UI toggle
    if (!confirm("Cảnh báo: Hành động này sẽ gọi API OpenAI GPT-4o để tự động lên kế hoạch chiến dịch và tốn một ít chi phí token. Bạn có chắc chắn muốn tiếp tục?")) {
      setLoading(false);
      return;
    }

    try {
      // Fetch tenant context safely from portal core
      const portalRes = await fetch("/api/phase068/portal-core", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      const portalPayload = await portalRes.json().catch(() => null);
      
      const tenantId = portalPayload?.data?.tenant_shell?.active_organization_id;

      if (!tenantId) {
        setLoading(false);
        setError("Không thể xác định ngữ cảnh Tenant (Organization). Vui lòng đảm bảo bạn đang ở trong một Tenant hợp lệ.");
        return;
      }

      const res = await fetch('/api/phase4/generate-campaign', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          goal,
          target_audience: audience,
          num_ideas: numIdeas,
          tenant_id: tenantId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi không xác định');
      }

      setSuccess(`Tạo chiến dịch thành công! Đã lên kế hoạch cho ${data.ideasGenerated} ý tưởng bài viết.`);
      setTitle("");
      setGoal("");
      setAudience("");
      
      // Auto reload after 2s to show new ideas
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-500/30 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-violet-200 dark:border-violet-400/20 bg-violet-50 dark:bg-violet-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            🤖 AI Campaign Planner (Phase 4)
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Chỉ cần 1 mục tiêu, AI sẽ lo toàn bộ ý tưởng
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tên chiến dịch</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Ra mắt tính năng Z..." 
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Tệp khách hàng (Target Audience)</label>
            <input 
              type="text" 
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="VD: Dân văn phòng 25-35 tuổi..." 
              className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Mục tiêu chiến dịch (Goal)</label>
          <textarea 
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Bạn muốn đạt được điều gì? Kể chi tiết cho AI nghe..." 
            rows={2}
            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Số lượng bài (1-10):</label>
            <input 
              type="number" 
              min={1} 
              max={10} 
              value={numIdeas}
              onChange={(e) => setNumIdeas(parseInt(e.target.value))}
              className="w-16 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-sm text-slate-900 dark:text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="rounded-lg bg-violet-600 hover:bg-violet-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Đang vắt óc suy nghĩ..." : "✨ Lên Chiến Dịch Ngay"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          Lỗi: {error}
        </div>
      )}
      
      {success && (
        <div className="mt-4 rounded-md border border-green-200 dark:border-green-500/20 bg-green-50 dark:bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}
    </div>
  );
}
