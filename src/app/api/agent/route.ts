import { ChatAgent, Orchestrator } from "@/lib/agent";
import { requireAuth } from "@/lib/auth";
import { AgentRunInput, parseBody, DocumentAttachmentInput } from "@/lib/schemas";
import { getConversationByThreadId, getMessagesAsLangChain } from "@/lib/db";
import { HumanMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { checkRate, RateLimits } from "@/lib/rate-limit";
import { logger, withTrace } from "@/lib/log";
import type { SSEEvent } from "@/lib/agent/types";
import type { ImageInput } from "@/lib/agent/types";

/** 将文档列表格式化为 XML 上下文块（参考 LobeHub 格式） */
function formatDocumentsContext(docs: DocumentAttachmentInput[]): string {
  if (!docs.length) return "";
  const files = docs.map(d => {
    const truncatedAttr = d.truncated ? ' truncated="true"' : "";
    return `  <file name="${d.name}" type="${d.type}" size="${d.size}" tokens="${d.tokens}"${truncatedAttr}>\n${d.text}\n  </file>`;
  }).join("\n");
  return `<files_info>\n${files}\n</files_info>\n\n`;
}

/** 用 ChatAgent 流式执行（resume / 纯图片等边缘场景） */
async function* runChatAgent(
  question: string,
  userId: number,
  options: {
    threadId?: string;
    resume?: string;
    history?: BaseMessage[];
    images?: ImageInput[];
    disabledTools?: string[];
  },
): AsyncGenerator<SSEEvent> {
  const agent = new ChatAgent();
  yield* agent.runStream(question, {
    threadId: options.threadId,
    resume: options.resume,
    userId,
    history: options.history,
    images: options.images,
    disabledTools: options.disabledTools,
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  return withTrace("POST", url.pathname, async () => {
    const userId = requireAuth(req);
    const body = await parseBody(req, AgentRunInput);
    logger.info("agent request", { question: body.question?.slice(0, 80), userId });

    if (!checkRate(`agent:${userId}`, RateLimits.agent)) {
      logger.warn("rate limited", { userId });
      return Response.json(
        { error: "请求太频繁，请稍后再试", retryAfter: 60 },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    if (!body.question && !body.resume && !body.images?.length && !body.documents?.length) {
      return Response.json({ error: "question、resume、images 或 documents 至少需要一个" }, { status: 400 });
    }

    // 将文档上下文以 XML 格式注入 question
    const documentContext = formatDocumentsContext(body.documents ?? []);
    const enrichedQuestion = documentContext + (body.question || "");

    // 从 DB 加载历史消息
    let history: BaseMessage[] | undefined;
    if (body.threadId && body.question && !body.resume) {
      try {
        const conv = await getConversationByThreadId(userId, body.threadId);
        if (conv) {
          const msgs = await getMessagesAsLangChain(userId, conv.id);
          while (msgs.length > 0 && msgs[msgs.length - 1] instanceof HumanMessage) {
            msgs.pop();
          }
          if (msgs.length > 0) history = msgs;
        }
      } catch (e) {
        logger.warn("[Agent] 加载历史消息失败", { error: (e as Error).message });
      }
    }

    const encoder = new TextEncoder();
    let eventId = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const streamStart = performance.now();
        class ClientDisconnected extends Error {
          constructor() { super("Client disconnected"); this.name = "ClientDisconnected"; }
        }
        const enqueue = (event: string, data: unknown) => {
          if (req.signal.aborted) throw new ClientDisconnected();
          try {
            eventId++;
            const payload = JSON.stringify(data);
            controller.enqueue(encoder.encode(
              `id: ${eventId}\nevent: ${event}\ndata: ${payload}\n\n`,
            ));
          } catch {
            throw new ClientDisconnected();
          }
        };

        const baseOpts = { threadId: body.threadId, resume: body.resume, history, images: body.images };

        try {
          // resume 或纯图片/纯文档 → 直接 ChatAgent
          if (body.resume || (!body.question && (body.images?.length || body.documents?.length))) {
            for await (const ev of runChatAgent(enrichedQuestion, userId, baseOpts)) {
              if (req.signal.aborted) throw new ClientDisconnected();
              enqueue(ev.event, ev.data);
            }
          } else {
            // 有文字 → Orchestrator（统一处理简单/中等/复杂，不再分三条路径）
            const disabledTools: string[] = [];

            // 用户关掉了联网搜索 → 禁用 web_search + crawl_page
            if (body.webSearchEnabled === false) {
              disabledTools.push("web_search", "crawl_page");
            }

            // 用户关掉了知识库搜索 → 禁用 search_docs
            if (body.knowledgeBaseEnabled === false) {
              disabledTools.push("search_docs");
            }

            const orchestrator = new Orchestrator();

            for await (const ev of orchestrator.run(enrichedQuestion, userId, {
              ...baseOpts,
              disabledTools,
            })) {
              if (req.signal.aborted) throw new ClientDisconnected();
              enqueue(ev.event, ev.data);
            }
          }
        } catch (e) {
          if (e instanceof ClientDisconnected) {
            logger.info("agent aborted by client", { userId });
          } else {
            try { enqueue("error", { message: (e as Error).message }); } catch { /* client already gone */ }
          }
        } finally {
          controller.close();
          logger.info("agent complete", { durationMs: Math.round(performance.now() - streamStart), userId });
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
}
