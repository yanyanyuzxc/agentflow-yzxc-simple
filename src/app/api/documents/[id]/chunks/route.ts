import { getDocumentChunks } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const docId = parseInt(id);
    const chunks = await getDocumentChunks(userId, docId);

    if (chunks.length === 0) {
      return resErr(404, "文档不存在");
    }

    return resOk({
      chunks: chunks.map((c) => ({
        index: c.chunk_index,
        text: c.text,
        estimatedTokens: c.estimated_tokens,
      })),
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("获取文档失败", { error: (error as Error).message });
    return resErr(500, "获取文档失败");
  }
}
