import OpenAI from "openai";
import { getEnv } from "@/lib/env";

/** 共享 OpenAI 客户端单例，避免每个路由重复创建连接 */
let _client: OpenAI | null = null;
let _embeddingClient: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    const env = getEnv();
    _client = new OpenAI({
      apiKey: env.LLM_API_KEY,
      baseURL: env.LLM_BASE_URL ?? "https://api.deepseek.com/v1",
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return _client;
}

/** Embedding 专用客户端 — 走 SiliconFlow（DeepSeek 无 embedding 服务） */
export function getEmbeddingClient(): OpenAI {
  if (!_embeddingClient) {
    const env = getEnv();
    _embeddingClient = new OpenAI({
      apiKey: env.SILICONFLOW_API_KEY,
      baseURL: env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1",
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return _embeddingClient;
}
