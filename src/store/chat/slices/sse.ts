import type { StateCreator } from "zustand";
import type { ChatStore } from "../store";
import type { InterruptData } from "@/types/agent";

export interface SSESlice {
  isStreaming: boolean;
  isInterrupted: boolean;
  interruptData: InterruptData | null;
  error: string | null;

  setStreaming: (v: boolean) => void;
  setInterrupted: (data: InterruptData | null) => void;
  setError: (error: string | null) => void;
  resetSSE: () => void;
}

const initial: Pick<SSESlice, "isStreaming" | "isInterrupted" | "interruptData" | "error"> = {
  isStreaming: false,
  isInterrupted: false,
  interruptData: null,
  error: null,
};

export const createSSESlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], SSESlice> = (
  set,
) => ({
  ...initial,

  setStreaming: (v) => set({ isStreaming: v }),
  setInterrupted: (data) =>
    set({ isInterrupted: !!data, interruptData: data }),
  setError: (error) => set({ error }),
  resetSSE: () => set({ ...initial }),
});
