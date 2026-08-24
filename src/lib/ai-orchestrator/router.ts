import { AI_ORCHESTRATOR_TOOLS } from "./tools/schema";
import { generateR2PresignedDownloadUrl } from "../r2-client";

export type IntentResult = {
  intentType: "create_content" | "publish_content" | "plan_campaign" | "request_status" | "unknown";
  mappedCommand?: string;
  agentReply?: string;
};

/**
 * processHumanMessage routes a natural language message into a system command
 * using an LLM. It maps the intent to the existing strict backend commands.
 */




async function parseVisionContentAsync(text: string) {
  const imgRegex = /!\[.*?\]\(([^\s)]+)\)/g;
  const matches = Array.from(text.matchAll(imgRegex));
  
  if (matches.length === 0) return text;

  const contentArray: any[] = [];
  let lastIndex = 0;
  
  for (const match of matches) {
    const textPart = text.substring(lastIndex, match.index);
    if (textPart.trim()) {
      contentArray.push({ type: "text", text: textPart });
    }
    
    let url = match[1];
    
    // Resolve internal R2 URLs directly to bypass Next.js dev server deadlock
    if (url.startsWith('/api/assets/public/')) {
      const key = url.replace('/api/assets/public/', '');
      try {
        
        url = await generateR2PresignedDownloadUrl(key, 3600);
      } catch (err) {
        console.error("Failed to generate presigned URL for vision:", err);
      }
    } else if (url.startsWith('/')) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agent.pnmediaplus.com";
      url = baseUrl + url;
    }

    contentArray.push({ type: "image_url", image_url: { url } });
    
    lastIndex = match.index + match[0].length;
  }
  
  const remaining = text.substring(lastIndex);
  if (remaining.trim()) {
    contentArray.push({ type: "text", text: remaining });
  }
  
  return contentArray;
}

import { handleQueryDepartments, handleCheckContentStatus, handleListActiveCampaigns } from "./tools/read_handlers";

export async function processHumanMessage(text: string, history: any[] = [], organizationId: string = ""): Promise<IntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("AI Orchestrator: No OPENAI_API_KEY found.");
    return { intentType: "unknown", agentReply: "Thiếu cấu hình OPENAI_API_KEY. Không thể gọi AI Orchestrator." };
  }

  const processedHistory = await Promise.all(history.map(async m => {
    // SECURITY PATCH: Strip any lingering Base64 strings from history to prevent 200k Token Bomb
    if (typeof m.content === 'string') {
      // 1. Strip Base64
      m.content = m.content.replace(/data:image\/[^;]+;base64,[^\\)]+/g, 'BỨC_ẢNH_ĐÃ_BỊ_ẨN');
      
      // 2. Prevent Token Bomb from massive Research Packets or Workflow JSONs
      const jsonBlockRegex = /\*\*Research Packet:\*\*\s*```json[\s\S]*?```/g;
      m.content = m.content.replace(jsonBlockRegex, '**Research Packet:** [TRUNCATED_TO_SAVE_TOKENS]');
      
      // 3. General truncation for absurdly long assistant messages (over 3000 chars)
      if (m.role === 'assistant' && m.content.length > 3000) {
        m.content = m.content.substring(0, 3000) + '... [TRUNCATED_TO_SAVE_TOKENS]';
      }
    }
    
    // OpenAI strictly forbids image_url objects in 'assistant' or 'system' messages.
    // We must ONLY apply Vision parsing to 'user' messages.
    if (m.role === 'user' && typeof m.content === 'string') {
      return { ...m, content: await parseVisionContentAsync(m.content) };
    }
    return m; // Leave assistant messages as raw text/markdown
  }));

    let messages: any[] = [
    {
      role: "system",
      content: `You are the AI Orchestrator (Router) for a marketing system.

IMMUTABLE RULES:
1. You are strictly a Dispatcher. You DO NOT possess the capability to execute professional marketing tasks.
2. You MUST NEVER write marketing posts, draft content, generate images, or plan campaigns directly in the chat.
3. All professional execution is handled by specialized AI Agents in the n8n backend.
4. Whenever the user request involves creating content, publishing, or media generation—regardless of how they phrase it (e.g., 'give me a sample', 'draft this', 'write based on this image')—you MUST call the appropriate tool.
5. You may ONLY answer directly for purely general conversational questions (e.g., system explanations, greetings).
6. DUPLICATION RULE: If the user asks to 'duplicate', 'clone', or 'nhân bản' an existing content item, you MUST call create_content but you MUST NOT provide the content_item_id parameter. Leave it empty so a new ID is generated, and just pass the old content's text into the 'topic' parameter.

Violating these rules and attempting to do the specialized work yourself will break the entire system architecture.`
    },
    ...processedHistory,
    { role: "user", content: await parseVisionContentAsync(text) }
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for Vision

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          tools: AI_ORCHESTRATOR_TOOLS,
          tool_choice: "auto",
          temperature: 0.1
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(`[AI_ORCHESTRATOR_ERROR] LLM call failed with status ${response.status}: ${errText}`);
        return { intentType: "unknown", agentReply: `Lỗi kết nối AI (${response.status}): ${errText}` };
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      const routedIntent = message?.tool_calls?.[0]?.function?.name || null;

      const requestIntent = fallbackRegexMatch(text).intentType;
      const isProfessionalRequest =
        requestIntent === "create_content" ||
        requestIntent === "publish_content" ||
        requestIntent === "plan_campaign";

      

      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        
        messages.push(message); // append the assistant's tool call

        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch (parseErr: any) {
          console.error("[AI_ORCHESTRATOR_ERROR] Failed to parse tool arguments:", toolCall.function.arguments);
          return { intentType: "unknown", agentReply: `Lỗi AI: Tham số tool trả về không hợp lệ (${parseErr?.message || "Unknown"}).` };
        }

        const funcName = toolCall.function.name;

        // --- WRITE / ACTION TOOLS (Terminate loop) ---
        if (funcName === "create_content") {
          if (!args.image_action || !['use_provided', 'generate_new'].includes(args.image_action)) {
             return { intentType: "unknown", agentReply: "Lỗi AI: Thiếu hoặc sai tham số image_action bắt buộc trong lệnh tạo nội dung." };
          }
          const flag = args.image_action === 'use_provided' ? '--image-action=use_provided' : '--image-action=generate_new';
          return {
            intentType: "create_content",
            mappedCommand: args.content_item_id 
              ? `/auto_content ${args.content_item_id} ${flag} ${args.topic}`
              : `/auto_content ${flag} ${args.topic}`
          };
        } else if (funcName === "publish_content") {
          return {
            intentType: "publish_content",
            mappedCommand: `/publish integration_key:${args.integration_key} ${args.content_item_id || ""}`
          };
        } else if (funcName === "plan_campaign") {
          return {
            intentType: "plan_campaign",
            mappedCommand: `/plan_campaign department_name:${args.department_name}; ${args.brief}`
          };
        }
        
        // --- READ TOOLS (Continue loop) ---
        let toolResult = "";
        if (funcName === "query_departments") {
          toolResult = await handleQueryDepartments();
        } else if (funcName === "check_content_status") {
          toolResult = await handleCheckContentStatus(organizationId, args.content_item_id);
        } else if (funcName === "list_active_campaigns") {
          toolResult = await handleListActiveCampaigns(organizationId);
        } else {
          toolResult = JSON.stringify({ error: "Unknown tool" });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: funcName,
          content: toolResult
        });

      } else if (message?.content) {
        if (isProfessionalRequest && (!message?.tool_calls || message?.tool_calls?.length === 0)) {
          console.warn("[AI_ORCHESTRATOR_GUARD] Fallback routing activated for text-only professional request.");
          return fallbackRegexMatch(text);
        }
        // HARD ARCHITECTURAL GUARD:
        // If the user request demands professional execution (content/image/campaign),
        // we strictly forbid the AI from answering directly via text.
        

        // The AI decided to ask a clarifying question or answer based on read tools
        return {
          intentType: "unknown",
          agentReply: message.content
        };
      } else {
        return { intentType: "unknown", agentReply: "AI không trả về nội dung hoặc lệnh hợp lệ." };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("[AI_ORCHESTRATOR_ERROR] Exception during LLM routing:", error);
      return { intentType: "unknown", agentReply: `Ngoại lệ xử lý AI: ${error?.message || "Unknown error"}` };
    }
  }

  // If we hit MAX_ITERATIONS
  return {
    intentType: "unknown",
    agentReply: "Tôi đã thử tra cứu thông tin nhiều lần nhưng chưa xử lý xong, xin Sếp hãy thử lại hoặc chia nhỏ yêu cầu ra nhé."
  };
}

function fallbackRegexMatch(text: string): IntentResult {
  const lowerBody = text.toLowerCase();
  
  // create_content trumps publish_content if both are mentioned ("viết bài để đăng")
  if (/viết.*bài|tạo.*nội dung|lên.*bài|viết.*mẫu|viết.*content/i.test(lowerBody)) {
    return { intentType: 'create_content' };
  } else if (lowerBody.includes('đăng nội dung') || lowerBody.includes('đăng bài') || lowerBody.includes('publish') || lowerBody.includes('đăng lên')) {
    return { intentType: 'publish_content' };
  } else if (lowerBody.includes('chiến dịch') || lowerBody.includes('campaign')) {
    return { intentType: 'plan_campaign' };
  }
  
  return { intentType: "unknown" };
}
