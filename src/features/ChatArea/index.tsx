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
        <MessageList messages={messages} agentSteps={agentSteps} isStreaming={isStreaming} onDeletePair={handleDeletePair} onRegenerate={handleRegenerate} onRewind={handleRewind} />
      </div>
      <InterruptHandler />
      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
