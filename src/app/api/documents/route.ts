import { chunkText } from "@/lib/rag";
import { storeDocument, listDocuments } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { DocumentCreateInput, parseBody } from "@/lib/schemas";
import { getEmbeddingClient } from "@/lib/llm";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const openai = getEmbeddingClient();
    const body = await parseBody(request, DocumentCreateInput);

    const chunks = chunkText(body.text);
    if (chunks.length === 0) {
      return resErr(400, "文本切割后为空");
    }

    const inputs = chunks.map((c) => c.text);
    const result = await openai.embeddings.create({
      model: "BAAI/bge-m3",
      input: inputs,
      encoding_format: "float",
    });

    const docId = await storeDocument(
      userId,
      body.title || "",
      body.source || "",
      chunks.map((chunk, i) => ({
        text: chunk.text,
        embedding: result.data[i].embedding,
        estimatedTokens: chunk.estimatedTokens,
      })),
    );

    return resOk({ documentId: docId, totalChunks: chunks.length }, 201);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("存储文档失败", { error: (error as Error).message });
    return resErr(500, "存储文档失败");
  }
}

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const docs = await listDocuments(userId);
    return resOk(docs);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("获取文档列表失败", { error: (error as Error).message });
    return resErr(500, "获取文档列表失败");
  }
}
