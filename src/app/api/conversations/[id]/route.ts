import {
  getConversation,
  deleteConversation,
  updateConversation,
  getMessages,
} from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ConversationUpdateInput, parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const conversation = await getConversation(userId, Number(id));
    if (!conversation) {
      return resErr(404, "对话不存在");
    }
    const messages = await getMessages(userId, Number(id));
    return resOk({ ...conversation, messages });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[conversations] get failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const body = await parseBody(req, ConversationUpdateInput);
    const updated = await updateConversation(userId, Number(id), body);
    if (!updated) {
      return resErr(404, "对话不存在");
    }
    return resOk(updated);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[conversations] update failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const deleted = await deleteConversation(userId, Number(id));
    if (!deleted) {
      return resErr(404, "对话不存在");
    }
    return resOk(null);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[conversations] delete failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}
