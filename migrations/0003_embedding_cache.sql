-- 0003_embedding_cache
-- embedding 缓存表：按 text 的 SHA256 哈希去重，避免重复调用 embedding API

CREATE TABLE IF NOT EXISTS embedding_cache (
    id SERIAL PRIMARY KEY,
    text_hash CHAR(64) UNIQUE NOT NULL,
    text TEXT NOT NULL,
    embedding vector(1024) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_text_hash ON embedding_cache(text_hash);
