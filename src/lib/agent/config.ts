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
  /** 自定义 system prompt。设置后跳过默认的 buildSystemPrompt() */
  readonly systemPrompt?: string;
  /** 禁用的工具名列表（如 analyst/writer 不需要 web_search） */
  readonly disabledTools?: string[];

  constructor(overrides?: Partial<{
    apiKey: string;
    baseURL: string;
    model: string;
    embeddingModel: string;
    embeddingBaseURL: string;
    dbUrl: string;
    interruptAfter: string[];
    systemPrompt: string;
    disabledTools: string[];
  }>) {
    const env = getEnv();
    this.apiKey = overrides?.apiKey ?? env.LLM_API_KEY ?? env.SILICONFLOW_API_KEY;
    this.baseURL = overrides?.baseURL ?? env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1";
    this.model = overrides?.model ?? env.LLM_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash";
    this.embeddingModel = overrides?.embeddingModel ?? env.EMBEDDING_MODEL ?? "BAAI/bge-m3";
    this.embeddingBaseURL = overrides?.embeddingBaseURL ?? env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1";
    this.dbUrl = overrides?.dbUrl ?? env.DATABASE_URL;
    this.interruptAfter = overrides?.interruptAfter ?? [];
    this.systemPrompt = overrides?.systemPrompt;
    this.disabledTools = overrides?.disabledTools;
  }
}
