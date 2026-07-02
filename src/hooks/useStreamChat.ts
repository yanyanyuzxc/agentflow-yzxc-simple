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

/**
 * 同步 dispatch — 只做 store 状态更新，不做 IO。
 * 持久化统一由调用方（onclose / abort）负责，不在消息处理中混入异步。
 */
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
      store.fillThought(payload.step_id as string, payload.content as string);
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
      store.appendAnswerChunk(payload.step_id as string, payload.content as string);
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
      store.setTotalDurationMs(payload.totalDurationMs as number);
      break;

    default:
      break;
  }
}

async function persistAssistantMessage() {
  const latest = useChatStore.getState();
  const convId = latest.activeConversationId;

  // 找最后一条 assistant 消息（由 message_chunk 流式构建）
  const msgs = [...latest.messages];
  const lastIdx = msgs.length - 1;
  const lastMsg = msgs[lastIdx];
  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.content) {
    return;
  }

  // 写入 agent_steps 到 store（供历史回放）
  if (latest.agentSteps.length > 0) {
    msgs[lastIdx] = { ...lastMsg, agent_steps: JSON.stringify(latest.agentSteps) };
    latest.setMessages(msgs);
  }

  // 持久化到 DB（await 确保刷新前写入完成）
  if (convId) {
    try {
      const saved = await chatService.addMessage(convId, {
        role: "assistant",
        content: lastMsg.content,
        agent_steps: latest.agentSteps,
      });
      const st = useChatStore.getState();
      st.setMessages(
        st.messages.map((m) => (m.id === lastMsg.id ? { ...m, id: saved.id } : m)),
      );
    } catch (err) {
      console.error("[done] persist failed:", err);
    }
  }
}

export function useStreamChat() {
  const abortRef = useRef<AbortController | null>(null);
  // 标记"已持久化"，防止 onclose 重复保存。
  // true → abort()/onerror 已保存过，onclose 跳过
  // false → onclose 负责保存（正常 done 或意外断连）
  const persistedRef = useRef(false);

  const send = useCallback(async (question: string, images?: import("@/types/models").ImageAttachment[], documents?: import("@/types/models").DocumentAttachment[]) => {
    persistedRef.current = false;
    abortRef.current = new AbortController();
    const store = useChatStore.getState();

    await fetchEventSource("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ question, threadId: store.threadId, images, documents, webSearchEnabled: store.webSearchEnabled, knowledgeBaseEnabled: store.knowledgeBaseEnabled }),
      signal: abortRef.current.signal,
      openWhenHidden: true,

      onmessage(ev) {
        const payload = safeParse(ev.data);
        dispatch(useChatStore.getState(), ev.event, payload);
      },

      onclose() {
        // 唯一持久化入口：正常 done / 意外断连 / onerror 后
        const cur = useChatStore.getState();
        if (!cur.isInterrupted && !persistedRef.current) {
          // 仍在 streaming 状态 → 未收到 done 事件，流意外中断
          if (cur.isStreaming) {
            cur.setIncompleteAnswer(true);
          }
          persistAssistantMessage().finally(() => cur.setStreaming(false));
        }
        // interrupt 或 abort 已保存 → 跳过
      },

      onerror(err) {
        const cur = useChatStore.getState();
        cur.setError(err.message);
        cur.setStreaming(false);
        // 不在这里 persist，交给 onclose 统一处理
      },
    });
  }, []);

  const resume = useCallback(async (resumeInput?: string) => {
    const store = useChatStore.getState();
    if (!store.threadId || !store.isInterrupted) return;

    store.setStreaming(true);
    store.setInterrupted(null);
    store.setError(null);
    persistedRef.current = false;

    abortRef.current = new AbortController();

    await fetchEventSource(`/api/agent/${store.threadId}/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ resume: resumeInput, webSearchEnabled: useChatStore.getState().webSearchEnabled }),
      signal: abortRef.current.signal,
      openWhenHidden: true,

      onmessage(ev) {
        const payload = safeParse(ev.data);
        dispatch(useChatStore.getState(), ev.event, payload);
      },

      onclose() {
        const cur = useChatStore.getState();
        if (!cur.isInterrupted && !persistedRef.current) {
          if (cur.isStreaming) {
            cur.setIncompleteAnswer(true);
          }
          persistAssistantMessage().finally(() => cur.setStreaming(false));
        } else {
          cur.setStreaming(false);
        }
      },

      onerror(err) {
        const cur = useChatStore.getState();
        cur.setError(err.message);
        cur.setStreaming(false);
        // 交给 onclose 统一持久化
      },
    });
  }, []);

  const abort = useCallback(async () => {
    // 人为中断：立即保存已输出的部分答案，标记已持久化
    await persistAssistantMessage();
    persistedRef.current = true;
    useChatStore.getState().setStreaming(false);
    abortRef.current?.abort();
  }, []);

  return { send, resume, abort };
}
