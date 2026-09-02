"use client";

import { Check, RefreshCw, X } from "lucide-react";

export function ApprovalActionBar() {
  return (
    <div className="sticky top-0 flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-lg p-4 z-10">
      <div className="flex flex-col">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Pending Review: Q4 Webinar Campaign</h3>
        <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">Awaiting Manager Approval</span>
      </div>
      
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <X className="w-4 h-4" />
          Reject
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Regenerate
        </button>
        <button className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-sm transition-colors shadow-sm">
          <Check className="w-4 h-4" />
          Approve & Publish
        </button>
      </div>
    </div>
  );
}
