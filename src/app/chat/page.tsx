import { loadChatThreads, loadChatMessages, loadAuditLogs } from "@/lib/phase1-loader";
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

  const auditLogsRes = await loadAuditLogs();

  return (
    <ChatPageClient
      thread={thread}
      messages={messages}
      auditLogs={auditLogsRes.data}
    />
  );
}
