-- 0005_memories_embedding
-- memories 表加 embedding 列，支持语义搜索

ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(1024);

CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);
