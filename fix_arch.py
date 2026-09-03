import os
file_path = "C:/Users/truon/.gemini/antigravity/brain/04ba1e97-e4ba-4383-9a48-5b4683a2a2a6/knowledge_system_architecture.md"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacement = """  provenance:
    approved_by: user_xxxxxx # Bắt buộc phải có ở trạng thái APPROVED
    approved_at: timestamp
    confidence_score: 0.0 - 1.0
  
  versioning:
    version: "1.0"
    supersedes_id: ko_old_xxxxxx (optional)
    idempotency_key: hash(org_id + campaign_id + version) # Tránh tạo trùng lặp
"""

content = content.replace("  provenance:\n    approved_by: user_xxxxxx\n    approved_at: timestamp\n    confidence_score: 0.0 - 1.0", replacement)

new_section = """
## 7. Các Ràng buộc Kỹ thuật (Technical Constraints & Contracts)

Dựa trên yêu cầu của Gatekeeper, hệ thống phải tuân thủ nghiêm ngặt các quy tắc sau trước khi vào Implementation:

1. **State Transition & Authority:** 
   - Chuyển `DRAFT` -> `REVIEWED`: Chỉ Agent QA/Gatekeeper hoặc Manager mới có quyền.
   - Chuyển `REVIEWED` -> `APPROVED`: Bắt buộc phải do Human (Manager) thực hiện. Trường `approved_by` không được null.
   - Chuyển sang `ACTIVE`: Chỉ xảy ra khi N8N webhook gọi Callback trả về Ingestion Success. Việc insert DB chỉ đặt trạng thái là `PROCESSING`.
2. **Versioning & Idempotency:**
   - Mỗi lệnh Handoff phải kèm theo `idempotency_key`. DB phải có Unique Constraint cho `(organization_id, idempotency_key)` để chống lặp dữ liệu.
   - Khi update bản mới, Handoff cũ sẽ tự động chuyển state thành `DEPRECATED` dựa vào `supersedes_id`.
3. **RLS & API Authorization:**
   - Database Supabase phải kích hoạt Row Level Security (RLS). Agent thuộc phòng ban `cskh` chỉ được query `knowledge_objects` có `destination.namespaces` chứa `cskh` VÀ `organization_id` khớp với session. Tuyệt đối không đọc chéo dữ liệu.
4. **Retry/Rollback/Outbox Pattern:**
   - Nếu Storage tải lên thành công nhưng DB lỗi -> Storage tự động xóa/hoặc dùng cron dọn dẹp.
   - Nếu DB thành công nhưng N8N lỗi/timeout -> DB ghi nhận state `FAILED`. Giao diện hiện nút Retry gửi lại Webhook, không tạo Object mới.
5. **Audit Logging:**
   - Mọi thao tác: Extraction, Approval, Handoff, Deprecation, Archive đều phải được ghi log vào `audit_logs` phục vụ việc truy xuất nguồn gốc.
"""

content += new_section

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Arch updated")
