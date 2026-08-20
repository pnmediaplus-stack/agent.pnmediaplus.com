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
export async function processHumanMessage(text: string, history: { role: string, content: string }[] = []): Promise<IntentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("AI Orchestrator: No OPENAI_API_KEY found. Falling back to basic NLP regex.");
    return fallbackRegexMatch(text);
  }

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
        messages: [
          {
            role: "system",
            content: "You are a highly capable AI Orchestrator for a marketing system. Important: ALWAYS address the user as 'Sếp' (Boss) and refer to yourself as 'Tôi' (I) in Vietnamese. The user will ask you to do tasks. Call the appropriate tool to execute the task. If you don't have enough information (like missing integration_key or topic), do NOT call a tool, just politely ask the user for the missing info in Vietnamese using the correct pronouns."
          },
          ...history,
          { role: "user", content: text }
        ],
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
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (parseErr) {
        console.error("[AI_ORCHESTRATOR_ERROR] Failed to parse tool arguments:", toolCall.function.arguments);
        return fallbackRegexMatch(text);
      }

      switch (toolCall.function.name) {
        case "create_content":
          return {
            intentType: "create_content",
            mappedCommand: args.content_item_id 
              ? `/auto_content ${args.content_item_id} ${args.topic}`
              : `/auto_content ${args.topic}`
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
          console.warn("[AI_ORCHESTRATOR_WARN] Unknown tool called:", toolCall.function.name);
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
    clearTimeout(timeoutId);
    console.error("[AI_ORCHESTRATOR_ERROR] Exception during LLM routing:", error);
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
