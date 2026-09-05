"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { UploadCloud, FileText, Loader2, CheckCircle2, XCircle, Trash2, Settings, MessageSquare, Bot, Tag, Plus, X, Shield, ShieldCheck, AlertTriangle, Eye, FileJson, Check, ExternalLink, RefreshCw, Layers } from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Lỗi tải dữ liệu");
  return data;
};

export default function AIControlCenterPage() {
  const [activeTab, setActiveTab] = useState("knowledge");
  
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 h-full flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-2 shrink-0">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Trung Tâm Điều Khiển AI</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Cấu hình tri thức, tính cách và chiến dịch chủ động cho trợ lý ảo của bạn.</p>
      </div>

      <div className="px-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <nav className="-mb-px flex space-x-8">
          <button 
            onClick={() => setActiveTab("knowledge")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'knowledge' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`}
          >
            <div className="flex items-center"><FileText className="w-4 h-4 mr-2"/> Kho Tri Thức</div>
          </button>
          <button 
            onClick={() => setActiveTab("persona")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'persona' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`}
          >
            <div className="flex items-center"><Bot className="w-4 h-4 mr-2"/> Lệnh Chỉ Đạo (Prompt)</div>
          </button>
          <button 
            onClick={() => setActiveTab("campaigns")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'campaigns' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`}
          >
            <div className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> Chiến Dịch Chủ Động</div>
          </button>
        
          <button 
            onClick={() => setActiveTab("tags")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500'}`}
          >
            <div className="flex items-center"><Tag className="w-4 h-4 mr-2"/> Quản Lý Thẻ (Tags)</div>
          </button>

          </nav>
      </div>

      <div className="flex-1 p-6 flex flex-col min-h-0" id="tab-scroll-container">
        {activeTab === "knowledge" && <KnowledgeTab />}
        {activeTab === "persona" && <PersonaTab />}
        {activeTab === "campaigns" && <CampaignsTab />}
        {activeTab === "tags" && <TagsTab />}
      </div>
    </div>
  );
}

// ----------------------------------------------------
// TAB 1: KNOWLEDGE BASE
// ----------------------------------------------------
const CANONICAL_MARKETING_MANIFEST = {
  "package_id": "PN_MARKETING_KO_SYSTEM_v1.0",
  "package_name": "PN Media Plus Marketing Decision Framework (KO-01 to KO-10)",
  "package_version": "1.0.0",
  "expected_parts": 10,
  "package_manifest_sha256": "60604cf7f31411bbb172ac990d7a61e1b204bb0ecb2515d3a55b141ba554acf8",
  "canonical_documents": [
    {
      "ko_index": "KO-01",
      "title": "Epistemic Evidence Governance",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_01_EPISTEMIC_EVIDENCE_GOVERNANCE_v1.0_LOCKED.md",
      "sha256": "eff7b1f29f02f9ba6c1928909ca78014823b34caa0ad3258a71a4bbc01d6975a"
    },
    {
      "ko_index": "KO-02",
      "title": "Market & Industry Research Framework",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_02_MARKET_INDUSTRY_RESEARCH_FRAMEWORK_v1.0.md",
      "sha256": "6c1142123715e31a19ba5339364d4f44cec41d13a7e3cf796a4ad3432393a407"
    },
    {
      "ko_index": "KO-03",
      "title": "ICP Selection Framework",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_03_ICP_SELECTION_FRAMEWORK_v1.0.md",
      "sha256": "0e24858b08308087b31ae10491afe22d87b27da41922fdb1739ae220e9ec4aee"
    },
    {
      "ko_index": "KO-04",
      "title": "ICP Customer Evidence Pack",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_04_ICP_CUSTOMER_EVIDENCE_PACK_v1.0.md",
      "sha256": "c835ec452954aa606884f5e7397917463554175587440abcd2e7805a7fe30e06"
    },
    {
      "ko_index": "KO-05",
      "title": "Pain Evidence & Pain Wedge Selection",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_05_PAIN_EVIDENCE_PAIN_WEDGE_SELECTION_v1.0.md",
      "sha256": "549ccbb560b996d3864a50073b0e4d208568027f356d5d08809ad8e9bd3868cf"
    },
    {
      "ko_index": "KO-06",
      "title": "Product Ground Truth & Capability Matrix",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_06_PRODUCT_GROUND_TRUTH_CAPABILITY_MATRIX_v1.0.md",
      "sha256": "d3ad64902f3d27e9221c4001738e0e62ee07d6a03189cc5daaf97036379e076a"
    },
    {
      "ko_index": "KO-07",
      "title": "Product-to-Pain Fit Matrix",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_07_PRODUCT_TO_PAIN_FIT_MATRIX_v1.0.md",
      "sha256": "5165fc13d540f1d06067bd72cba2a9aab5a23037cb418a771475957c85a06aba"
    },
    {
      "ko_index": "KO-08",
      "title": "Positioning & Message Decision System",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_08_POSITIONING_MESSAGE_DECISION_SYSTEM_v1.0.md",
      "sha256": "4f2398871b67721421251f8c1ee42e6183ff89617fec79f488730a253640d418"
    },
    {
      "ko_index": "KO-09",
      "title": "Creative & Funnel Architecture",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_09_CREATIVE_FUNNEL_ARCHITECTURE_v1.0.md",
      "sha256": "66bf3bcf7755723ddcc84cd2f644ae1cdb6506088841ed5f7de09aea6c066718"
    },
    {
      "ko_index": "KO-10",
      "title": "Experiment & Learning Capture",
      "relative_path": "documents/PN_MEDIA_PLUS_MARKETING_10_EXPERIMENT_LEARNING_CAPTURE_v1.0.md",
      "sha256": "cbe33f8a81b43fde36e3d8ae3afe6dc55b63b1a1711c9fb19675013a10d1d9d8"
    }
  ]
};

function KnowledgeTab() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadDetails, setUploadDetails] = useState<any | null>(null);
  const [uploadMode, setUploadMode] = useState<'single' | 'package'>('single');
  const [packageId, setPackageId] = useState<string>('PN_MARKETING_KO_SYSTEM_v1.0');
  const [packageVersion, setPackageVersion] = useState<string>('1.0.0');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [manifestContent, setManifestContent] = useState<string>('');
  const [manifestMeta, setManifestMeta] = useState<any | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('marketing');
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Founder Approval Modal State
  const [confirmApprovalPkg, setConfirmApprovalPkg] = useState<any | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // QA Inspection Report Modal State
  const [selectedQaDoc, setSelectedQaDoc] = useState<any | null>(null);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.length) return null;
    return `/api/crm/knowledge?namespace=${selectedNamespace}&limit=20&offset=${pageIndex * 20}`;
  };

  const { data, error: docsError, size, setSize, mutate: mutateDocs, isValidating } = useSWRInfinite(getKey, fetcher, { refreshInterval: 5000 });
  const documents = data ? data.flat() : undefined;
  const isReachingEnd = data && data[data.length - 1]?.length < 20;

  const { data: channels } = useSWR("/api/crm/channels/prompt", fetcher);

  // Parse & Load Canonical Marketing Manifest
  const handleLoadCanonicalManifest = () => {
    const jsonStr = JSON.stringify(CANONICAL_MARKETING_MANIFEST, null, 2);
    setManifestContent(jsonStr);
    setManifestMeta(CANONICAL_MARKETING_MANIFEST);
    setPackageId(CANONICAL_MARKETING_MANIFEST.package_id);
    setPackageVersion(CANONICAL_MARKETING_MANIFEST.package_version);
    setManifestError(null);
  };

  const handleManifestFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed.package_id || !parsed.package_version || !parsed.package_manifest_sha256 || !Array.isArray(parsed.canonical_documents)) {
        throw new Error("Manifest thiếu các trường bắt buộc (package_id, package_version, package_manifest_sha256, canonical_documents).");
      }
      setManifestContent(text);
      setManifestMeta(parsed);
      setPackageId(parsed.package_id);
      setPackageVersion(parsed.package_version);
      setManifestError(null);
    } catch (err: any) {
      setManifestError("Lỗi đọc manifest: " + err.message);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    
    // Check if any uploaded file is a manifest JSON
    const jsonFile = newFiles.find(f => f.name.endsWith('.json'));
    if (jsonFile && !manifestMeta) {
      try {
        const text = await jsonFile.text();
        const parsed = JSON.parse(text);
        if (parsed.package_manifest_sha256) {
          setManifestContent(text);
          setManifestMeta(parsed);
          setPackageId(parsed.package_id || packageId);
          setPackageVersion(parsed.package_version || packageVersion);
        }
      } catch (e) {
        // ignore
      }
    }

    const docFiles = newFiles.filter(f => !f.name.endsWith('.json'));
    setSelectedFiles(prev => [...prev, ...docFiles]);
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Group documents by package awaiting Founder Approval
  const pendingPackages = React.useMemo(() => {
    if (!documents || !Array.isArray(documents)) return [];
    const groups: Record<string, any[]> = {};
    for (const doc of documents) {
      if (doc.package_id && doc.knowledge_status === 'REVIEWED' && doc.ingestion_status === 'PENDING') {
        const key = `${doc.package_id}:${doc.package_version || '1.0.0'}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
      }
    }
    return Object.entries(groups).map(([key, docs]) => {
      const [pkgId, pkgVer] = key.split(':');
      const manifestHash = docs[0]?.knowledge_metadata?.package_manifest_sha256 || '';
      return {
        key,
        package_id: pkgId,
        package_version: pkgVer,
        docs,
        manifest_hash: manifestHash,
        parts_count: docs.length,
        qa_report: docs[0]?.knowledge_metadata?.qa_inspection_report
      };
    });
  }, [documents]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setUploadDetails(null);

    if (uploadMode === 'package') {
      if (!manifestContent.trim()) {
        setUploadError("Vui lòng nạp Package Manifest (file .json) trước khi tải lên. Gatekeeper bắt buộc manifest cho toàn bộ package.");
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      formData.append("package_id", packageId);
      formData.append("package_version", packageVersion);
      formData.append("expected_count", selectedFiles.length.toString());
      formData.append("namespace", selectedNamespace);
      formData.append("manifest", manifestContent);
      if (selectedChannelId) {
        formData.append("channel_id", selectedChannelId);
      }
      for (const file of selectedFiles) {
        formData.append("files[]", file);
      }

      try {
        const res = await fetch("/api/crm/knowledge/package/upload", { method: "POST", body: formData });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setUploadDetails(data);
          throw new Error(data?.message || data?.error || "Tải lên gói thất bại");
        }
        setUploadSuccess(data.message || `Đã tải lên trọn bộ gói ${packageId} thành công (READY_FOR_HUMAN_REVIEW).`);
        setSelectedFiles([]);
        mutateDocs();
      } catch (err: any) {
        setUploadError(err.message);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Single mode upload
    const failedFiles: File[] = [];
    let errorMessage = "";

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      if (selectedChannelId) {
        formData.append("channel_id", selectedChannelId);
      }
      formData.append("namespace", selectedNamespace);

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

  // Founder Approval Dispatch
  const handleExecuteFounderApproval = async () => {
    if (!confirmApprovalPkg) return;
    setIsApproving(true);
    setApprovalError(null);
    setApprovalMessage(null);

    try {
      const res = await fetch("/api/crm/knowledge/package/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: confirmApprovalPkg.package_id,
          packageVersion: confirmApprovalPkg.package_version,
          expectedParts: confirmApprovalPkg.parts_count,
          expectedManifestSha256: confirmApprovalPkg.manifest_hash
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Phê duyệt gói tri thức thất bại.");
      }

      setApprovalMessage(`Ký duyệt thành công gói ${confirmApprovalPkg.package_id}! Trạng thái đã chuyển sang PACKAGE_APPROVED (is_framework: true).`);
      mutateDocs();
      setConfirmApprovalPkg(null);
    } catch (err: any) {
      setApprovalError(err.message);
    } finally {
      setIsApproving(false);
    }
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

  const handleDownload = async (docId: string, title: string) => {
    try {
      const res = await fetch(`/api/crm/knowledge/${docId}/download`);
      if (!res.ok) throw new Error("Không thể tải xuống");
      const data = await res.json();
      if (data.url) {
        const link = document.createElement('a');
        link.href = data.url;
        link.download = title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-6">
      
      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center shrink-0">
        
        {/* Upload Mode Selector */}
        <div className="flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 mb-4">
          <button
            type="button"
            onClick={() => setUploadMode('single')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${uploadMode === 'single' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tải tệp đơn lẻ
          </button>
          <button
            type="button"
            onClick={() => { setUploadMode('package'); setSelectedNamespace('marketing'); }}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${uploadMode === 'package' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <div className="flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5" />
              Tải gói trọn bộ (Batch Package Gate)
            </div>
          </button>
        </div>

        {uploadMode === 'package' && (
          <div className="w-full max-w-2xl mb-4 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider">Cấu Hình Gói Tri Thức (Package Manifest)</span>
              </div>
              <button
                type="button"
                onClick={handleLoadCanonicalManifest}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 hover:shadow-xs transition-all flex items-center"
              >
                <FileJson className="w-3 h-3 mr-1" />
                Nạp Manifest Mẫu (Marketing Framework v1.0)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Mã gói (Package ID)</label>
                <input
                  type="text"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 rounded-lg text-xs py-2 px-3 border focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="PN_MARKETING_KO_SYSTEM_v1.0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phiên bản (Version)</label>
                <input
                  type="text"
                  value={packageVersion}
                  onChange={(e) => setPackageVersion(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700 rounded-lg text-xs py-2 px-3 border focus:ring-1 focus:ring-blue-500 font-mono"
                  placeholder="1.0.0"
                />
              </div>
            </div>

            {/* Manifest Status Banner */}
            <div className="p-2.5 rounded-lg border text-xs bg-white dark:bg-slate-900 flex items-start justify-between">
              <div className="flex items-start space-x-2">
                {manifestMeta ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    {manifestMeta ? "Đã nạp Manifest hợp lệ" : "Chưa có Manifest (Bắt buộc theo chuẩn Gatekeeper)"}
                  </div>
                  {manifestMeta && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 break-all">
                      SHA256: {manifestMeta.package_manifest_sha256}
                    </div>
                  )}
                </div>
              </div>
              <label className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2">
                Tải file .json
                <input type="file" accept=".json" className="hidden" onChange={handleManifestFileChange} />
              </label>
            </div>
            {manifestError && <p className="text-xs text-rose-500">{manifestError}</p>}
          </div>
        )}

        <div className="w-full max-w-2xl mb-4 flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phân vùng (Namespace)</label>
            <select 
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border"
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              disabled={uploadMode === 'package'}
            >
              <option value="marketing">Kho Marketing (Khung Tri Thức Quyết Định)</option>
              <option value="cskh">Kho CSKH (Vận Hành)</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phạm vi tài liệu (Scope)</label>
            <select 
              className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm py-2 px-3 border"
              value={selectedChannelId || ""}
              onChange={(e) => setSelectedChannelId(e.target.value || null)}
              disabled={uploadMode === 'package'}
            >
              <option value="">Tài liệu dùng chung (Tất cả Page - is_org_wide)</option>
              {channels && channels.map((c: any) => (
                <option key={c.id} value={c.id}>Tài liệu riêng: {c.channel_name}</option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {uploadMode === 'package' ? 'Chọn toàn bộ 10 tệp Knowledge Objects (.md) của gói tri thức' : 'Kéo thả file vào đây hoặc click để chọn file'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
          {uploadMode === 'package' ? 'Hỗ trợ Markdown (.md). Bắt buộc đủ 10 part (KO-01 đến KO-10).' : 'Hỗ trợ PDF, TXT, MD, DOC, DOCX. Tối đa 10MB.'}
        </p>
        
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors relative shadow-sm">
          {uploadMode === 'package' ? 'Chọn các tệp KO của gói (.md)' : 'Chọn file tải lên'}
          <input type="file" multiple className="hidden" accept=".pdf,.txt,.md,.doc,.docx,.json" onChange={handleFileChange} disabled={isUploading}/>
        </label>
        
        {selectedFiles.length > 0 && (
          <div className="w-full max-w-2xl mt-6 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Đã chọn {selectedFiles.length} tệp {uploadMode === 'package' && '/ 10 parts mong đợi'}
              </h3>
              {uploadMode === 'package' && selectedFiles.length === 10 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> Đủ 10/10 parts
                </span>
              )}
            </div>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {selectedFiles.map((f, i) => (
                <li key={i} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                  <span className="truncate flex-1 pr-4 font-mono">{f.name}</span>
                  <button onClick={() => removeSelectedFile(i)} className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300" disabled={isUploading}>
                    <XCircle className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleUpload} 
                disabled={isUploading || (uploadMode === 'package' && (!manifestMeta || selectedFiles.length !== 10))} 
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <UploadCloud className="h-4 w-4 mr-2"/>}
                {isUploading ? "Đang quét QA & tải lên..." : "Xác nhận tải lên gói tri thức"}
              </button>
            </div>
          </div>
        )}

        {/* Detailed Error & Rollback Alert */}
        {uploadError && (
          <div className="w-full max-w-2xl mt-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-300">
            <div className="flex items-center space-x-2 font-semibold text-sm mb-1 text-rose-800 dark:text-rose-200">
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Thất Bại Khi Tải Lên Gói Tri Thức</span>
            </div>
            <p className="whitespace-pre-line mb-2">{uploadError}</p>

            {uploadDetails && (
              <div className="space-y-2 pt-2 border-t border-rose-200/60 dark:border-rose-900/60">
                {uploadDetails.code && (
                  <div><span className="font-semibold">Mã Lỗi Hệ Thống:</span> <span className="font-mono">{uploadDetails.code}</span></div>
                )}
                <div className="flex gap-4">
                  <div>
                    <span className="font-semibold">Rollback DB:</span>{" "}
                    <span className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${uploadDetails.db_rollback_status === 'ROLLED_BACK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-900'}`}>
                      {uploadDetails.db_rollback_status || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold">Rollback Storage:</span>{" "}
                    <span className={`font-mono px-1.5 py-0.5 rounded text-[11px] ${uploadDetails.storage_rollback_status === 'ROLLED_BACK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-200 text-rose-900'}`}>
                      {uploadDetails.storage_rollback_status || 'N/A'}
                    </span>
                  </div>
                </div>

                {uploadDetails.violations && uploadDetails.violations.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-slate-900 p-2.5 rounded border border-rose-200 dark:border-rose-800">
                    <div className="font-semibold text-rose-800 dark:text-rose-200 mb-1">Vi Phạm P0 Được Phát Hiện (QA Gate Block):</div>
                    <ul className="list-disc pl-4 space-y-1">
                      {uploadDetails.violations.map((v: any, idx: number) => (
                        <li key={idx} className="font-mono text-[11px]">
                          <strong>[{v.rule}]</strong>: {v.description} (Khớp từ khóa: &quot;{v.offending_text}&quot;)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {uploadSuccess && (
          <div className="w-full max-w-2xl mt-4 text-emerald-700 dark:text-emerald-300 text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 py-3 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}
      </div>

      {/* Founder Approval Alert Message */}
      {approvalMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{approvalMessage}</span>
          </div>
          <button onClick={() => setApprovalMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {approvalError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-4 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{approvalError}</span>
          </div>
          <button onClick={() => setApprovalError(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION: GÓI TRI THỨC CHỜ FOUNDER KÝ DUYỆT (FOUNDER APPROVAL CONSOLE) */}
      {pendingPackages.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                Gói Tri Thức Chờ Founder Ký Duyệt (Founder Sign-Off Required)
              </h2>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 animate-pulse">
              READY_FOR_HUMAN_REVIEW
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPackages.map((pkg) => (
              <div key={pkg.key} className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-amber-200 dark:border-amber-800/60 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                      {pkg.package_id}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Phiên bản: <span className="font-mono font-medium">{pkg.package_version}</span> | Số tệp: <span className="font-semibold text-slate-800 dark:text-slate-200">{pkg.parts_count}/10 parts</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    QA: REVIEW_RECOMMENDED
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 break-all">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Checksum:</span> {pkg.manifest_hash}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQaDoc(pkg.docs[0])}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Xem Báo Cáo QA
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmApprovalPkg(pkg)}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 mr-1.5" />
                    Ký Phê Duyệt Gói (Founder/Owner Sign-Off)
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            * Chỉ tài khoản có vai trò Founder/Owner của tổ chức mới có thẩm quyền ký số phê duyệt gói tri thức này. Sau khi duyệt, hệ thống sẽ chuyển sang trạng thái chính thức <code>PACKAGE_APPROVED</code> và kích hoạt tri thức phân lớp Marketing.
          </p>
        </div>
      )}

      {/* Confirmation Modal for Founder Approval */}
      {confirmApprovalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-amber-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Xác Nhận Ký Duyệt Gói (Founder/Owner Sign-Off)</h3>
              </div>
              <button onClick={() => setConfirmApprovalPkg(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Bạn đang thực hiện ký duyệt chính thức cho gói tri thức Marketing Framework với tư cách <strong>Founder/Owner</strong>:
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg text-xs space-y-1.5 font-mono">
              <div><strong>Mã gói:</strong> {confirmApprovalPkg.package_id}</div>
              <div><strong>Phiên bản:</strong> {confirmApprovalPkg.package_version}</div>
              <div><strong>Số lượng part:</strong> {confirmApprovalPkg.parts_count} Knowledge Objects</div>
              <div className="break-all"><strong>Manifest SHA256:</strong> {confirmApprovalPkg.manifest_hash}</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              Hệ thống sẽ tạo chữ ký HMAC mật mã máy chủ, xác thực đối chiếu toàn bộ 10 tệp và ghi nhận nhật ký kiểm toán bất biến vào hệ thống.
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmApprovalPkg(null)}
                disabled={isApproving}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteFounderApproval}
                disabled={isApproving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center shadow-sm cursor-pointer"
              >
                {isApproving ? <Loader2 className="animate-spin w-4 h-4 mr-1.5" /> : <ShieldCheck className="w-4 h-4 mr-1.5" />}
                {isApproving ? "Đang ký số HMAC..." : "Xác Nhận Ký Duyệt (Founder/Owner Sign-Off)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QA Inspection Report Modal */}
      {selectedQaDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-xl w-full border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Báo Cáo Kiểm Định QA Scanner</h3>
              </div>
              <button onClick={() => setSelectedQaDoc(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-400">Tên tài liệu:</span>
                <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{selectedQaDoc.title}</div>
              </div>

              {selectedQaDoc.knowledge_metadata?.qa_inspection_report ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-200">Kết quả đánh giá:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {selectedQaDoc.knowledge_metadata.qa_inspection_report.verdict || "REVIEW_RECOMMENDED"}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 font-mono">
                    <div><strong>Phân vùng:</strong> {selectedQaDoc.namespace}</div>
                    <div><strong>Vi phạm P0:</strong> 0 vi phạm (Đạt chuẩn an toàn tuyệt đối)</div>
                    <div><strong>Kiểm định Doanh Thu:</strong> PASS (Không có cam kết 300%)</div>
                    <div><strong>Kiểm định Ground Truth:</strong> PASS (Không Billing, Không HRM, Không AI Ads 100%)</div>
                    <div><strong>Kiểm định Thẩm Quyền:</strong> PASS (Khóa thẩm quyền thương mại)</div>
                    <div className="break-all"><strong>SHA-256 Nội dung:</strong> {selectedQaDoc.knowledge_metadata.qa_inspection_report.content_sha256 || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 p-4 text-center">Tài liệu này không có báo cáo QA Scanner.</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedQaDoc(null)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document List Box */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-medium text-slate-900 dark:text-white">Tài liệu đã tải lên</h2>
            <button
              onClick={() => mutateDocs()}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          {selectedDocumentIds.length > 0 && (
            <button 
              onClick={handleBulkDelete} 
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
            >
              {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Xóa {selectedDocumentIds.length} mục đã chọn
            </button>
          )}
        </div>
        {docsError && <div className="p-6 text-rose-500 dark:text-rose-400">Lỗi tải danh sách: {docsError.message}</div>}
        {!documents ? (
          <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-400 h-6 w-6"/></div>
        ) : !Array.isArray(documents) || documents.length === 0 ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">Chưa có tài liệu nào.</div>
        ) : (
          <div 
            className="flex-1 overflow-auto custom-scrollbar"
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isValidating && !isReachingEnd) {
                setSize(size + 1);
              }
            }}
          >
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 relative">
              <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-3 text-left w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto"
                      checked={documents.length > 0 && selectedDocumentIds.length === documents.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tên tài liệu</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trạng thái</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phạm vi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngày tải lên</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {documents.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto"
                        checked={selectedDocumentIds.includes(doc.id)}
                        onChange={() => toggleSelectOne(doc.id)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors" 
                        onClick={() => handleDownload(doc.id, doc.title)}
                        title="Tải xuống tài liệu"
                      >
                        <FileText className="h-5 w-5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 mr-3" />
                        <div>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">{doc.title}</span>
                          {doc.package_id && (
                            <div className="text-[11px] text-slate-500 font-mono">
                              Gói: {doc.package_id} {doc.ko_index && `(${doc.ko_index})`}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        {doc.is_framework ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 w-fit">
                            <ShieldCheck className="w-3 h-3 mr-1" /> FRAMEWORK (Đã duyệt Founder/Owner)
                          </span>
                        ) : doc.knowledge_status === 'REVIEWED' && doc.ingestion_status === 'PENDING' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 w-fit animate-pulse">
                            READY_FOR_HUMAN_REVIEW
                          </span>
                        ) : (
                          <div className="flex items-center whitespace-nowrap">
                            {doc.status === "ready" || !doc.status ? <><CheckCircle2 className="h-4 w-4 text-emerald-500 mr-1.5" /><span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Đã xử lý xong</span></> : null}
                            {doc.status === "processing" && <><Loader2 className="animate-spin h-4 w-4 text-blue-500 mr-1.5" /><span className="text-sm font-medium text-blue-700 dark:text-blue-400">Đang học (Chunking)</span></>}
                            {doc.status === "pending" && <span className="text-sm text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-full">Chờ xử lý</span>}
                            {doc.status === "failed" && <><XCircle className="h-4 w-4 text-rose-500 mr-1.5" /><span className="text-sm font-medium text-rose-700 dark:text-rose-400">Lỗi xử lý</span></>}
                          </div>
                        )}
                        {doc.error_message && <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 break-words whitespace-normal max-w-md">{doc.error_message}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                      {doc.channel_id ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-transparent dark:border-blue-800/60">
                          Tài liệu riêng biệt
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          Tài liệu dùng chung
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{new Date(doc.created_at).toLocaleString("vi-VN")}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {doc.knowledge_metadata?.qa_inspection_report && (
                        <button
                          onClick={() => setSelectedQaDoc(doc)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/30 p-2 rounded-md transition-colors"
                          title="Xem Báo Cáo QA"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(doc.id)} className="text-rose-600 dark:text-rose-400 hover:text-rose-900 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 p-2 rounded-md transition-colors"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isValidating && documents.length > 0 && (
              <div className="p-4 flex justify-center border-t border-slate-100 dark:border-slate-700">
                <Loader2 className="animate-spin text-blue-500 h-5 w-5" />
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Đang tải thêm...</span>
              </div>
            )}
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

  if (error) return <div className="p-4 text-rose-500 dark:text-rose-400">Lỗi tải dữ liệu kênh: {error.message}</div>;
  if (!channels) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400 h-6 w-6"/></div>;
  if (channels.length === 0) return <div className="p-6 text-slate-500 dark:text-slate-400">Chưa có kênh nào được kết nối.</div>;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chọn kênh để cấu hình</label>
        <select 
          className="w-full max-w-md border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Bản thiết kế nhân cách (Master System Prompt)</label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Nhập các chỉ thị cứng cho AI (Ví dụ: Tone giọng, cách tư vấn, quy tắc trả lời). Prompt này sẽ tự động được gửi kèm cho n8n mỗi khi khách hàng nhắn tin.</p>
        <textarea 
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-96 border border-slate-300 dark:border-slate-600 rounded-lg p-4 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nhập prompt tại đây..."
        />
      </div>

      <button 
        onClick={handleSave} 
        disabled={isSaving}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center shadow-sm"
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
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Quản lý Chiến Dịch Chủ Động</h3>
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chọn kênh áp dụng</label>
          <select 
            className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
            <div className="lg:col-span-1 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <h4 className="font-medium text-slate-900 dark:text-white mb-4">{editingId ? 'Sửa chiến dịch' : 'Tạo chiến dịch mới'}</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tên chiến dịch</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:border-blue-500 focus:ring-blue-500" placeholder="VD: Hỏi thăm sau 24h" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Thời gian chờ (Giờ)</label>
                  <div className="flex items-center space-x-2">
                    <input type="range" min="1" max="168" value={hours} onChange={e => setHours(parseInt(e.target.value))} className="w-full accent-blue-600 bg-white" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 w-12 text-right">{hours}h</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Gửi tin nếu khách không chat sau {hours} giờ.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">System Prompt</label>
                  <textarea rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md focus:border-blue-500 focus:ring-blue-500" placeholder="Ép AI nói gì? VD: Bạn hãy tặng khách mã giảm giá 10%..." />
                </div>
                <div className="flex items-center">
                  <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-600 appearance-auto bg-white border-gray-300 rounded" />
                  <label className="ml-2 text-sm text-slate-700 dark:text-slate-300">Kích hoạt ngay</label>
                </div>
                <div className="flex space-x-2 pt-2">
                  <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm">
                    {isSaving ? 'Đang lưu...' : 'Lưu chiến dịch'}
                  </button>
                  {editingId && (
                    <button onClick={handleCancelEdit} className="px-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600">
                      Hủy
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
              {isLoading ? (
                <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : campaigns.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm">
                  Chưa có chiến dịch nào cho kênh này.
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`p-4 border rounded-lg flex items-start justify-between ${c.is_active ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h5 className="font-medium text-slate-900 dark:text-white">{c.name}</h5>
                          {c.is_active ? (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs rounded-full font-medium border border-transparent dark:border-emerald-800/60">Đang chạy</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full font-medium">Tạm dừng</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Chờ: <span className="font-semibold">{c.condition_hours_inactive} giờ</span></p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 italic border-l-2 border-slate-300 dark:border-slate-600 pl-2">{c.system_prompt_override}</p>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <button onClick={() => toggleActive(c.id, c.is_active)} className={`px-3 py-1 rounded text-xs font-medium border ${c.is_active ? 'border-amber-300 dark:border-amber-700/80 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30' : 'border-emerald-300 dark:border-emerald-700/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}`}>
                          {c.is_active ? 'Tạm dừng' : 'Kích hoạt'}
                        </button>
                        <button onClick={() => handleEdit(c)} className="px-3 py-1 rounded text-xs font-medium border border-blue-300 dark:border-blue-700/80 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30">Sửa</button>
                        <button onClick={() => handleDelete(c.id)} className="px-3 py-1 rounded text-xs font-medium border border-rose-300 dark:border-rose-700/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30">Xóa</button>
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
    const [tagBgColor, setTagBgColor] = useState('#ecfdf5'); // light green
  const [tagTextColor, setTagTextColor] = useState('#059669'); // dark green
  const [tagBorderColor, setTagBorderColor] = useState('#34d399'); // border green
  
  const parseColor = (colorStr: string) => {
    try {
      if (colorStr && colorStr.startsWith('{')) return JSON.parse(colorStr);
    } catch (e) {}
    return { bg: colorStr || '#3B82F6', text: '#ffffff', border: colorStr || '#3B82F6' };
  };
const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch('/api/crm/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_name: tagName, color: JSON.stringify({ bg: tagBgColor, text: tagTextColor, border: tagBorderColor }) })
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

  if (error) return <div className="text-rose-500 dark:text-rose-400">Lỗi tải danh sách thẻ</div>;
  if (!tags) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400 dark:text-slate-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">Danh Sách Thẻ Của AI</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Đây là các thẻ (Tags) hợp lệ mà Trợ lý AI có thể tự động gán cho khách hàng trong quá trình trò chuyện (VD: VIP, Spam, Khách sỉ...).</p>
        
        <form onSubmit={handleAdd} className="flex gap-4 items-end mb-8 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex-wrap">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tên Thẻ (Tag Name)</label>
            <input type="text" value={tagName} onChange={e => setTagName(e.target.value)} placeholder="VD: Khách sỉ" className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-blue-500 bg-white dark:bg-slate-800" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Màu nền</label>
            <input type="color" value={tagBgColor} onChange={e => setTagBgColor(e.target.value)} className="h-9 w-12 cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-0.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Màu chữ</label>
            <input type="color" value={tagTextColor} onChange={e => setTagTextColor(e.target.value)} className="h-9 w-12 cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-0.5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Màu viền</label>
            <input type="color" value={tagBorderColor} onChange={e => setTagBorderColor(e.target.value)} className="h-9 w-12 cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-0.5" />
          </div>
          <button type="submit" disabled={isAdding || !tagName.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center h-9 shadow-sm">
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Thêm Thẻ</>}
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          {tags.length === 0 ? (
            <div className="text-slate-500 dark:text-slate-400 text-sm italic w-full text-center py-6">Chưa có thẻ nào được tạo.</div>
          ) : (
            tags.map((tag: any) => (
              <div key={tag.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium shadow-sm transition-all bg-white hover:bg-slate-50 dark:hover:bg-slate-700" style={{ backgroundColor: parseColor(tag.color).bg, color: parseColor(tag.color).text, borderColor: parseColor(tag.color).border }}>
                
                {tag.tag_name}
                <button onClick={() => handleDelete(tag.id)} className="ml-1 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
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