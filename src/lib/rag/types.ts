// ==================== Chunk ====================

export interface ChunkOptions {
  /** Target chunk size in estimated tokens (default 512) */
  chunkSize?: number;
  /** Overlap between chunks in estimated tokens (default 64) */
  overlap?: number;
  /** Max chunks to produce (default 100, prevents runaway) */
  maxChunks?: number;
}

export interface TextChunk {
  index: number;
  text: string;
  estimatedTokens: number;
}

// ==================== Rerank ====================

export interface RerankResult {
  index: number;
  relevance_score: number;
}

export interface RerankOptions {
  model?: string;
  topN?: number;
}

// ==================== Pipeline Config ====================

export interface RagPipelineConfig {
  apiKey?: string;
  /** Embedding 模型名（默认 BAAI/bge-m3） */
  embeddingModel?: string;
  /** Embedding API 地址 */
  embeddingBaseURL?: string;
  /** Chat 模型名（用于 query expansion，默认 DeepSeek-V4-Flash） */
  chatModel?: string;
  /** Chat API 地址 */
  chatBaseURL?: string;
}
