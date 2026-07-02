import { useCallback } from "react";
import { useChatStore } from "@/store/chat/store";
import { chatService } from "@/services/chatService";

import type { ImageAttachment, DocumentAttachment } from "@/types/models";

export function useChatSend(send: (text: string, images?: ImageAttachment[], documents?: DocumentAttachment[]) => void) {
  return useCallback(
    async (text: string, images?: ImageAttachment[], documents?: DocumentAttachment[]) => {
      const store = useChatStore.getState();
      if (store.isStreaming) return;

      // 先重置 SSE 状态（清 error / interrupt），再设 streaming
      store.resetSSE();
      store.resetSteps();
      store.setError(null);
      store.setStreaming(true);

      let conversationId = store.activeConversationId;
      let tid = store.threadId;

      // 恢复：有 threadId 但没有 activeConversationId（刷新后 persist 只保存了 threadId）
      if (tid && !conversationId) {
        try {
          const list = await chatService.list();
          const match = list.find((c) => c.thread_id === tid);
          if (match) {
            conversationId = match.id;
            store.setActiveConversationId(match.id);
          }
        } catch { /* 网络不通，后面走创建逻辑 */ }
      }

      // 仍然没有 → 新建会话
      if (!conversationId) {
        try {
          const conv = await chatService.create();
          store.addConversation(conv);
          store.setActiveConversationId(conv.id);
          store.setThreadId(conv.thread_id);
          conversationId = conv.id;
          tid = conv.thread_id;
        } catch {
          // 网络彻底不通：用本地 UUID 做 threadId，消息只存本地
          tid = tid || crypto.randomUUID();
          store.setThreadId(tid);
        }
      }

      const tempId = Date.now();
      store.addMessage({
        id: tempId,
        conversation_id: conversationId ?? 0,
        role: "user",
        content: text,
        images: images?.length ? images : undefined,
        documents: documents?.length ? documents : undefined,
        created_at: new Date().toISOString(),
      });

      if (conversationId) {
        try {
          const saved = await chatService.addMessage(conversationId, { role: "user", content: text });
          // 用 DB ID 替换临时 ID
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m)),
          );
          // 首次发消息 → 用问题前 30 字自动命名
          const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId);
          if (conv && conv.title === "新对话") {
            const autoTitle = text.trim().slice(0, 30) + (text.trim().length > 30 ? "…" : "");
            // 先乐观更新 store，再异步写 DB
            useChatStore.getState().updateConversationTitle(conversationId, autoTitle);
            chatService.update(conversationId, { title: autoTitle }).catch(() => {});
          }
        } catch {
          // 持久化失败：移除 temp-ID 消息，停止发送
          useChatStore.getState().setMessages(
            useChatStore.getState().messages.filter((m) => m.id !== tempId),
          );
          store.setStreaming(false);
          store.setError("消息发送失败，请重试");
          return;
        }
      }

      send(text, images, documents);
    },
    [send],
  );
}
