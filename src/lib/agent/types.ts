// ==================== Agent 模块内部类型 ====================
// 公共类型（AgentStep, AgentResult 等）见 @/types/agent

import type { AgentStepType } from "@/types/agent";

/** AsyncGenerator 产出的 SSE 事件（discriminated union） */
export type SSEEvent =
  | { event: "step_start"; data: { step_id: string; type: AgentStepType; label: string } }
  | { event: "thought"; data: { step_id: string; content: string } }
  | { event: "tool_call"; data: { step_id: string; name: string; args: Record<string, unknown> } }
  | { event: "observation"; data: { step_id: string; name: string; result: string; duration_ms?: number } }
  | { event: "answer_chunk"; data: { step_id: string; content: string } }
  | { event: "message_chunk"; data: { content: string } }
  | { event: "step_end"; data: { step_id: string } }
  | { event: "interrupt"; data: { interrupt_id: string; message: string; tool_name?: string } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: Record<string, never> };

/** runAgentStream / resume 的入参 */
export interface AgentRunOptions {
  threadId?: string;
  resume?: string;
  userId?: number;
  /** 时间旅行：从 DB 重建的历史消息，注入到 Agent 上下文中 */
  history?: import("@langchain/core/messages").BaseMessage[];
}
