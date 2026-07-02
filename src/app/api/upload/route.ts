import { writeFile } from "fs/promises";
import { join } from "path";
import { chunkText } from "@/lib/rag";
import { storeDocument } from "@/lib/db";
import { getFileType, parseFile } from "@/lib/file";
import { requireAuth } from "@/lib/auth";
import { getEmbeddings } from "@/lib/embedding-cache";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";
import { DocumentUploadInput } from "@/lib/schemas";

const UPLOAD_DIR = "uploads";

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    const parsed = DocumentUploadInput.safeParse({ file: formData.get("file") });
    if (!parsed.success) {
      return resErr(400, parsed.error.issues[0].message);
    }
    const file = parsed.data.file;

    const fileType = getFileType(file.name)!;
    const buffer = Buffer.from(await file.arrayBuffer());

    const timestamp = Date.now();
    const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const filePath = join(UPLOAD_DIR, safeName);
    await writeFile(join(process.cwd(), filePath), buffer);

    const content = await parseFile(join(process.cwd(), filePath), fileType);
    if (!content.trim()) return resErr(400, "文件内容为空");

    const chunks = chunkText(content);
    if (chunks.length === 0) return resErr(400, "文本切割后为空");

    const embeddings = await getEmbeddings(
      chunks.map((c) => c.text),
      "BAAI/bge-m3",
    );
    if (embeddings.length === 0 || embeddings.some((e) => e.length === 0)) {
      return resErr(500, "Embedding 生成失败");
    }

    const docId = await storeDocument(
      userId,
      file.name,
      file.name,
      chunks.map((chunk, i) => ({
        text: chunk.text,
        embedding: embeddings[i],
        estimatedTokens: chunk.estimatedTokens,
      })),
      { filePath, fileType, fileSize: file.size },
    );

    return resOk({
      documentId: docId,
      totalChunks: chunks.length,
      title: file.name,
      fileType,
      fileSize: file.size,
    }, 201);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("上传失败", { error: (error as Error).message });
    return resErr(500, "上传处理失败");
  }
}
