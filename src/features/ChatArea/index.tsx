"use client";

import { useCallback, useEffect, useRef } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useChatStore } from "@/store/chat/store";
import { useChatSend } from "./hooks/useChatSend";
import { chatService } from "@/services/chatService";
import { InterruptHandler } from "@/features/InterruptHandler";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";
import type { Message } from "@/types/models";

export function ChatArea() {
  const { send, abort } = useStreamChat();
  const messages = useChatStore((s) => s.messages);
  const agentSteps = useChatStore((s) => s.agentSteps);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const totalDurationMs = useChatStore((s) => s.totalDurationMs);
  const error = useChatStore((s) => s.error);
  const incompleteAnswer = useChatStore((s) => s.incompleteAnswer);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleSend = useChatSend(send);

  const handleDeletePair = useCallback(async (human: Message, ai: Message) => {
    const store = useChatStore.getState();
    const convId = store.activeConversationId;
    if (!convId) return;

    // 从 store 移除这对消息
    const remaining = store.messages.filter(
      (m) => m.id !== human.id && m.id !== ai.id,
    );
    store.setMessages(remaining);

    // 如果删光了，清除 thread_id
    if (remaining.length === 0) {
      store.setThreadId(null);
    }

    // 调用后端删除
    chatService.deleteMessages(convId, [human.id, ai.id]).catch((err) => {
      console.error("删除消息失败:", err);
      store.setError("删除失败，请刷新重试");
    });
  }, []);

  /** 重新生成：删最后一对，立刻重发同样的问题 */
  const handleRegenerate = useCallback(
    async (human: Message, _ai: Message) => {
      const store = useChatStore.getState();
      const convId = store.activeConversationId;
      if (!convId || store.isStreaming) return;

      const text = human.content;
      store.setMessages(store.messages.filter((m) => m.id !== human.id));
      await chatService.rewind(convId, human.id);
      handleSend(text);
    },
    [handleSend],
  );

  /** 回退：从该点截断，停在那让用户决定下一步 */
  const handleRewind = useCallback(
    async (human: Message, _ai: Message) => {
      const store = useChatStore.getState();
      const convId = store.activeConversationId;
      if (!convId || store.isStreaming) return;

      const humanIdx = store.messages.findIndex((m) => m.id === human.id);
      if (humanIdx === -1) return;
      store.setMessages(store.messages.slice(0, humanIdx));
      await chatService.rewind(convId, human.id);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && isStreaming) abort();
    },
    [isStreaming, abort],
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, agentSteps]);

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {error && (
          <div className="mx-4 mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              className="ml-3 text-red-500 hover:text-red-700 dark:hover:text-red-200 underline shrink-0"
              onClick={() => useChatStore.getState().setError(null)}
            >
              关闭
            </button>
          </div>
        )}
        {incompleteAnswer && (
          <div className="mx-4 mt-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs text-center">
            响应中断，回答可能不完整
            <button
              className="ml-2 underline"
              onClick={() => useChatStore.getState().setIncompleteAnswer(false)}
            >
              关闭
            </button>
          </div>
        )}
        <MessageList messages={messages} agentSteps={agentSteps} isStreaming={isStreaming} totalDurationMs={totalDurationMs} onDeletePair={handleDeletePair} onRegenerate={handleRegenerate} onRewind={handleRewind} />
      </div>
      <InterruptHandler />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
