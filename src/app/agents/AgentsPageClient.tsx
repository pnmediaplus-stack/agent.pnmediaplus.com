"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { AgentCard } from "@/components/agents/AgentCard";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Agent } from "@/types/agent";

export function AgentsPageClient({ agents }: { agents: Agent[] }) {
  const { t } = useI18n("agents");

  return (
    <PageFrame
      title={t("agents.page.title") ?? "Agents"}
      purpose={t("agents.page.purpose") ?? "Directory of reasoning and artifact workers, grouped by department and current focus."}
      statusLabel={t("agents.page.statusLabel") ?? "Agent directory"}
      statusValue="REVIEW"
      allowedActions={[
        t("agents.page.allowed.inspectFocus") ?? "Inspect agent focus",
        t("agents.page.allowed.checkStatus") ?? "Check status",
        t("agents.page.allowed.reviewDepartmentMapping") ?? "Review department mapping"
      ]}
      forbiddenActions={[
        t("agents.page.forbidden.assignDestructiveWork") ?? "Assign destructive work",
        t("agents.page.forbidden.overrideAuthority") ?? "Override authority",
        t("agents.page.forbidden.publishArtifacts") ?? "Publish artifacts"
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </PageFrame>
  );
}
