import { rewindToMessage, getConversation } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { z } from "zod/v4";
import { parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";
import { CheckpointManager } from "@/lib/agent/checkpoint";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";

const RewindInput = z.object({
  message_id: z.number(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const convId = Number(id);
    const body = await parseBody(req, RewindInput);

    // 1. 删除该消息对及之后所有消息
    const deleted = await rewindToMessage(userId, convId, body.message_id);

    // 2. 清除 LangGraph 检查点
    const conv = await getConversation(userId, convId);
    if (conv?.thread_id) {
      const cm = new CheckpointManager(getEnv().DATABASE_URL);
      await cm.clearThread(conv.thread_id);
    }

    return resOk({ deleted });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("回退消息失败", { error: (error as Error).message });
    return resErr(500, (error as Error).message || "回退失败");
  }
}
