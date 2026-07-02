import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { FileProcessor } from "@/lib/file/processor";
import { logger } from "@/lib/log";
import { DocumentUploadInput } from "@/lib/schemas";

const MAX_TOKENS = 8000;
const UPLOAD_DIR = "uploads/documents";

// -------- token 估算（与 rag/pipeline.ts 一致）--------

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

function truncateByTokens(text: string, maxTokens: number): string {
  let tokens = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[一-鿿㐀-䶿]/.test(ch)) {
      tokens += 1;
    } else if (!/\s/.test(ch)) {
      tokens += 0.3;
    }
    if (tokens > maxTokens) return text.slice(0, i);
  }
  return text;
}

// -------- 路由 --------

const processor = new FileProcessor();

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    const parsed = DocumentUploadInput.safeParse({ file: formData.get("file") });
    if (!parsed.success) {
      return resErr(400, parsed.error.issues[0].message);
    }
    const file = parsed.data.file;

    const fileType = processor.getType(file.name)!;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 写入临时文件
    const timestamp = Date.now();
    const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(process.cwd(), UPLOAD_DIR, safeName);
    await mkdir(join(process.cwd(), UPLOAD_DIR), { recursive: true });
    await writeFile(filePath, buffer);

    // 使用 FileProcessor 解析
    let text: string;
    try {
      text = await processor.parse(filePath, fileType);
    } finally {
      // 解析完立刻删除临时文件（不入知识库）
      unlink(filePath).catch(() => {});
    }

    if (!text.trim()) return resErr(400, "文件内容为空或无法解析");

    // token 估算 & 截断
    const totalTokens = estimateTokens(text);
    let truncated = false;
    if (totalTokens > MAX_TOKENS) {
      text = truncateByTokens(text, MAX_TOKENS);
      truncated = true;
    }
    const finalTokens = estimateTokens(text);

    return resOk({
      text,
      name: file.name,
      type: fileType,
      size: file.size,
      tokens: finalTokens,
      truncated,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("文档上传失败", { error: (error as Error).message });
    return resErr(500, "文档处理失败");
  }
}
