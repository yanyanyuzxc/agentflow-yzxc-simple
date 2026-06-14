export { RagPipeline } from "./pipeline";
export type {
  ChunkOptions,
  TextChunk,
  RerankResult,
  RerankOptions,
  RagPipelineConfig,
} from "./types";

// ==================== 向后兼容：函数式 API ====================

import { RagPipeline } from "./pipeline";
import type { ChunkOptions, TextChunk, RerankResult, RerankOptions } from "./types";

const defaultPipeline = new RagPipeline();

/**
 * @deprecated 请使用 new RagPipeline().chunk()
 */
export function chunkText(text: string, options?: ChunkOptions): TextChunk[] {
  return defaultPipeline.chunk(text, options);
}

/**
 * @deprecated 请使用 new RagPipeline().expandQuery()
 */
export function expandQuery(userQuery: string): Promise<string[]> {
  return defaultPipeline.expandQuery(userQuery);
}

/**
 * @deprecated 请使用 new RagPipeline().rerank()
 */
export function rerank(
  query: string,
  documents: string[],
  options?: RerankOptions,
): Promise<RerankResult[]> {
  return defaultPipeline.rerank(query, documents, options);
}

/**
 * 按 token 预算截断检索结果。
 */
export function fitBudget<T>(
  chunks: T[],
  maxTokens: number,
  tokenKey?: (item: T) => number,
): T[] {
  return defaultPipeline.fitBudget(chunks, maxTokens, tokenKey);
}
