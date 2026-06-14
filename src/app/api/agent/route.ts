import { ChatAgent } from "@/lib/agent";
import { requireAuth } from "@/lib/auth";
import { AgentRunInput, parseBody } from "@/lib/schemas";
import { getConversationByThreadId, getMessagesAsLangChain } from "@/lib/db";
import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { checkRate, RateLimits } from "@/lib/rate-limit";
import { logger, withTrace } from "@/lib/log";

export async function POST(req: Request) {
  const url = new URL(req.url);
  return withTrace("POST", url.pathname, async () => {
    const t0 = performance.now();
    const userId = requireAuth(req);
    const body = await parseBody(req, AgentRunInput);
    logger.info("agent request", { question: body.question?.slice(0, 80), userId });

    // Agent 调用限流
    if (!checkRate(`agent:${userId}`, RateLimits.agent)) {
      logger.warn("rate limited", { userId });
      return Response.json(
        { error: "请求太频繁，请稍后再试", retryAfter: 60 },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

  if (!body.question && !body.resume) {
    return Response.json({ error: "question 或 resume 必填" }, { status: 400 });
  }

  // 始终从 DB 加载历史消息（DB 是唯一真相源，不依赖检查点）
  let history: BaseMessage[] | undefined;
  if (body.threadId && body.question && !body.resume) {
    try {
      const conv = await getConversationByThreadId(userId, body.threadId);
      if (conv) {
        const msgs = await getMessagesAsLangChain(userId, conv.id);
        // 去掉最后一条 user 消息（它是当前问题，会作为 question 传入 Agent）
        while (msgs.length > 0 && msgs[msgs.length - 1] instanceof HumanMessage) {
          msgs.pop();
        }
        if (msgs.length > 0) history = msgs;
      }
    } catch (e) {
      console.warn("[Agent] 加载历史消息失败:", (e as Error).message);
    }
  }

  const encoder = new TextEncoder();
  let eventId = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (event: string, data: unknown) => {
        eventId++;
        const payload =
          `id: ${eventId}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        const agent = new ChatAgent();
        for await (const ev of agent.runStream(body.question || "", {
          threadId: body.threadId,
          resume: body.resume,
          userId,
          history,
        })) {
          enqueue(ev.event, ev.data);
        }
      } catch (e) {
        enqueue("error", { message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

    logger.info("agent complete", { durationMs: Math.round(performance.now() - t0) });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }); // withTrace end
}
