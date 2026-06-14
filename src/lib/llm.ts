import OpenAI from "openai";
import { getEnv } from "@/lib/env";

/** 共享 OpenAI 客户端单例，避免每个路由重复创建连接 */
let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const env = getEnv();
    _client = new OpenAI({
      apiKey: env.SILICONFLOW_API_KEY,
      baseURL: env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1",
      timeout: 30000, // 嵌入/LLM 调用统一 30s 超时
      maxRetries: 2,
    });
  }
  return _client;
}
