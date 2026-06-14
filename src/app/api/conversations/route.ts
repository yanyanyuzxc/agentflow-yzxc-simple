import { listConversations, createConversation } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ConversationCreateInput, parseBody } from "@/lib/schemas";
import { resOk } from "@/lib/resp";

export async function GET(req: Request) {
  const userId = requireAuth(req);
  const conversations = await listConversations(userId);
  return resOk(conversations);
}

export async function POST(req: Request) {
  const userId = requireAuth(req);
  const body = await parseBody(req, ConversationCreateInput);
  const id = body.threadId || crypto.randomUUID();
  const conversation = await createConversation(userId, id, body.title);
  return resOk(conversation, 201);
}
