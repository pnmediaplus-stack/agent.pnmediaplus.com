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
export async function processHumanMessage(text: string): Promise<IntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("AI Orchestrator: No OPENAI_API_KEY found. Falling back to basic NLP regex.");
    return fallbackRegexMatch(text);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI Orchestrator for a marketing system. The user will ask you to do tasks. Call the appropriate tool to execute the task. If you don't have enough information (like missing integration_key or topic), do NOT call a tool, just ask the user for the missing info in Vietnamese."
          },
          { role: "user", content: text }
        ],
        tools: AI_ORCHESTRATOR_TOOLS,
        tool_choice: "auto",
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error("AI Orchestrator LLM call failed:", response.statusText);
      return fallbackRegexMatch(text);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments || "{}");

      switch (toolCall.function.name) {
        case "create_content":
          return {
            intentType: "create_content",
            mappedCommand: `/auto_content ${args.content_item_id || "new"} ${args.topic}`
          };
        case "publish_content":
          return {
            intentType: "publish_content",
            mappedCommand: `/publish integration_key:${args.integration_key} ${args.content_item_id || ""}`
          };
        case "plan_campaign":
          return {
            intentType: "plan_campaign",
            mappedCommand: `/plan_campaign department_name:${args.department_name} ${args.brief}`
          };
        default:
          return fallbackRegexMatch(text);
      }
    } else if (message?.content) {
      // The AI decided to ask a clarifying question
      return {
        intentType: "unknown",
        agentReply: message.content
      };
    }

    return fallbackRegexMatch(text);
  } catch (error) {
    console.error("AI Orchestrator error:", error);
    return fallbackRegexMatch(text);
  }
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
