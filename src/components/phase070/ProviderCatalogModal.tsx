"use client";

import { useState } from "react";
import { upsertIntegrationProvider, deleteIntegrationProvider } from "@/app/actions/vault-actions";
import type { Phase070ProviderCatalogItem } from "@/lib/tenant-integrations";

type EditState = {
  original_code: string | null;
  provider_code: string;
  provider_name: string;
  auth_type: string;
  base_url: string;
  models: { code: string; capability: string; prompt_cost?: number; completion_cost?: number; endpoint_template?: string; endpoint?: string }[];
};

export function ProviderCatalogModal({
  isOpen,
  onClose,
  providers,
  onRefresh
}: {
  isOpen: boolean;
  onClose: () => void;
  providers: Phase070ProviderCatalogItem[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<EditState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleEdit = (provider?: Phase070ProviderCatalogItem) => {
    if (provider) {
      setEditing({
        original_code: provider.provider_code,
        provider_code: provider.provider_code,
        provider_name: provider.provider_name,
        auth_type: provider.auth_type,
        base_url: provider.public_metadata?.base_url as string || "",
        models: Array.isArray(provider.public_metadata?.models) ? [...provider.public_metadata.models] : []
      });
    } else {
      setEditing({
        original_code: null,
        provider_code: "",
        provider_name: "",
        auth_type: "bearer_token",
        base_url: "",
        models: []
      });
    }
    setError("");
  };

  const handleSave = async () => {
    if (!editing) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        provider_code: editing.provider_code,
        provider_name: editing.provider_name,
        auth_type: editing.auth_type,
        public_metadata: {
          ...(editing.base_url ? { base_url: editing.base_url } : {}),
          models: editing.models
        }
      };
      const res = await upsertIntegrationProvider(editing.original_code, payload);
      if (res.ok) {
        setEditing(null);
        onRefresh();
      } else {
        setError(res.reason);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm("Are you sure you want to disable this provider?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await deleteIntegrationProvider(code);
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      onRefresh();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const addModel = () => {
    if (!editing) return;
    setEditing({ ...editing, models: [...editing.models, { code: "", capability: "text", prompt_cost: 0, completion_cost: 0, endpoint_template: "" }] });
  };

  const updateModel = (index: number, key: string, value: any) => {
    if (!editing) return;
    const newModels = [...editing.models];
    newModels[index] = { ...newModels[index], [key]: value };
    setEditing({ ...editing, models: newModels });
  };

  const removeModel = (index: number) => {
    if (!editing) return;
    const newModels = [...editing.models];
    newModels.splice(index, 1);
    setEditing({ ...editing, models: newModels });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-semibold text-white">Quản lý Danh Mục AI (Admin)</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          {!editing ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-medium text-slate-300">Danh sách Providers</h3>
                <button
                  onClick={() => handleEdit()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  + Thêm Provider
                </button>
              </div>
              <div className="space-y-4">
                {providers.map((p) => (
                  <div key={p.provider_code} className="p-4 border border-slate-800 rounded-lg bg-slate-800/50 flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{p.provider_name}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{p.provider_code}</div>
                      {typeof p.public_metadata?.base_url === "string" && (
                        <div className="text-xs text-blue-400 mt-1 truncate max-w-md">URL: {p.public_metadata.base_url}</div>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <button onClick={() => handleEdit(p)} className="text-sm text-blue-400 hover:text-blue-300">Sửa</button>
                      <button onClick={() => handleDelete(p.provider_code)} className="text-sm text-red-400 hover:text-red-300">Vô hiệu hóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Tên hiển thị</label>
                  <input
                    type="text"
                    value={editing.provider_name}
                    onChange={(e) => setEditing({ ...editing, provider_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="VD: Groq AI"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Mã hệ thống (Code)</label>
                  <input
                    type="text"
                    value={editing.provider_code}
                    onChange={(e) => setEditing({ ...editing, provider_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    placeholder="VD: groq_ai (chỉ chữ thường, số, _)"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-2">Custom Base URL (Tùy chọn cho OpenAI-compatible)</label>
                  <input
                    type="text"
                    value={editing.base_url}
                    onChange={(e) => setEditing({ ...editing, base_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    placeholder="VD: https://api.groq.com/openai/v1"
                  />
                  <p className="mt-2 text-xs text-slate-500">Nếu nhập Base URL, hệ thống sẽ ưu tiên dùng URL này thay vì URL mặc định của Adapter.</p>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-slate-300">Danh sách Models</h3>
                  <button onClick={addModel} className="text-xs text-blue-400 hover:text-blue-300">+ Thêm Model</button>
                </div>
                
                <div className="space-y-3">
                  {editing.models.map((m, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-4 relative">
                      <button onClick={() => removeModel(idx)} className="absolute top-4 right-4 text-slate-500 hover:text-red-400">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <div className="grid grid-cols-2 gap-4 mr-8">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Model Code</label>
                          <input
                            type="text"
                            value={m.code}
                            onChange={(e) => updateModel(idx, "code", e.target.value)}
                            placeholder="VD: nano-banana-2-lite"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Capability</label>
                          <select
                            value={m.capability}
                            onChange={(e) => updateModel(idx, "capability", e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                          >
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-1">Endpoint Template</label>
                          <input
                            type="text"
                            value={m.endpoint_template || m.endpoint || ""}
                            onChange={(e) => updateModel(idx, "endpoint_template", e.target.value)}
                            placeholder="VD: /api/v1/{model}/generate hoặc https://..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Prompt Cost ($/1M token)</label>
                          <input
                            type="number"
                            value={m.prompt_cost || 0}
                            onChange={(e) => updateModel(idx, "prompt_cost", parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Completion Cost ($/1M token)</label>
                          <input
                            type="number"
                            value={m.completion_cost || 0}
                            onChange={(e) => updateModel(idx, "completion_cost", parseFloat(e.target.value))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editing.models.length === 0 && (
                    <div className="text-xs text-slate-500 italic">Chưa có model nào. Hãy bấm Thêm Model.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {editing && (
          <div className="p-6 border-t border-slate-800 flex justify-end space-x-4 bg-slate-900/50">
            <button
              onClick={() => setEditing(null)}
              disabled={loading}
              className="px-6 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
