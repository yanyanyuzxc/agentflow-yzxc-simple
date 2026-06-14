import type { StateCreator } from "zustand";
import type { ChatStore } from "../store";
import type { StreamingAgentStep } from "@/types/agent";

export interface StepSlice {
  agentSteps: StreamingAgentStep[];

  addSkeleton: (
    step: Pick<StreamingAgentStep, "stepId" | "type" | "label">,
  ) => void;
  fillThought: (stepId: string, content: string) => void;
  fillToolCall: (
    stepId: string,
    data: { name: string; args: Record<string, unknown> },
  ) => void;
  fillObservation: (
    stepId: string,
    data: { name: string; result: string; durationMs?: number },
  ) => void;
  appendAnswerChunk: (stepId: string, content: string) => void;
  finalizeStep: (stepId: string) => void;
  markStepError: (stepId: string, error: string) => void;
  resetSteps: () => void;
  removeAnswerSteps: () => void;
}

const initial: Pick<StepSlice, "agentSteps"> = {
  agentSteps: [],
};

export const createStepSlice: StateCreator<ChatStore, [["zustand/devtools", never]], [], StepSlice> = (
  set,
) => ({
  ...initial,

  addSkeleton: (step) =>
    set((s) => ({
      agentSteps: [
        ...s.agentSteps,
        { ...step, status: "pending" as const, content: "" },
      ],
    })),

  fillThought: (stepId, content) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId
          ? { ...st, status: "running" as const, content }
          : st,
      ),
    })),

  fillToolCall: (stepId, { name, args }) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId
          ? { ...st, status: "running" as const, name, args }
          : st,
      ),
    })),

  fillObservation: (stepId, { name, result, durationMs }) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId
          ? { ...st, status: "running" as const, result, name, durationMs }
          : st,
      ),
    })),

  appendAnswerChunk: (stepId, content) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId
          ? {
              ...st,
              status: "running" as const,
              content: (st.content ?? "") + content,
            }
          : st,
      ),
    })),

  finalizeStep: (stepId) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId ? { ...st, status: "done" as const } : st,
      ),
    })),

  markStepError: (stepId, error) =>
    set((s) => ({
      agentSteps: s.agentSteps.map((st) =>
        st.stepId === stepId
          ? { ...st, status: "error" as const, error }
          : st,
      ),
    })),

  resetSteps: () => set({ ...initial }),

  removeAnswerSteps: () =>
    set((s) => ({
      agentSteps: s.agentSteps.filter((st) => st.type !== "answer"),
    })),
});
