-- 20260809000001_chat_messages_idempotency_idx.sql

-- Add idempotency_key column to chat_messages if it does not exist
ALTER TABLE pn_os_ai_department.chat_messages ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Add a unique constraint on the idempotency_key for chat_messages 
-- to ensure atomic deduplication of incoming callbacks from N8N.
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_idempotency_key_idx 
ON pn_os_ai_department.chat_messages (idempotency_key) 
WHERE idempotency_key IS NOT NULL;
