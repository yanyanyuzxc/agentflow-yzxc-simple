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

export const ImageAttachmentInput = z.object({
  url: z.string().min(1).describe("图片URL"),
  question: z.string().optional().describe("关于图片的具体问题"),
});
export type ImageAttachmentInput = z.infer<typeof ImageAttachmentInput>;

export const DocumentAttachmentInput = z.object({
  name: z.string(),
  type: z.string(),
  size: z.number(),
  text: z.string(),
  tokens: z.number(),
  truncated: z.boolean(),
});
export type DocumentAttachmentInput = z.infer<typeof DocumentAttachmentInput>;

export const AgentRunInput = z.object({
  question: z.string().optional(),
  threadId: z.string().optional(),
  resume: z.string().optional(),
  images: z.array(ImageAttachmentInput).optional(),
  documents: z.array(DocumentAttachmentInput).optional(),
  webSearchEnabled: z.boolean().optional(),
  knowledgeBaseEnabled: z.boolean().optional(),
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
  tool_calls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    args: z.unknown(),
  })).optional(),
  agent_steps: z.array(z.object({
    type: z.enum(["thought", "tool_call", "observation", "answer"]),
    content: z.string().optional(),
    name: z.string().optional(),
    args: z.unknown().optional(),
    result: z.string().optional(),
    stepId: z.string().optional(),
    label: z.string().optional(),
    status: z.string().optional(),
    durationMs: z.number().optional(),
  })).optional(),
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

// ==================== File Upload ====================

export const ImageUploadInput = z.object({
  image: z.instanceof(File, { message: "请选择图片" })
    .refine((f) => f.size <= 10 * 1024 * 1024, "图片超过 10MB 限制")
    .refine((f) => ["image/png", "image/jpeg", "image/gif", "image/webp"].includes(f.type), "不支持的图片格式，仅支持 PNG / JPEG / GIF / WebP"),
});
export type ImageUploadInput = z.infer<typeof ImageUploadInput>;

export const DocumentUploadInput = z.object({
  file: z.instanceof(File, { message: "请选择文件" })
    .refine((f) => f.size <= 5 * 1024 * 1024, "文件超过 5MB 限制")
    .refine((f) => {
      const name = f.name.toLowerCase();
      return [".txt", ".md", ".markdown", ".pdf", ".docx"].some((ext) => name.endsWith(ext));
    }, "不支持的文件格式，仅支持 .txt / .md / .pdf / .docx"),
});
export type DocumentUploadInput = z.infer<typeof DocumentUploadInput>;

// ==================== Helper ====================

/** 从 request 解析 JSON 并校验，不合法时抛出 400 Response */
export async function parseBody<T>(req: Request, schema: z.ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw resErr(400, "请求体格式错误，需要合法的 JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw resErr(400, "参数校验失败", result.error.issues);
  }
  return result.data;
}
