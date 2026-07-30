import fs from 'fs';
import path from 'path';

const workflowJSON = {
  "name": "Phase 3 - Auto Content Creator",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "*/5 * * * *"
            }
          ]
        }
      },
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [
        100,
        300
      ]
    },
    {
      "parameters": {
        "method": "GET",
        "url": "https://jrgkpbjsqefvnhbiiutz.supabase.co/rest/v1/phase2_content_items?state=eq.idea",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "apikey",
              "value": "sb_publishable_gGztlsTgCYmzn_JvkEBteQ_jueGATy4"
            },
            {
              "name": "Authorization",
              "value": "Bearer sb_publishable_gGztlsTgCYmzn_JvkEBteQ_jueGATy4"
            }
          ]
        },
        "options": {}
      },
      "name": "Fetch Ideas",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        300,
        300
      ]
    },
    {
      "parameters": {
        "fieldToSplitOut": "data",
        "options": {}
      },
      "name": "Split Items",
      "type": "n8n-nodes-base.splitOut",
      "typeVersion": 1,
      "position": [
        500,
        300
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://agent.pnmediaplus.com/api/phase3/generate-content",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Authorization",
              "value": "Bearer pn_media_os_super_secret_key_2026_xyz"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {
              "name": "contentItemId",
              "value": "={{ $json.id }}"
            }
          ]
        },
        "options": {}
      },
      "name": "Generate Content API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        700,
        300
      ]
    }
  ],
  "connections": {
    "Schedule Trigger": {
      "main": [
        [
          {
            "node": "Fetch Ideas",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Fetch Ideas": {
      "main": [
        [
          {
            "node": "Split Items",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Split Items": {
      "main": [
        [
          {
            "node": "Generate Content API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "active": false,
  "settings": {
    "executionOrder": "v1"
  }
};

const dir = path.join(process.cwd(), 'n8n/workflows');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(
  path.join(dir, 'PHASE3_AUTO_CONTENT_CREATOR.json'),
  JSON.stringify(workflowJSON, null, 2)
);

console.log("Phase 3 Auto Content Creator Workflow generated.");
