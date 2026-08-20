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
import { handleQueryDepartments, handleCheckContentStatus, handleListActiveCampaigns } from "./tools/read_handlers";

export async function processHumanMessage(text: string, history: any[] = [], organizationId: string = ""): Promise<IntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("AI Orchestrator: No OPENAI_API_KEY found. Falling back to basic NLP regex.");
    return fallbackRegexMatch(text);
  }

  let messages: any[] = [
    {
      role: "system",
      content: "You are a highly capable AI Orchestrator for a marketing system. Important: ALWAYS address the user as 'Sếp' (Boss) and refer to yourself as 'Tôi' (I) in Vietnamese. The user will ask you to do tasks. Call the appropriate tool to execute the task. If you don't have enough information (like missing integration_key or topic), do NOT call a tool, just politely ask the user for the missing info in Vietnamese using the correct pronouns. If you need to read internal data (like departments, active campaigns, or content status), call the Read Tools."
    },
    ...history,
    { role: "user", content: text }
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
