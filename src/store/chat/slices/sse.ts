import type { StateCreator } from "zustand";
import type { ChatStore } from "../store";
import type { InterruptData } from "@/types/agent";

export interface SSESlice {
  isStreaming: boolean;
  isInterrupted: boolean;
  interruptData: InterruptData | null;
  error: string | null;
  /** 联网搜索开关（用户可控） */
  webSearchEnabled: boolean;

  setStreaming: (v: boolean) => void;
  setInterrupted: (data: InterruptData | null) => void;
  setError: (error: string | null) => void;
  setWebSearchEnabled: (v: boolean) => void;
  resetSSE: () => void;
}

const initial: Pick<SSESlice, "isStreaming" | "isInterrupted" | "interruptData" | "error" | "webSearchEnabled"> = {
  isStreaming: false,
  isInterrupted: false,
  interruptData: null,
  error: null,
  webSearchEnabled: true, // 默认开启
};

export const createSSESlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], SSESlice> = (
  set,
) => ({
  ...initial,

  setStreaming: (v) => set({ isStreaming: v }),
  setInterrupted: (data) =>
    set({ isInterrupted: !!data, interruptData: data }),
  setError: (error) => set({ error }),
  setWebSearchEnabled: (v) => set({ webSearchEnabled: v }),
  resetSSE: () => set({ ...initial }),
});
