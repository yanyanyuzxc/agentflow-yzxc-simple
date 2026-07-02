import {
  addMessage,
  getMessages,
  deleteMessagePair,
  getConversation,
} from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { MessageAddInput, MessageDeleteInput, parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";
import { CheckpointManager } from "@/lib/agent/checkpoint";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/log";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const messages = await getMessages(userId, Number(id));
    return resOk(messages);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("获取消息失败", { error: (error as Error).message });
    return resErr(500, "获取消息失败");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const body = await parseBody(req, MessageAddInput);
    const msg = await addMessage(userId, {
      conversation_id: Number(id),
      role: body.role,
      content: body.content,
      tool_calls: body.tool_calls,
      agent_steps: body.agent_steps,
      tokens: body.tokens,
    });
    return resOk(msg, 201);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("添加消息失败", { error: (error as Error).message });
    return resErr(500, "添加消息失败");
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(req);
    const { id } = await params;
    const convId = Number(id);
    const body = await parseBody(req, MessageDeleteInput);
    const [msg1, msg2] = body.message_ids as [number, number];

    // 1. 删除消息对
    const deleted = await deleteMessagePair(userId, convId, [msg1, msg2]);

    // 2. 清除 LangGraph 检查点（时间旅行）
    const conv = await getConversation(userId, convId);
    if (conv?.thread_id) {
      const cm = new CheckpointManager(getEnv().DATABASE_URL);
      await cm.clearThread(conv.thread_id);
      logger.info("[TimeTravel] 已清除 thread 的检查点", { threadId: conv.thread_id });
    }

    return resOk({ deleted });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("删除消息失败", { error: (error as Error).message });
    return resErr(500, (error as Error).message || "删除消息失败");
  }
}
