import type { StateCreator } from "zustand";
import type { Message } from "@/types/models";
import type { ChatStore } from "../store";

export interface MessageSlice {
  messages: Message[];
  threadId: string | null;
  draft: string;

  addMessage: (msg: Message) => void;
  setMessages: (msgs: Message[]) => void;
  setThreadId: (id: string | null) => void;
  setDraft: (text: string) => void;
  resetMessages: () => void;
  /** 追加到最后一条 assistant 消息的 content，不存在则新建 */
  appendAssistantContent: (content: string, convId?: number) => void;
}

const initial: Pick<MessageSlice, "messages" | "threadId" | "draft"> = {
  messages: [],
  threadId: null,
  draft: "",
};

export const createMessageSlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], MessageSlice> = (
  set,
) => ({
  ...initial,

  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (msgs) => set({ messages: msgs }),
  setThreadId: (id) => set({ threadId: id }),
  setDraft: (text) => set({ draft: text }),
  resetMessages: () => set({ ...initial }),

  appendAssistantContent: (content, convId) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant" && !("_finalized" in last)) {
        // 追加到已有流式消息
        msgs[msgs.length - 1] = { ...last, content: last.content + content };
      } else {
        // 新建 pending assistant 消息
        msgs.push({
          id: Date.now(),
          conversation_id: convId ?? s.messages[0]?.conversation_id ?? 0,
          role: "assistant",
          content,
          created_at: new Date().toISOString(),
        });
      }
      return { messages: msgs };
    }),
});
