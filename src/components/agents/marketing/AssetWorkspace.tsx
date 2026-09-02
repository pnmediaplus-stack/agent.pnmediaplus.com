"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ApprovalActionBar } from "./ApprovalActionBar";
import { Code, Eye, FileText, Layers } from "lucide-react";

const mockMarkdown = `
# Q4 SaaS Webinar: Scaling Engineering Teams

**Target Audience:** CTOs, VPs of Engineering, Lead Developers.
**Objective:** Drive 500+ registrations for the upcoming Q4 webinar.

## Email 1: Invitation
**Subject:** Scale your engineering team without losing velocity
**Body:**
Hi {{first_name}},

Scaling an engineering team is hard. You want to ship faster, but adding more developers often slows you down initially. 

Join our webinar on Oct 15th where we'll discuss the exact frameworks used by top-tier SaaS companies to maintain high velocity while doubling their headcount.

[Register Now]
`;

const mockJSON = {
  campaign_name: "Q4_SaaS_Webinar",
  target_audience: ["CTO", "VP Engineering", "Lead Developer"],
  budget_allocation: {
    linkedin_ads: 5000,
    twitter_ads: 2000,
    email_sponsorships: 3000
  },
  projected_roi: "250%",
  kpis: {
    registrations: 500,
    attendees: 200,
    mqls: 50
  }
};

export function AssetWorkspace() {
  const [activeTab, setActiveTab] = useState<"preview" | "content" | "data">("content");

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto gap-6 relative">
      <ApprovalActionBar />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "content" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <FileText className="w-4 h-4" />
          Draft Content
        </button>
        <button 
          onClick={() => setActiveTab("data")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "data" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Code className="w-4 h-4" />
          Campaign Data
        </button>
        <button 
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "preview" ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}`}
        >
          <Eye className="w-4 h-4" />
          Visual Preview
        </button>
      </div>

      {/* Workspace Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm p-8 min-h-[500px]">
        {activeTab === "content" && (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <ReactMarkdown>{mockMarkdown}</ReactMarkdown>
          </div>
        )}

        {activeTab === "data" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Campaign Proposal Data</h3>
            </div>
            <pre className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto text-sm text-slate-800 dark:text-slate-300 font-mono">
              {JSON.stringify(mockJSON, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === "preview" && (
          <div className="flex items-center justify-center h-[400px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950/50 text-slate-500">
            <div className="text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p>Visual preview not available for this asset type yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
