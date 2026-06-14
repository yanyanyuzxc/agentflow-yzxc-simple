-- 缺失的性能索引（审计发现的全表扫描）

-- 消息时间截断（rewindToMessage 按 created_at >= cutoff 删）
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 对话列表排序（listConversations 按 user_id + updated_at DESC）
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

-- 文档用户过滤（所有文档查询带 WHERE user_id）
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);

-- 消息加载排序（getMessages 按 conversation_id + created_at ASC）
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON messages(conversation_id, created_at);
