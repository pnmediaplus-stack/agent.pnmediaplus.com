import { invokeLlm } from "../src/lib/llm-client";

async function main() {
  try {
    console.log("Starting test...");
    const payload = {
      provider: "kie_ai",
      model: "nano-banana-2-lite",
      prompt: "A beautiful landscape",
      n: 1,
      size: "1024x1024"
    };
    
    // We need tenantId. Lets look at the N8N screenshot for tenant_id:
    // "tenant_id": "8289488a-b255-4cb6-9bff-c9d2e71af160"
    const options = {
      tenantId: "8289488a-b255-4cb6-9bff-c9d2e71af160",
      actorId: "system"
    };
    
    const result = await invokeLlm(payload, options);
    console.log("SUCCESS:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("ERROR:", err);
  }
}

main();
