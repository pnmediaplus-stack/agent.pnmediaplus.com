"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

export function Phase5CMOOffice() {
  const { t, locale } = useI18n("dashboard");
  const [loading, setLoading] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [proposal, setProposal] = useState<any>(null);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    const fetchCMOData = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/phase5_strategies?status=eq.active&limit=1`, {
          headers: {
             'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        });
        const data = await res.json();
        if (data && data.length > 0) {
          setStrategy(data[0]);
        } else {
          setStrategy(null);
        }
      } catch (e) {}
    };
    fetchCMOData();
  }, []);

  const handleRunAnalysis = async () => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await fetch('/api/phase5/analyze-strategy', {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer pn_media_os_super_secret_key_2026_xyz',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ locale, tenant_id: 'default' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActionMsg(data.message);
      if (data.status === 'PIVOT_PROPOSED') {
        setProposal(data.proposal);
      }
    } catch (e: any) {
      setActionMsg("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePivot = async (proposalId: string) => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await fetch('/api/phase5/approve-pivot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer pn_media_os_super_secret_key_2026_xyz'
        },
        body: JSON.stringify({ proposal_id: proposalId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setActionMsg(data.message);
      setProposal(null);
      
      setTimeout(() => window.location.reload(), 2000);
    } catch (e: any) {
      setActionMsg("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-red-500/30 bg-slate-950/80 p-5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-red-300">
            👑 CMO AI Office (Phase 5)
          </div>
        </div>
        <div className="text-xs text-slate-400">
          Bộ não tự điều chỉnh (Auto-Pivot)
        </div>
      </div>

      <div className="space-y-4">
        {/* Active Strategy Info */}
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm font-semibold text-white">
            Chiến Lược Hiện Tại: {strategy ? strategy.name : "Không tìm thấy chiến lược"}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Vision: {strategy ? strategy.vision : "Vui lòng cấu hình chiến lược trong Database..."}
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            *CMO AI được cấu hình chạy ngầm định kỳ hàng tuần. Bạn cũng có thể ép chạy thủ công:
          </div>
          <button 
            onClick={handleRunAnalysis}
            disabled={loading}
            className="rounded-md bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white border border-slate-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Đang phân tích..." : "🔍 Phân Tích Thủ Công"}
          </button>
        </div>

        {/* Pivot Proposal Warning */}
        {proposal && (
          <div className="mt-4 rounded-xl border-2 border-red-500/50 bg-red-950/30 p-5 animate-pulse-slow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-red-400">⚠️ ĐỀ XUẤT BẺ LÁI (PIVOT PROPOSAL) TỪ CMO AI</h3>
                <p className="mt-2 text-sm text-red-200">
                  <span className="font-semibold">Lý do:</span> {proposal.reasoning}
                </p>
                <p className="mt-2 text-sm text-red-200">
                  <span className="font-semibold">Hướng đi mới:</span> {proposal.proposed_direction}
                </p>
                <div className="mt-3 text-xs text-red-400/80">
                  *Cảnh báo: Nhấn Duyệt sẽ tự động TẠM DỪNG (Pause) toàn bộ các Chiến dịch cũ.
                </div>
              </div>
              <button 
                onClick={() => handleApprovePivot(proposal.id || 'mock_id')} // mock for UI thin shell
                disabled={loading}
                className="ml-4 whitespace-nowrap rounded-lg bg-red-600 hover:bg-red-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
              >
                🚨 DUYỆT BẺ LÁI
              </button>
            </div>
          </div>
        )}

        {actionMsg && (
          <div className="mt-2 text-xs font-medium text-emerald-400">
            {actionMsg}
          </div>
        )}
      </div>
    </div>
  );
}
