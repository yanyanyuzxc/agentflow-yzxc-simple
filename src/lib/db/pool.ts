import { Pool } from "pg";
import { runMigrations } from "@/lib/migrate";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";

export const pool = new Pool({
  connectionString: getEnv().DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// 防止 PG 断连时进程崩溃（idle client 被后端踢掉时触发）
pool.on("error", (err) => {
  logger.error("[db] pool error (idle client)", { error: err.message });
});

// 每个新连接设 statement_timeout
pool.on("connect", async (client) => {
  await client.query("SET statement_timeout = '15s'");
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
