export const AI_ORCHESTRATOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_content",
      description: "Trigger the creation of marketing content or viral research for a campaign or topic.",
      parameters: {
        type: "object",
        properties: {
          content_item_id: { type: "string", description: "Optional ID of an existing content item to base this on" },
          topic: { type: "string", description: "The brief or topic to write about" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "publish_content",
      description: "Publish a content item to a specific page or integration.",
      parameters: {
        type: "object",
        properties: {
          integration_key: { type: "string", description: "The integration key (e.g. facebook_page_123)" },
          content_item_id: { type: "string", description: "Optional ID of the content item to publish" }
        },
        required: ["integration_key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "plan_campaign",
      description: "Plan a new marketing campaign and route it to a department.",
      parameters: {
        type: "object",
        properties: {
          department_name: { type: "string", description: "Name of the department to handle the campaign" },
          brief: { type: "string", description: "The campaign brief or instructions" }
        },
        required: ["department_name", "brief"]
      }
    }
  }
];
