"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

export function ApprovalActionBar() {
  const { t } = useI18n("agents");

  return (
    <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-4 shrink-0">
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("agents.marketing.approval.title") ?? "Pending Review: Q4 Webinar Campaign"}</h3>
        <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">{t("agents.marketing.approval.status") ?? "Awaiting Manager Approval"}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <X className="w-3.5 h-3.5" />
          {t("agents.marketing.approval.reject") ?? "Reject"}
        </button>
        <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          {t("agents.marketing.approval.regenerate") ?? "Regenerate"}
        </button>
        <button type="button" className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors shadow-xs">
          <Check className="w-3.5 h-3.5" />
          {t("agents.marketing.approval.approvePublish") ?? "Approve & Publish"}
        </button>
      </div>
    </div>
  );
}
