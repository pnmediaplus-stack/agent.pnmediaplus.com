# Bản Thiết Kế Phase 7: Di Dời AI Agent Sang N8N Orchestrator

## 1. Phân Tích Hiện Trạng
Hiện tại, 4 AI Agents đang được đặt nguyên khối (Monolithic) bên trong các Next.js API Routes:
- `api/phase2/generate-lessons` (Data Analyst AI)
- `api/phase3/generate-content` (Copywriter AI)
- `api/phase4/generate-campaign` (Campaign Planner AI)
- `api/phase5/analyze-strategy` (CMO AI)

**Vấn đề:**
- Next.js phải tự viết Prompt, tự gọi OpenAI, tự phân rã JSON, tự Loop và ghi Database. 
- Nguy cơ Timeout cực cao (Vercel limits).
- Vi phạm nguyên tắc: N8N là Orchestrator/Automation Factory, còn Next.js chỉ nên là Proxy/Cổng bảo vệ.

## 2. Kiến trúc giải pháp (Option B: Forwarder Proxy)
Chúng ta sẽ biến N8N thành công xưởng thực thi chính, Next.js lui về làm Proxy.

**Luồng hoạt động mới:**
1. **Frontend (UI)** gọi Next.js API (VD: `POST /api/phase4/generate-campaign`).
2. **Next.js (Forwarder Proxy)**: Nhận request, kiểm tra Auth (verifyUiAuth), và thay vì tự gọi OpenAI, nó sẽ bắn Webhook sang cho N8N.
3. **N8N Workflow (Nhạc trưởng)**: 
   - Kích hoạt qua Webhook Node.
   - Dùng HTTP Node gọi lại cổng `/api/phase2/ai-broker` của Next.js (chỉ để xin Quota và gọi LLM an toàn).
   - Dùng Code Node bóc tách JSON Ideas.
   - Dùng HTTP Node (Supabase REST) ghi dữ liệu xuống Database.
4. N8N kết thúc và trả Response (Respond to Webhook). Next.js nhận được kết quả và trả về cho Frontend.

## 3. Lợi ích
- Không làm lộ URL của N8N Webhook ra Frontend.
- N8N gánh toàn bộ logic Prompt, Loop và Database Insert.
- Vẫn giữ được Audit Log và Quota Management của `ai-broker` ở Next.js.
- Không còn bất kỳ AI Agent Monolithic nào tồn tại trong Next.js.
