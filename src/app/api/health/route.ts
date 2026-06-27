import { pool } from "@/lib/db/pool";
import { resOk, resErr } from "@/lib/resp";
import { getEnv } from "@/lib/env";

export async function GET() {
  const checks: Record<string, { ok: boolean; ms: number; error?: string }> = {};

  // 1. 数据库连通性
  const dbStart = performance.now();
  try {
    await pool.query("SELECT 1");
    checks.db = { ok: true, ms: Math.round(performance.now() - dbStart) };
  } catch (e) {
    checks.db = { ok: false, ms: Math.round(performance.now() - dbStart), error: (e as Error).message };
  }

  // 2. Embedding API 连通性（快速 ping）
  const apiStart = performance.now();
  try {
    const env = getEnv();
    const res = await fetch(`${env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1"}/models`, {
      headers: { Authorization: `Bearer ${env.SILICONFLOW_API_KEY}` },
      signal: AbortSignal.timeout(5000),
    });
    checks.llm_api = { ok: res.ok, ms: Math.round(performance.now() - apiStart) };
  } catch (e) {
    checks.llm_api = { ok: false, ms: Math.round(performance.now() - apiStart), error: (e as Error).message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  return allOk
    ? resOk({ status: "healthy", checks })
    : resErr(503, "unhealthy", checks);
}
