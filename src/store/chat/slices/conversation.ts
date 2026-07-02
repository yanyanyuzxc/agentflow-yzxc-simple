import type { StateCreator } from "zustand";
import type { StoredConversation } from "@/lib/db";
import type { ChatStore } from "../store";

export interface ConversationSlice {
  conversations: StoredConversation[];
  activeConversationId: number | null;

  setConversations: (list: StoredConversation[]) => void;
  addConversation: (conv: StoredConversation) => void;
  removeConversation: (id: number) => void;
  updateConversationTitle: (id: number, title: string) => void;
  setActiveConversationId: (id: number | null) => void;
  resetConversations: () => void;
}

const initial: Pick<ConversationSlice, "conversations" | "activeConversationId"> = {
  conversations: [],
  activeConversationId: null,
};

export const createConversationSlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], ConversationSlice> = (set) => ({
  ...initial,

  setConversations: (list) => set({ conversations: list }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
  removeConversation: (id) =>
    set((s) => ({
      conversations: s.conversations.filter((c) => c.id !== id),
    })),
  updateConversationTitle: (id, title) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, title } : c,
      ),
    })),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  resetConversations: () => set({ ...initial }),
});
