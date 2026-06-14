import { ChatAgent } from "@/lib/agent";
import { requireAuth } from "@/lib/auth";
import { AgentResumeInput, parseBody } from "@/lib/schemas";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const userId = requireAuth(req);
  const { threadId } = await params;
  const body = await parseBody(req, AgentResumeInput);

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
        for await (const ev of agent.resumeStream(threadId, { resume: body.resume, userId })) {
          enqueue(ev.event, ev.data);
        }
      } catch (e) {
        enqueue("error", { message: (e as Error).message });
      } finally {
        controller.close();
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
}
