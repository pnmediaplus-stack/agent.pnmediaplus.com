# File Upload Strategy & Architecture

## Current Implementation (Phase 1)
**Method:** Base64 JSON Payload via Next.js API Routes.
**Status:** ACTIVE

### Rationale
During the initial deployment of the Chatbot, the standard `multipart/form-data` approach suffered from severe stalling issues when deployed behind an Nginx reverse proxy using Docker on Ubuntu. Next.js 13+ App Router's `req.formData()` implementation contains bugs that cause the stream to hang indefinitely when Nginx splits the request body into chunks or buffers it improperly (`Error: signal is aborted without reason`).

To completely bypass this unreliability, the system currently encodes files as Base64 strings on the frontend and transmits them within standard `application/json` payloads. Next.js natively parses JSON flawlessly across all environments, ensuring a 100% upload success rate.

### Limitations of Current Method
- **Payload Bloat:** Base64 encoding inflates the binary file size by approximately 33%.
- **Memory Overhead:** The Next.js Node.js process must load the entire Base64 string into RAM to parse the JSON. Uploading large files (e.g., 50MB+) risks high memory pressure and potential Out-Of-Memory (OOM) crashes if multiple users upload concurrently.

---

## Future Upgrade Path (Phase 2 - Large Files)
**Method:** Direct Upload via Presigned URLs (Cloudflare R2 / AWS S3)
**Status:** PLANNED FOR UPGRADE

### Rationale
When the system requirements expand to include large file uploads (videos, high-res PSDs, heavy datasets > 5MB), the Base64 JSON approach will no longer be viable. The system must transition to the Presigned URL architecture.

### Implementation Flow
1. **Request Ticket:** The Frontend (`ChatComposer`) requests an upload ticket from the Next.js API.
2. **Issue Presigned URL:** The Backend validates the user's permissions, generates a short-lived Presigned URL from the AWS S3 SDK for Cloudflare R2, and returns it to the client.
3. **Direct Upload:** The Frontend uploads the binary file (`PUT` request) directly to the Cloudflare R2 URL, bypassing the VPS completely.
4. **Notify Completion:** The Frontend notifies the Backend that the upload is complete, passing the object key so the Backend can persist the attachment record in Supabase.

### Architectural Benefits
- **Zero Bandwidth Load:** The Next.js VPS does not process the file stream.
- **Zero Memory Pressure:** The Next.js Node.js server uses no RAM for file parsing.
- **Infinite Scalability:** Uploads are handled directly by Cloudflare's global CDN infrastructure, eliminating any Nginx `client_max_body_size` limitations on the host machine.

### Migration Checklist
- [ ] Configure CORS policy on the Cloudflare R2 bucket to allow `PUT` requests from `agent.pnmediaplus.com`.
- [ ] Create a new Next.js API route: `GET /api/chat-attachments/presign`.
- [ ] Update `ChatComposer.tsx` to handle the 2-step upload flow.
- [ ] (Optional) Add webhooks to R2/S3 to verify file completion asynchronously.