"use client";

import { useState } from "react";
import { upsertIntegrationProvider, deleteIntegrationProvider } from "@/app/actions/vault-actions";
import type { Phase070ProviderCatalogItem } from "@/lib/tenant-integrations";
import { X, Plus, Trash2, Edit3, Settings, Shield, Sparkles, AlertCircle, Check } from "lucide-react";

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
    if (!confirm("Bạn có chắc chắn muốn vô hiệu hóa nhà cung cấp này khỏi danh mục?")) return;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/60 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Quản lý Danh Mục AI (Admin)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Đăng ký và định cấu hình các nhà cung cấp mô hình AI khả dụng cho Tenant</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!editing ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Danh sách Nhà Cung Cấp ({providers.length})</h3>
                <button
                  onClick={() => handleEdit()}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm Provider</span>
                </button>
              </div>
              <div className="space-y-3">
                {providers.map((p) => (
                  <div 
                    key={p.provider_code} 
                    className="p-4 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 flex justify-between items-center transition-all hover:bg-slate-100/50 dark:hover:bg-slate-800/70"
                  >
                    <div className="min-w-0 flex-1 mr-4">
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{p.provider_name}</span>
                        <span className="text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full">{p.auth_type}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{p.provider_code}</div>
                      {typeof p.public_metadata?.base_url === "string" && (
                        <div className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-1 truncate max-w-md">Base URL: {p.public_metadata.base_url}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEdit(p)} 
                        className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 rounded-lg transition-colors border border-cyan-200/60 dark:border-cyan-800/60"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa</span>
                      </button>
                      <button 
                        onClick={() => handleDelete(p.provider_code)} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Vô hiệu hóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên hiển thị</label>
                  <input
                    type="text"
                    value={editing.provider_name}
                    onChange={(e) => setEditing({ ...editing, provider_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-cyan-500 outline-none"
                    placeholder="VD: Groq AI"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mã hệ thống (Code)</label>
                  <input
                    type="text"
                    value={editing.provider_code}
                    onChange={(e) => setEditing({ ...editing, provider_code: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-mono"
                    placeholder="VD: groq_ai (chữ thường, số, _)"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Base URL (Tùy chọn cho OpenAI-compatible)</label>
                  <input
                    type="text"
                    value={editing.base_url}
                    onChange={(e) => setEditing({ ...editing, base_url: e.target.value })}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-cyan-500 outline-none font-mono"
                    placeholder="VD: https://api.groq.com/openai/v1"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Nếu nhập Base URL, hệ thống sẽ ưu tiên dùng URL này thay vì URL mặc định của Adapter.</p>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Danh sách Models ({editing.models.length})</h3>
                  <button onClick={addModel} className="flex items-center space-x-1 text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Model</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editing.models.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl p-4 relative">
                      <button 
                        onClick={() => removeModel(idx)} 
                        className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 p-1"
                        title="Xóa model"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mr-6">
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Model Code</label>
                          <input
                            type="text"
                            value={m.code}
                            onChange={(e) => updateModel(idx, "code", e.target.value)}
                            placeholder="VD: llama-3.3-70b-versatile"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Capability</label>
                          <select
                            value={m.capability}
                            onChange={(e) => updateModel(idx, "capability", e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none"
                          >
                            <option value="text">Text (Chat / Completions)</option>
                            <option value="image">Image (DALL-E / Imagen / Flux)</option>
                            <option value="video">Video (Sora / Kling)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">Endpoint Template</label>
                          <input
                            type="text"
                            value={m.endpoint_template || m.endpoint || ""}
                            onChange={(e) => updateModel(idx, "endpoint_template", e.target.value)}
                            placeholder="VD: /chat/completions"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {editing.models.length === 0 && (
                    <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      Chưa có model nào được khai báo. Bấm "+ Thêm Model" ở trên.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3 bg-slate-50 dark:bg-slate-900/80">
            <button
              onClick={() => setEditing(null)}
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5"
            >
              {loading ? "Đang lưu..." : "Lưu cấu hình"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
