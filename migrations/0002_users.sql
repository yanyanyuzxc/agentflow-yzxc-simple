-- 0002_users
-- 用户表 + conversations 外键 + documents user_id

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建默认用户（占位 id=1，适配旧数据）
INSERT INTO users (id, name, email, password_hash)
VALUES (1, '默认用户', 'default@local', 'migration_placeholder')
ON CONFLICT (id) DO NOTHING;

-- 修正序列，确保后续注册从 max(id)+1 开始
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));

-- conversations: 去掉默认值，建立 FK
DO $$ BEGIN
  ALTER TABLE conversations ALTER COLUMN user_id DROP DEFAULT;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_conversations_user'
  ) THEN
    ALTER TABLE conversations ADD CONSTRAINT fk_conversations_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- documents: 增加 user_id
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id INTEGER;
