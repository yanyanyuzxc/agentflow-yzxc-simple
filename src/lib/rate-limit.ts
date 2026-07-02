/**
 * 简单的令牌桶速率限制器。
 * 按 key（如 IP 或 userId）限流，每分钟 N 次。
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

/** 每 60 秒清理一次未使用的桶 */
setInterval(() => {
  const now = Date.now();
  for (const [key, b] of buckets) {
    if (now - b.lastRefill > 120_000) buckets.delete(key);
  }
}, 60_000).unref();

export interface RateLimitConfig {
  /** 每分钟允许的请求数 */
  rpm: number;
  /** 标识前缀（如 "llm", "agent", "api"），用于日志 */
  label: string;
}

/** 检查是否允许请求。返回 true=放行, false=限流 */
export function checkRate(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.rpm, lastRefill: now };
    buckets.set(key, bucket);
  }

  // 线性填充：每毫秒恢复 config.rpm / 60000 个 token
  const elapsed = now - bucket.lastRefill;
  const refill = (elapsed / 60_000) * config.rpm;
  bucket.tokens = Math.min(config.rpm, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

/** 获取剩余 token 数（用于调试） */
export function remainingTokens(key: string): number {
  return Math.floor(buckets.get(key)?.tokens ?? 0);
}

// ==================== 预设限流配置 ====================

export const RateLimits = {
  /** 鉴权接口：5 req/min（防暴力破解） */
  auth: { rpm: 5, label: "auth" } as RateLimitConfig,
  /** API 全局：60 req/min */
  api: { rpm: 60, label: "api" } as RateLimitConfig,
  /** Agent 调用：10 req/min（每次调用可能多次 LLM） */
  agent: { rpm: 10, label: "agent" } as RateLimitConfig,
} as const;
