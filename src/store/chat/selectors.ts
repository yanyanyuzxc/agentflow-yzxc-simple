import { useChatStore } from "./store";
import type { ChatStore } from "./store";

export const getChatStore = (): ChatStore => useChatStore.getState();
