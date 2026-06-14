import { z } from "zod/v4";
import { resErr } from "./resp";

// ==================== Auth ====================

export const RegisterInput = z.object({
  name: z.string().min(1, "名称不能为空").max(50),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
});
export type RegisterInput = z.infer<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "密码不能为空"),
});
export type LoginInput = z.infer<typeof LoginInput>;

// ==================== Agent ====================

export const AgentRunInput = z.object({
  question: z.string().optional(),
  threadId: z.string().optional(),
  resume: z.string().optional(),
});
export type AgentRunInput = z.infer<typeof AgentRunInput>;

export const AgentResumeInput = z.object({
  resume: z.string().optional(),
});
export type AgentResumeInput = z.infer<typeof AgentResumeInput>;

// ==================== Conversations ====================

export const ConversationCreateInput = z.object({
  threadId: z.string().optional(),
  title: z.string().optional(),
});
export type ConversationCreateInput = z.infer<typeof ConversationCreateInput>;

export const ConversationUpdateInput = z.object({
  title: z.string().optional(),
});
export type ConversationUpdateInput = z.infer<typeof ConversationUpdateInput>;

export const MessageAddInput = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  tool_calls: z.any().optional(),
  agent_steps: z.any().optional(),
  tokens: z.number().optional(),
});
export type MessageAddInput = z.infer<typeof MessageAddInput>;

export const MessageDeleteInput = z.object({
  message_ids: z.array(z.number()).length(2, "必须提供 2 个消息 ID（human + assistant）"),
});
export type MessageDeleteInput = z.infer<typeof MessageDeleteInput>;

// ==================== Documents ====================

export const DocumentCreateInput = z.object({
  text: z.string().min(1, "文本内容不能为空"),
  title: z.string().optional(),
  source: z.string().optional(),
});
export type DocumentCreateInput = z.infer<typeof DocumentCreateInput>;

// ==================== Search ====================

export const SearchInput = z.object({
  query: z.string().min(1, "查询不能为空"),
  limit: z.number().int().min(1).max(50).optional(),
  threshold: z.number().min(0).max(1).optional(),
  mode: z.enum(["hybrid", "vector", "keyword"]).optional(),
  useReranker: z.boolean().optional(),
  useExpansion: z.boolean().optional(),
});
export type SearchInput = z.infer<typeof SearchInput>;

// ==================== Chat ====================

export const ChatInput = z.object({
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
  })).min(1, "消息不能为空"),
});
export type ChatInput = z.infer<typeof ChatInput>;

// ==================== Embeddings ====================

export const EmbeddingInput = z.object({
  text: z.string().min(1, "文本内容不能为空"),
  chunkSize: z.number().int().min(64).max(4096).optional(),
  overlap: z.number().int().min(0).max(1024).optional(),
});
export type EmbeddingInput = z.infer<typeof EmbeddingInput>;

// ==================== Helper ====================

/** 从 request 解析 JSON 并校验，不合法时抛出 400 Response */
export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  const result = schema.safeParse(await req.json());
  if (!result.success) {
    throw resErr(400, "参数校验失败", result.error.issues);
  }
  return result.data;
}
