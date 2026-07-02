// ==================== 用户 ====================

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
}

// ==================== Agent 配置 ====================

export interface AgentToolConfig {
  name: string;
  description: string;
  enabled: boolean;
  schema?: Record<string, unknown>;
}

export interface AgentModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface AgentConfig {
  id?: number;
  user_id?: number;
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  params: AgentModelParams;
  tools: AgentToolConfig[];
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

// ==================== 对话 ====================

export interface Conversation {
  id: number;
  user_id: number;
  agent_id?: number;
  thread_id: string;
  title: string;
  pinned: boolean;
  tags: string[];
  message_count: number;
  updated_at: string;
  created_at: string;
}

export interface ImageAttachment {
  url: string;       // "/api/images/xxx.png"
  name: string;      // 原始文件名
  question?: string; // 关于图片的问题
}

export interface DocumentAttachment {
  name: string;       // 原始文件名
  type: string;       // txt | md | pdf | docx
  size: number;       // 字节
  text: string;       // 解析后的纯文本
  tokens: number;     // 估算 token 数
  truncated: boolean; // 是否被截断
}

export interface Message {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  images?: ImageAttachment[];
  documents?: DocumentAttachment[];
  tool_calls?: ToolCallPayload[];
  agent_steps?: string; // JSON-serialized AgentStep[]
  tokens?: number;
  created_at: string;
}

export interface ToolCallPayload {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

// ==================== 知识库 ====================

export interface KnowledgeBase {
  id: number;
  user_id: number;
  name: string;
  description: string;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  knowledge_base_id?: number;
  user_id?: number;
  title: string;
  source: string;
  file_type?: string;
  file_size?: number;
  chunk_count: number;
  status: "processing" | "ready" | "error";
  created_at: string;
}

export interface Chunk {
  id: number;
  document_id: number;
  chunk_index: number;
  text: string;
  estimated_tokens: number;
  similarity?: number;
}

// ==================== 文件 ====================

export type FileStatus = "uploading" | "processing" | "ready" | "error";

export interface FileItem {
  id: number;
  user_id: number;
  name: string;
  size: number;
  type: string;
  url: string;
  status: FileStatus;
  error?: string;
  created_at: string;
}
