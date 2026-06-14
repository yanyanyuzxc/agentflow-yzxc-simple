"use client";

import { useCallback, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useChatStore } from "@/store/chat/store";
import { authHeaders } from "@/services/client";
import { chatService } from "@/services/chatService";
import type { SSEEventPayloadMap } from "@/types/agent";

function safeParse(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function dispatch(
  store: ReturnType<typeof useChatStore.getState>,
  event: string,
  payload: Record<string, unknown>,
) {
  switch (event) {
    case "step_start":
      store.addSkeleton({
        stepId: payload.step_id as string,
        type: payload.type as SSEEventPayloadMap["step_start"]["type"],
        label: payload.label as string,
      });
      break;

    case "thought":
      store.fillThought(
        payload.step_id as string,
        payload.content as string,
      );
      break;

    case "tool_call":
      store.fillToolCall(payload.step_id as string, {
        name: payload.name as string,
        args: payload.args as Record<string, unknown>,
      });
      break;

    case "observation":
      store.fillObservation(payload.step_id as string, {
        name: payload.name as string,
        result: payload.result as string,
        durationMs: payload.duration_ms as number | undefined,
      });
      break;

    case "answer_chunk":
      store.appendAnswerChunk(
        payload.step_id as string,
        payload.content as string,
      );
      break;

    case "message_chunk":
      store.appendAssistantContent(payload.content as string);
      break;

    case "step_end":
      store.finalizeStep(payload.step_id as string);
      break;

    case "interrupt":
      store.setInterrupted({
        interrupt_id: payload.interrupt_id as string,
        message: payload.message as string,
        tool_name: payload.tool_name as string | undefined,
      });
      break;

    case "error":
      store.setError(payload.message as string);
      store.setStreaming(false);
      break;

    case "done":
      store.setStreaming(false);
      persistAssistantMessage();
      break;

    default:
      console.warn("[useStreamChat] unknown event:", event, payload);
  }
}

function persistAssistantMessage() {
  const latest = useChatStore.getState();
  const convId = latest.activeConversationId;

  // 找最后一条 assistant 消息（由 message_chunk 流式构建）
  const msgs = [...latest.messages];
  const lastIdx = msgs.length - 1;
  const lastMsg = msgs[lastIdx];
  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.content) {
    console.warn("[done] no answer text to persist");
    return;
  }

  // 写入 agent_steps 到 store（供历史回放）
  if (latest.agentSteps.length > 0) {
    msgs[lastIdx] = { ...lastMsg, agent_steps: JSON.stringify(latest.agentSteps) };
    latest.setMessages(msgs);
  }

  // 持久化到 DB
  if (convId) {
    const tempId = lastMsg.id;
    chatService
      .addMessage(convId, {
        role: "assistant",
        content: lastMsg.content,
        agent_steps: latest.agentSteps,
      })
      .then((saved) => {
        // 用 DB ID 替换临时 ID
        const st = useChatStore.getState();
        st.setMessages(
          st.messages.map((m) => (m.id === tempId ? { ...m, id: saved.id } : m)),
        );
        console.log("[done] assistant message persisted OK, id=%d", saved.id);
      })
      .catch((err) => console.error("[done] persist failed:", err));
  }
}

export function useStreamChat() {
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (question: string) => {
    abortRef.current = new AbortController();
    const store = useChatStore.getState();

    await fetchEventSource("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ question, threadId: store.threadId }),
      signal: abortRef.current.signal,
      openWhenHidden: true,

      onmessage(ev) {
        const payload = safeParse(ev.data);
        dispatch(useChatStore.getState(), ev.event, payload);
      },

      onclose() {
        const cur = useChatStore.getState();
        if (!cur.isInterrupted) {
          cur.setStreaming(false);
        }
      },

      onerror(err) {
        const cur = useChatStore.getState();
        cur.setError(err.message);
        cur.setStreaming(false);
        persistAssistantMessage(); // 保存已有的部分答案
        throw err;
      },
    });
  }, []);

  const resume = useCallback(async (resumeInput?: string) => {
    const store = useChatStore.getState();
    if (!store.threadId || !store.isInterrupted) return;

    store.setStreaming(true);
    store.setInterrupted(null);
    store.setError(null);

    abortRef.current = new AbortController();

    await fetchEventSource(`/api/agent/${store.threadId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ resume: resumeInput }),
      signal: abortRef.current.signal,
      openWhenHidden: true,

      onmessage(ev) {
        const payload = safeParse(ev.data);
        dispatch(useChatStore.getState(), ev.event, payload);
      },

      onclose() {
        useChatStore.getState().setStreaming(false);
      },

      onerror(err) {
        const cur = useChatStore.getState();
        cur.setError(err.message);
        cur.setStreaming(false);
        persistAssistantMessage(); // 保存已有的部分答案
        throw err;
      },
    });
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { send, resume, abort };
}
