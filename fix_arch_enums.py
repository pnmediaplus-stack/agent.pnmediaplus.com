import os
file_path = "C:/Users/truon/.gemini/antigravity/brain/04ba1e97-e4ba-4383-9a48-5b4683a2a2a6/knowledge_system_architecture.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix Enums
content = content.replace("DRAFT | REVIEW | APPROVED | ACTIVE | SUPERSEDED | DEPRECATED | ARCHIVED", "DRAFT | REVIEWED | APPROVED | ACTIVE | FAILED | SUPERSEDED | DEPRECATED | ARCHIVED")
content = content.replace("DRAFT -> REVIEW:", "DRAFT -> REVIEWED:")
content = content.replace("REVIEW -> APPROVED:", "REVIEWED -> APPROVED:")
content = content.replace("idempotency_key: hash(org_id + campaign_id + version)", "idempotency_key: hash(org_id + campaign_id + version + handoff_type + destination)")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Enums fixed")
