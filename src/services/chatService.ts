import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { Message } from "@/types/models";
import type { StoredConversation } from "@/lib/db";

export interface ConversationWithMessages extends StoredConversation {
  messages: Message[];
}

export const chatService = {
  list() {
    return apiClient<StoredConversation[]>(ENDPOINTS.conversations.list);
  },

  create(threadId?: string, title?: string) {
    return apiClient<StoredConversation>(ENDPOINTS.conversations.list, {
      method: "POST",
      body: JSON.stringify({ threadId, title }),
    });
  },

  get(id: number) {
    return apiClient<ConversationWithMessages>(
      ENDPOINTS.conversations.detail(id),
    );
  },

  update(id: number, fields: { title?: string; pinned?: boolean; tags?: string[] }) {
    return apiClient<StoredConversation>(ENDPOINTS.conversations.detail(id), {
      method: "PATCH",
      body: JSON.stringify(fields),
    });
  },

  remove(id: number) {
    return apiClient<{ ok: boolean }>(ENDPOINTS.conversations.detail(id), {
      method: "DELETE",
    });
  },

  addMessage(
    conversationId: number,
    msg: {
      role: string;
      content: string;
      tool_calls?: unknown;
      agent_steps?: unknown;
      tokens?: number;
    },
  ) {
    return apiClient<Message>(ENDPOINTS.conversations.messages(conversationId), {
      method: "POST",
      body: JSON.stringify(msg),
    });
  },

  deleteMessages(conversationId: number, messageIds: [number, number]) {
    return apiClient<{ deleted: number }>(
      ENDPOINTS.conversations.deleteMessages(conversationId),
      {
        method: "DELETE",
        body: JSON.stringify({ message_ids: messageIds }),
      },
    );
  },

  rewind(conversationId: number, messageId: number) {
    return apiClient<{ deleted: number }>(
      ENDPOINTS.conversations.rewind(conversationId),
      {
        method: "POST",
        body: JSON.stringify({ message_id: messageId }),
      },
    );
  },
};
