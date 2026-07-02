import { listConversations, createConversation } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ConversationCreateInput, parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const conversations = await listConversations(userId);
    return resOk(conversations);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[conversations] list failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}

export async function POST(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await parseBody(req, ConversationCreateInput);
    const id = body.threadId || crypto.randomUUID();
    const conversation = await createConversation(userId, id, body.title);
    return resOk(conversation, 201);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[conversations] create failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}
