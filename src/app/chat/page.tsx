import { loadChatThreads, loadChatMessages, loadThreadAuditLogs } from "@/lib/phase1-loader";
import { ChatPageClient } from "./ChatPageClient";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const threadsRes = await loadChatThreads();
  const thread = threadsRes.data[0];

  let messages: any[] = [];
  if (thread) {
    const messagesRes = await loadChatMessages(thread.id);
    messages = messagesRes.data;
  }

  let auditLogs: any[] = [];
  if (thread) {
    const auditLogsRes = await loadThreadAuditLogs(thread.id);
    auditLogs = auditLogsRes.data;
  }

  return (
    <ChatPageClient
      thread={thread}
      messages={messages}
      auditLogs={auditLogs}
    />
  );
}
