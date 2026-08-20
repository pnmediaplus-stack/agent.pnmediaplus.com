"use client";

import { useEffect, useState } from "react";
import { Send, Loader2, ServerCrash, Share } from "lucide-react";

export function PublishSelector({ 
  contentItemId, 
  onCommand 
}: { 
  contentItemId: string;
  onCommand?: (cmd: string) => void;
}) {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch('/api/tenant-integrations')
      .then(res => res.json())
      .then(data => {
        if (!mounted) return;
        if (data.integrations && Array.isArray(data.integrations)) {
          // Lọc đúng cấu trúc dữ liệu: provider_code === 'facebook_page'
          const fbPages = data.integrations.filter((integration: any) => integration.provider_code === 'facebook_page');
          setPages(fbPages);
        } else {
          setPages([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        if (mounted) {
          setError("Không thể tải danh sách Fanpage.");
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="mt-2 p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-slate-400 text-sm flex items-center">
        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang tải danh sách Fanpage...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 p-3 border border-red-900/50 rounded-lg bg-red-950/20 text-red-400 text-sm flex items-center">
        <ServerCrash className="h-4 w-4 mr-2" /> {error}
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="mt-2 p-3 border border-yellow-700/50 rounded-lg bg-yellow-950/20 text-yellow-400 text-sm">
        Không tìm thấy Fanpage nào được liên kết. Vui lòng cấu hình Fanpage trước.
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 border border-indigo-500/30 rounded-xl bg-indigo-500/5 space-y-3">
      <div className="text-sm font-semibold text-indigo-300 mb-2">Chọn Fanpage để xuất bản:</div>
      <div className="flex flex-wrap gap-2">
        {pages.map((page) => (
          <button
            key={page.id || page.integration_key}
            onClick={(e) => {
              if (!onCommand) return;
              const btn = e.currentTarget;
              btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Đang xử lý...`;
              btn.disabled = true;
              onCommand(`/publish integration_key:${page.integration_key} ${contentItemId}`);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors shadow-lg shadow-indigo-900/20 border border-indigo-400/30 disabled:opacity-50"
          >
            <Share className="h-4 w-4" />
            {page.integration_name || page.integration_key}
          </button>
        ))}
      </div>
    </div>
  );
}
