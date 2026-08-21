import { AI_ORCHESTRATOR_TOOLS } from "./tools/schema";

export type IntentResult = {
  intentType: "create_content" | "publish_content" | "plan_campaign" | "request_status" | "unknown";
  mappedCommand?: string;
  agentReply?: string;
};

/**
 * processHumanMessage routes a natural language message into a system command
 * using an LLM. It maps the intent to the existing strict backend commands.
 */

function parseVisionContent(text: string) {
  const imgRegex = /!\[.*?\]\(([^\s)]+)\)/g;
  const matches = [...text.matchAll(imgRegex)];
  
  if (matches.length === 0) return text;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agent.pnmediaplus.com";

  const contentArray: any[] = [];
  let lastIndex = 0;
  
  for (const match of matches) {
    const textPart = text.substring(lastIndex, match.index);
    if (textPart.trim()) {
      contentArray.push({ type: "text", text: textPart });
    }
    
    let url = match[1];
    if (url.startsWith('/')) {
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
    console.warn("AI Orchestrator: No OPENAI_API_KEY found. Falling back to basic NLP regex.");
    return fallbackRegexMatch(text);
  }

  const processedHistory = history.map(m => {
    return { ...m, content: typeof m.content === 'string' ? parseVisionContent(m.content) : m.content };
  });

  let messages: any[] = [
    {
      role: "system",
      content: "You are a highly capable AI Orchestrator for a marketing system. When interacting, always adopt a professional and respectful persona in the designated language. Your ONLY job is to call the appropriate tool to execute the user's task. NEVER pretend to execute tasks yourself. NEVER generate fake system success messages, invent IDs, or simulate workflow outputs. If you lack information, politely ask for it. You must rely purely on function calling for execution."
    },
    ...processedHistory,
    { role: "user", content: parseVisionContent(text) }
  ];

  let iterations = 0;
  const MAX_ITERATIONS = 5;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        return fallbackRegexMatch(text);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        
        messages.push(message); // append the assistant's tool call

        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch (parseErr) {
          console.error("[AI_ORCHESTRATOR_ERROR] Failed to parse tool arguments:", toolCall.function.arguments);
          return fallbackRegexMatch(text);
        }

        const funcName = toolCall.function.name;

        // --- WRITE / ACTION TOOLS (Terminate loop) ---
        if (funcName === "create_content") {
          return {
            intentType: "create_content",
            mappedCommand: args.content_item_id 
              ? `/auto_content ${args.content_item_id} ${args.topic}`
              : `/auto_content ${args.topic}`
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
        // The AI decided to ask a clarifying question or answer based on read tools
        return {
          intentType: "unknown",
          agentReply: message.content
        };
      } else {
        return fallbackRegexMatch(text);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("[AI_ORCHESTRATOR_ERROR] Exception during LLM routing:", error);
      return fallbackRegexMatch(text);
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
  
  if (lowerBody.includes('đăng nội dung') || lowerBody.includes('đăng bài') || lowerBody.includes('publish')) {
    return { intentType: 'publish_content' };
  } else if (lowerBody.includes('tạo nội dung') || lowerBody.includes('viết bài') || lowerBody.includes('lên bài')) {
    return { intentType: 'create_content' };
  } else if (lowerBody.includes('chiến dịch') || lowerBody.includes('campaign')) {
    return { intentType: 'plan_campaign' };
  }
  
  return { intentType: "unknown" };
}
