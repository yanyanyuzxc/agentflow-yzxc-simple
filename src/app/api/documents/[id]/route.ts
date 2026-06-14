import { deleteDocument, getDocumentChunks } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { unlink } from "fs/promises";
import { join } from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const chunks = await getDocumentChunks(userId, parseInt(id));
    return resOk(chunks);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("获取文档块失败:", error);
    return resErr(500, "获取文档块失败");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const { ok: deleted, filePath } = await deleteDocument(userId, parseInt(id));
    if (!deleted) {
      return resErr(404, "文档不存在");
    }
    if (filePath) {
      unlink(join(process.cwd(), filePath)).catch(() => {});
    }
    return resOk(null);
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("删除文档失败:", error);
    return resErr(500, "删除文档失败");
  }
}
