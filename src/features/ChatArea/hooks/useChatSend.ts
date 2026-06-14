import { useCallback } from "react";
import { useChatStore } from "@/store/chat/store";
import { chatService } from "@/services/chatService";

export function useChatSend(send: (text: string) => void) {
  return useCallback(
    async (text: string) => {
      const store = useChatStore.getState();
      if (store.isStreaming) return;

      // 先重置 SSE 状态（清 error / interrupt），再设 streaming
      store.resetSSE();
      store.resetSteps();
      store.setError(null);
      store.setStreaming(true);

      let conversationId = store.activeConversationId;
      let tid = store.threadId;

      if (!tid) {
        try {
          const conv = await chatService.create();
          store.addConversation(conv);
          store.setActiveConversationId(conv.id);
          store.setThreadId(conv.thread_id);
          conversationId = conv.id;
          tid = conv.thread_id;
        } catch {
          tid = crypto.randomUUID();
          store.setThreadId(tid);
        }
      }

      const tempId = Date.now();
      store.addMessage({
        id: tempId,
        conversation_id: conversationId ?? 0,
        role: "user",
        content: text,
        created_at: new Date().toISOString(),
      });

      if (conversationId) {
        chatService
          .addMessage(conversationId, { role: "user", content: text })
          .then((saved) => {
            // 用 DB ID 替换临时 ID
            const st = useChatStore.getState();
            st.setMessages(
              st.messages.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m)),
            );
          })
          .catch(() => {});
      }

      send(text);
    },
    [send],
  );
}
