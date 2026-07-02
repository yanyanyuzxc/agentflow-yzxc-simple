import { listDocuments } from "@/lib/db";
import { parseFile, getFileType, isFileTypeSupported } from "@/lib/file";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { join } from "path";
import { logger } from "@/lib/log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const docId = parseInt(id);

    const docs = await listDocuments(userId);
    const doc = docs.find((d) => d.id === docId);

    if (!doc) {
      return resErr(404, "文档不存在");
    }

    if (!doc.file_path) {
      return resErr(404, "无原始文件");
    }

    const fullPath = join(process.cwd(), doc.file_path);
    const type = getFileType(doc.file_path);
    if (!type || !isFileTypeSupported(doc.file_path)) {
      return resErr(400, "不支持的文件格式");
    }

    const content = await parseFile(fullPath, type);

    return resOk({
      id: doc.id,
      title: doc.title,
      fileType: doc.file_type,
      content,
      chunkCount: doc.chunk_count ?? 0,
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("获取文档内容失败", { error: (error as Error).message });
    return resErr(500, "获取文档内容失败");
  }
}
