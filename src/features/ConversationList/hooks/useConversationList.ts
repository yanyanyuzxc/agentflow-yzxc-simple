import { useEffect, useState, useCallback } from "react";
import { chatService } from "@/services/chatService";
import { useChatStore } from "@/store/chat/store";
import type { StoredConversation } from "@/lib/db";
import type { StreamingAgentStep } from "@/types/agent";

/** 从已加载的消息中恢复 agent_steps 到 store */
function restoreStepsFromMessages(messages: { agent_steps?: unknown }[]) {
  const lastAssistant = [...messages].reverse().find((m) => {
    const steps = (m as any).agent_steps;
    return steps && (typeof steps === "string" ? steps.length > 2 : Array.isArray(steps) && steps.length > 0);
  });
  if (lastAssistant) {
    try {
      const raw = (lastAssistant as any).agent_steps;
      const steps: StreamingAgentStep[] = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(steps) && steps.length > 0) {
        useChatStore.getState().setSteps(steps.map((s) => ({ ...s, status: "done" as const })));
      }
    } catch { /* ignore parse errors */ }
  }
}

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
    fetchList().then(() => {
      // 刷新后恢复：如果有持久化的 threadId 但没有激活会话，自动匹配
      const store = useChatStore.getState();
      if (!store.activeConversationId && store.threadId) {
        const match = store.conversations.find((c) => c.thread_id === store.threadId);
        if (match) {
          store.setActiveConversationId(match.id);
          // 异步加载消息
          chatService.get(match.id).then((detail) => {
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
            restoreStepsFromMessages(detail.messages);
          }).catch(() => {});
        }
      }
    });
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
    store.resetSteps();

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
      restoreStepsFromMessages(detail.messages);
    } catch {
      // 网络中断不阻止 UI 切换，后续可通过刷新恢复
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
      useChatStore.getState().setError("删除失败，请重试");
    }
  };

  return { loading, error, refetch: fetchList, handleNew, handleSelect, handleDelete };
}
