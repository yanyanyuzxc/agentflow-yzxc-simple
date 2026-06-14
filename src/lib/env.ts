import { z } from "zod/v4";

// ==================== 环境变量 Schema ====================

const envSchema = z.object({
  SILICONFLOW_API_KEY: z.string().min(1, "SILICONFLOW_API_KEY 未设置"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL 未设置").startsWith("postgresql://", "DATABASE_URL 必须以 postgresql:// 开头"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET 至少 32 字符"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET 至少 32 字符"),
  // 可选：覆盖默认模型 / API 地址
  LLM_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
  EMBEDDING_MODEL: z.string().optional(),
  RERANKER_MODEL: z.string().optional(),
  // 可选：Tavily 搜索 API key（免费注册 https://tavily.com）
  TAVILY_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** 启动时调用一次，校验失败直接抛错阻止启动 */
export function validateEnv(): Env {
  return envSchema.parse(process.env);
}

/** 懒加载的缓存，避免重复校验 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) _env = validateEnv();
  return _env;
}
