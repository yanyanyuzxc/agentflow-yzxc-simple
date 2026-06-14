// ==================== 步骤类型 ====================

export type AgentStepType = "thought" | "tool_call" | "observation" | "answer";

// 历史回放用（从 LangGraph messages 提取）
export interface AgentStep {
  type: AgentStepType;
  content: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: string;
  startedAt?: string;
  finishedAt?: string;
}

// 实时流式用（带状态机）
export type StreamingStepStatus = "pending" | "running" | "done" | "error";

export interface StreamingAgentStep {
  stepId: string;
  type: AgentStepType;
  label: string;
  status: StreamingStepStatus;
  content?: string;
  name?: string;
  args?: Record<string, unknown>;
  result?: string;
  durationMs?: number;
  error?: string;
}

// ==================== 中断 ====================

export interface InterruptData {
  interrupt_id: string;
  message: string;
  tool_name?: string;
  tool_args?: Record<string, unknown>;
}

// ==================== Agent 执行结果 ====================

export interface AgentResult {
  answer: string;
  steps: AgentStep[];
  interrupted?: boolean;
  threadId?: string;
}

// ==================== 工具定义 ====================

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  enabled: boolean;
}

export interface ToolCallState {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
}

// ==================== SSE 协议 ====================

export interface SSEEventPayloadMap {
  step_start: {
    step_id: string;
    type: AgentStepType;
    label: string;
  };
  thought: {
    step_id: string;
    content: string;
  };
  tool_call: {
    step_id: string;
    name: string;
    args: Record<string, unknown>;
  };
  observation: {
    step_id: string;
    name: string;
    result: string;
    duration_ms?: number;
  };
  answer_chunk: {
    step_id: string;
    content: string;
  };
  message_chunk: {
    content: string;
  };
  step_end: {
    step_id: string;
  };
  interrupt: {
    interrupt_id: string;
    message: string;
    tool_name?: string;
    tool_args?: Record<string, unknown>;
  };
  error: {
    message: string;
    code?: string;
    step_id?: string;
  };
  done: Record<string, never>;
}

export type SSEEventType = keyof SSEEventPayloadMap;
