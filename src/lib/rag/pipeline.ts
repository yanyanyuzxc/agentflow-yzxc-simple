import type { ChunkOptions, TextChunk, RerankResult, RerankOptions, RagPipelineConfig } from "./types";
import { logger } from "@/lib/log";

// ==================== Token 估算 ====================

const SENTENCE_BOUNDARY = /(?<=[。！？.!?\n])\s*/g;
const PARAGRAPH_BOUNDARY = /\n{2,}/;
const LINE_BOUNDARY = /\n/;

function estimateTokens(text: string): number {
  let tokens = 0;
  for (const ch of text) {
    if (/[一-鿿㐀-䶿]/.test(ch)) {
      tokens += 1;
    } else if (!/\s/.test(ch)) {
      tokens += 0.3;
    }
  }
  return Math.ceil(tokens);
}

function splitByDelimiter(text: string, delimiter: RegExp): string[] {
  return text.split(delimiter).filter((s) => s.trim().length > 0);
}

function buildOverlap(text: string, overlapTokens: number): string {
  const sentences = text.split(SENTENCE_BOUNDARY).filter((s) => s.trim());
  let overlapText = "";
  let tokens = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    const st = estimateTokens(s);
    if (tokens + st > overlapTokens) break;
    overlapText = s + overlapText;
    tokens += st;
  }
  return overlapText;
}

// ==================== Query Expansion Prompt ====================

const EXPANSION_PROMPT = `你是一个搜索专家。请将用户的提问改写成 3 个不同的搜索词，覆盖不同的角度和关键词。

要求：
- 每个搜索词用中文，简洁完整
- 从不同角度改写（同义词、上下位概念、不同侧重点）
- 直接输出搜索词，每行一个，不要序号和多余文字

用户提问：`;

// ==================== RagPipeline ====================

/**
 * RagPipeline — RAG 处理管线。
 *
 * 组合了文本切片、查询扩展、重排序三个环节，
 * 共享 SiliconFlow API 配置（key、模型名、endpoint）。
 *
 * @example
 * const rag = new RagPipeline();
 * const chunks = rag.chunk(longText, { chunkSize: 512 });
 * const queries = await rag.expandQuery("用户问题");
 * const ranked = await rag.rerank("查询", docs);
 */
import { getEnv } from "@/lib/env";

export class RagPipeline {
  readonly config: Required<RagPipelineConfig>;

  constructor(config: RagPipelineConfig = {}) {
    const env = getEnv();
    this.config = {
      chatApiKey: config.chatApiKey ?? env.LLM_API_KEY ?? "",
      embeddingApiKey: config.embeddingApiKey ?? env.SILICONFLOW_API_KEY,
      embeddingModel: config.embeddingModel ?? env.EMBEDDING_MODEL ?? "BAAI/bge-m3",
      embeddingBaseURL: config.embeddingBaseURL ?? env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1",
      chatModel: config.chatModel ?? env.LLM_MODEL ?? "deepseek-chat",
      chatBaseURL: config.chatBaseURL ?? env.LLM_BASE_URL ?? "https://api.deepseek.com/v1",
    };
  }

  /** Embedding API 完整 URL */
  private get embeddingURL(): string {
    return `${this.config.embeddingBaseURL}/embeddings`;
  }

  /** Chat Completions API 完整 URL */
  private get chatURL(): string {
    return `${this.config.chatBaseURL}/chat/completions`;
  }

  /** Rerank API 完整 URL（走 SiliconFlow，DeepSeek 无此服务） */
  private get rerankURL(): string {
    return `${this.config.embeddingBaseURL}/rerank`;
  }

  // ==================== Chunk ====================

  /**
   * 递归文本切片，针对中英混合优化。
   * 按段落 → 句子 → 固定长度的优先级切分，带 overlap。
   */
  chunk(text: string, options: ChunkOptions = {}): TextChunk[] {
    const { chunkSize = 512, overlap = 64, maxChunks = 100 } = options;

    if (!text || text.trim().length === 0) return [];

    const totalTokens = estimateTokens(text);
    if (totalTokens <= chunkSize) {
      return [{ index: 0, text: text.trim(), estimatedTokens: totalTokens }];
    }

    let fragments: string[];
    if (PARAGRAPH_BOUNDARY.test(text)) {
      fragments = splitByDelimiter(text, PARAGRAPH_BOUNDARY);
    } else if (LINE_BOUNDARY.test(text)) {
      fragments = splitByDelimiter(text, LINE_BOUNDARY);
    } else {
      fragments = text.split(SENTENCE_BOUNDARY).filter((s) => s.trim().length > 0);
    }

    const chunks: TextChunk[] = [];
    let currentChunk = "";
    let index = 0;

    for (const fragment of fragments) {
      const combined = currentChunk ? currentChunk + "\n" + fragment : fragment;
      const combinedTokens = estimateTokens(combined);

      if (combinedTokens > chunkSize && currentChunk) {
        chunks.push({
          index: index++,
          text: currentChunk.trim(),
          estimatedTokens: estimateTokens(currentChunk),
        });

        if (chunks.length >= maxChunks) break;

        const overlapText = buildOverlap(currentChunk, overlap);
        currentChunk = overlapText ? overlapText + "\n" + fragment : fragment;
      } else {
        currentChunk = combined;
      }
    }

    if (currentChunk.trim() && chunks.length < maxChunks) {
      chunks.push({
        index,
        text: currentChunk.trim(),
        estimatedTokens: estimateTokens(currentChunk),
      });
    }

    return chunks;
  }

  // ==================== Query Expansion ====================

  /**
   * 查询扩展：用 LLM 从不同角度改写用户问题，返回去重后的查询列表。
   */
  async expandQuery(userQuery: string): Promise<string[]> {
    const response = await fetch(this.chatURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.chatApiKey}`,
      },
      body: JSON.stringify({
        model: this.config.chatModel,
        messages: [
          { role: "system", content: EXPANSION_PROMPT },
          { role: "user", content: userQuery },
        ],
        max_tokens: 128,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      logger.error("Query expansion API error", { status: response.status });
      return [userQuery];
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    const lines = content
      .split("\n")
      .map((l: string) => l.replace(/^[\d.\-*。]+\s*/, "").trim())
      .filter((l: string) => l.length > 0);

    const all = [userQuery, ...lines];
    return Array.from(new Set(all)).slice(0, 4);
  }

  // ==================== Token Budget ====================

  /**
   * 按 token 预算截断检索结果，避免撑爆 LLM 上下文。
   * 假设 chunks 已按相关度降序排列。
   */
  fitBudget<T>(
    chunks: T[],
    maxTokens: number,
    tokenKey: (item: T) => number = (item: any) => item.estimatedTokens ?? item.estimated_tokens ?? 0,
  ): T[] {
    const selected: T[] = [];
    let used = 0;
    for (const c of chunks) {
      const tokens = tokenKey(c);
      if (used + tokens > maxTokens) break;
      selected.push(c);
      used += tokens;
    }
    return selected;
  }

  // ==================== Rerank ====================

  /**
   * 对候选文档重排序。
   */
  async rerank(
    query: string,
    documents: string[],
    options: RerankOptions = {},
  ): Promise<RerankResult[]> {
    const env = getEnv();
    const { model = env.RERANKER_MODEL ?? "BAAI/bge-reranker-v2-m3", topN } = options;

    if (documents.length === 0) return [];

    const body: Record<string, any> = { model, query, documents };
    if (topN) body.top_n = topN;

    const response = await fetch(this.rerankURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.embeddingApiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Reranker API error: ${response.status}`);
    }

    const data = await response.json();
    return data.results;
  }
}
