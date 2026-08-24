export const AI_ORCHESTRATOR_TOOLS = [
  {
    type: "function",
    function: {
      name: "duplicate_content",
      description: "Duplicate or clone an existing content item perfectly (reusing its exact text and images) to get a new ID for publishing to a different page.",
      parameters: {
        type: "object",
        properties: {
          content_item_id: { type: "string", description: "The ID of the existing content item to duplicate" }
        },
        required: ["content_item_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_content",
      description: "Trigger the creation of marketing content or viral research for a campaign or topic. MUST be called whenever the user asks to write (viết), draft, create a post, or asks for a sample article (bài mẫu).",
      parameters: {
        type: "object",
        properties: {
          content_item_id: { type: "string", description: "Optional ID to UPDATE an existing item." },
          topic: { type: "string", description: "The brief or topic to write about" },
          image_action: { type: "string", enum: ["use_provided", "generate_new"], description: "If the user uploaded images and wants to post them directly, use 'use_provided'. If they want to draw, redraw, or generate a NEW image based on references, use 'generate_new'." }
        },
        required: ["topic", "image_action"]
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
  },
  {
    type: "function",
    function: {
      name: "query_departments",
      description: "Read tool. Tra cứu danh sách các phòng ban (departments) đang hoạt động trong công ty.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_content_status",
      description: "Read tool. Kiểm tra trạng thái và điểm số QA của một bài viết dựa trên ID.",
      parameters: {
        type: "object",
        properties: {
          content_item_id: { type: "string", description: "ID của bài viết cần tra cứu" }
        },
        required: ["content_item_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_active_campaigns",
      description: "Read tool. Liệt kê các chiến dịch marketing đang chạy trong công ty.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];
