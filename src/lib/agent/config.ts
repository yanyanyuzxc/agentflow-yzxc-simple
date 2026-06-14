import { getEnv } from "@/lib/env";

/**
 * AgentConfig — Agent 的配置值对象。
 *
 * 集中管理 LLM 连接、模型选择、checkpointer 等配置，
 * 避免散落在各处环境变量读取。
 */
export class AgentConfig {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly model: string;
  readonly embeddingModel: string;
  readonly embeddingBaseURL: string;
  readonly dbUrl: string;
  /** 每次工具调用后是否自动中断等待确认 */
  readonly interruptAfter: string[];

  constructor(overrides?: Partial<{
    apiKey: string;
    baseURL: string;
    model: string;
    embeddingModel: string;
    embeddingBaseURL: string;
    dbUrl: string;
    interruptAfter: string[];
  }>) {
    const env = getEnv();
    this.apiKey = overrides?.apiKey ?? env.SILICONFLOW_API_KEY;
    this.baseURL = overrides?.baseURL ?? env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1";
    this.model = overrides?.model ?? env.LLM_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
    this.embeddingModel = overrides?.embeddingModel ?? env.EMBEDDING_MODEL ?? "BAAI/bge-m3";
    this.embeddingBaseURL = overrides?.embeddingBaseURL ?? env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1";
    this.dbUrl = overrides?.dbUrl ?? env.DATABASE_URL;
    this.interruptAfter = overrides?.interruptAfter ?? [];
  }
}
