import type { User, Conversation, Message, Document, Chunk, FileItem } from "./models";
import type { AgentStep, InterruptData, SSEEventPayloadMap } from "./agent";

// ==================== 通用 ====================

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// ==================== Auth ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ==================== Agent ====================

export interface AgentRunRequest {
  question: string;
  threadId?: string;
  agentId?: number;
}

export interface AgentResumeRequest {
  resume?: string;
}

export interface AgentStatusResponse {
  threadId: string;
  interrupted: boolean;
  interruptData?: InterruptData;
  steps: AgentStep[];
  answer?: string;
}

// SSE 事件类型
export type SSEEventType = keyof SSEEventPayloadMap;
export type SSEEventPayload<T extends SSEEventType> = SSEEventPayloadMap[T];

// ==================== Conversations ====================

export type ConversationListResponse = Conversation[];

export interface MessageListResponse {
  messages: Message[];
  total: number;
}

export interface CreateConversationRequest {
  title?: string;
  agentId?: number;
}

// ==================== Documents ====================

export type DocumentListResponse = Document[];

export type ChunkListResponse = Chunk[];

export interface DocumentStoreRequest {
  text: string;
  title?: string;
  source?: string;
  knowledgeBaseId?: number;
}

export interface DocumentStoreResponse {
  success: boolean;
  documentId: number;
  totalChunks: number;
}

// ==================== Search ====================

export type SearchMode = "semantic" | "keyword" | "hybrid";

export interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  mode?: SearchMode;
  useReranker?: boolean;
  useExpansion?: boolean;
  knowledgeBaseIds?: number[];
}

export interface SearchResultItem {
  id: number;
  document_id: number;
  chunk_index: number;
  text: string;
  estimated_tokens: number;
  title: string;
  similarity: number;
  keyword_score?: number;
  semantic_score?: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  reranked?: boolean;
  expanded?: string[];
  results: SearchResultItem[];
}

// ==================== Files ====================

export interface FileUploadResponse {
  success: boolean;
  file: FileItem;
}

export type FileListResponse = FileItem[];

// ==================== Knowledge Bases ====================

export interface CreateKnowledgeBaseRequest {
  name: string;
  description?: string;
}

export interface KnowledgeBaseListResponse {
  knowledgeBases: import("./models").KnowledgeBase[];
  total: number;
}
