import { useEffect, useState, useCallback } from "react";
import { chatService } from "@/services/chatService";
import { useChatStore } from "@/store/chat/store";
import type { StoredConversation } from "@/lib/db";

export function useConversationList() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setError(null);
      const list = await chatService.list();
      useChatStore.getState().setConversations(list);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleNew = () => {
    useChatStore.getState().setThreadId(null);
    useChatStore.getState().setActiveConversationId(null);
    useChatStore.getState().resetMessages();
    useChatStore.getState().resetSteps();
  };

  const handleSelect = async (conv: StoredConversation) => {
    const store = useChatStore.getState();
    store.setActiveConversationId(conv.id);
    store.setThreadId(conv.thread_id);

    try {
      const detail = await chatService.get(conv.id);
      store.setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls as never,
          agent_steps: m.agent_steps as never,
          created_at: m.created_at,
        })),
      );
    } catch {
      // messages might be empty, that's ok
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await chatService.remove(id);
      const store = useChatStore.getState();
      store.removeConversation(id);
      if (store.activeConversationId === id) {
        store.setActiveConversationId(null);
        store.setThreadId(null);
        store.resetMessages();
        store.resetSteps();
      }
    } catch {
      // ignore
    }
  };

  return { loading, error, refetch: fetchList, handleNew, handleSelect, handleDelete };
}
