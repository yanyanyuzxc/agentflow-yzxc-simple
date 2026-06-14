import { createStore } from "../middleware/createStore";
import type { MessageSlice } from "./slices/message";
import type { SSESlice } from "./slices/sse";
import type { StepSlice } from "./slices/step";
import type { ConversationSlice } from "./slices/conversation";
import { createMessageSlice } from "./slices/message";
import { createSSESlice } from "./slices/sse";
import { createStepSlice } from "./slices/step";
import { createConversationSlice } from "./slices/conversation";

export type ChatStore = MessageSlice & SSESlice & StepSlice & ConversationSlice;

export const useChatStore = createStore<ChatStore>({
  name: "chat",
  persist: {
    name: "chat-chat",
    partialize: (s) => ({
      draft: (s as MessageSlice).draft,
      threadId: (s as MessageSlice).threadId,
    }),
  },
  immer: true,
})((...args) => ({
  ...createMessageSlice(...args),
  ...createSSESlice(...args),
  ...createStepSlice(...args),
  ...createConversationSlice(...args),
}));
