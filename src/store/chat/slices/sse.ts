import type { StateCreator } from "zustand";
import type { ChatStore } from "../store";
import type { InterruptData } from "@/types/agent";

export interface SSESlice {
  isStreaming: boolean;
  isInterrupted: boolean;
  interruptData: InterruptData | null;
  error: string | null;
  /** 流意外中断（未收到 done/error 事件），回答可能不完整 */
  incompleteAnswer: boolean;
  /** 联网搜索开关（用户可控） */
  webSearchEnabled: boolean;
  /** 知识库搜索开关（用户可控） */
  knowledgeBaseEnabled: boolean;
  /** 本次 Agent 总耗时（ms），done 事件携带 */
  totalDurationMs: number | null;

  setStreaming: (v: boolean) => void;
  setInterrupted: (data: InterruptData | null) => void;
  setError: (error: string | null) => void;
  setIncompleteAnswer: (v: boolean) => void;
  setWebSearchEnabled: (v: boolean) => void;
  setKnowledgeBaseEnabled: (v: boolean) => void;
  setTotalDurationMs: (v: number) => void;
  resetSSE: () => void;
}

const initial: Pick<SSESlice, "isStreaming" | "isInterrupted" | "interruptData" | "error" | "incompleteAnswer" | "webSearchEnabled" | "knowledgeBaseEnabled" | "totalDurationMs"> = {
  isStreaming: false,
  isInterrupted: false,
  interruptData: null,
  error: null,
  incompleteAnswer: false,
  webSearchEnabled: true,
  knowledgeBaseEnabled: true,
  totalDurationMs: null,
};

export const createSSESlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], SSESlice> = (
  set,
) => ({
  ...initial,

  setStreaming: (v) => set({ isStreaming: v }),
  setInterrupted: (data) =>
    set({ isInterrupted: !!data, interruptData: data }),
  setError: (error) => set({ error }),
  setIncompleteAnswer: (v) => set({ incompleteAnswer: v }),
  setWebSearchEnabled: (v) => set({ webSearchEnabled: v }),
  setKnowledgeBaseEnabled: (v) => set({ knowledgeBaseEnabled: v }),
  setTotalDurationMs: (v) => set({ totalDurationMs: v }),
  resetSSE: () => set({ ...initial }),
});
