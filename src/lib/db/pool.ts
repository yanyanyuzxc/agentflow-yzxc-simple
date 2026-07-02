import { Pool } from "pg";
import { runMigrations } from "@/lib/migrate";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";

function createPool(): Pool {
  const connectionString = getEnv().DATABASE_URL;
  logger.info("[db] creating pool", { host: new URL(connectionString).host });

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    // Neon / Supabase 等云数据库必须走 SSL
    ssl: { rejectUnauthorized: false },
  });

  // 防止 PG 断连时进程崩溃（idle client 被后端踢掉时触发）
  pool.on("error", (err) => {
    logger.error("[db] pool error (idle client)", { error: err.message });
  });

  // 每个新连接设 statement_timeout
  pool.on("connect", async (client) => {
    await client.query("SET statement_timeout = '15s'");
  });

  return pool;
}

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) _pool = createPool();
  return _pool;
}

// 通过 Proxy 保持 pool.query() 等用法不变，同时延迟初始化
export const pool = new Proxy({} as Pool, {
  get(_, prop) { return (getPool() as any)[prop]; },
});

let initialized = false;

export async function initDB() {
  if (initialized) return;
  const applied = await runMigrations(pool);
  initialized = true;
  if (applied.length > 0) {
    logger.info("[db] migrations applied", { migrations: applied });
  }
}
