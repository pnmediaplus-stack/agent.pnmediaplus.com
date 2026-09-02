"use client";

import { Send } from "lucide-react";
import { useState } from "react";

export function CommandInput() {
  const [value, setValue] = useState("");

  return (
    <div className="sticky bottom-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar">
        <button className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Create email sequence
        </button>
        <button className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Draft ad copy
        </button>
      </div>
      <div className="relative flex items-end bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask agent to generate or modify campaign..."
          className="w-full resize-none bg-transparent px-4 py-3 text-sm focus:outline-none min-h-[44px] max-h-[120px]"
          rows={1}
        />
        <button 
          className="m-1 p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-slate-400 dark:disabled:bg-slate-600"
          disabled={!value.trim()}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
