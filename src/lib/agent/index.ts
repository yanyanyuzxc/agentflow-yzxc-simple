// ==================== 类 ====================
export { ChatAgent } from "./chat-agent";
export { Orchestrator } from "./orchestrator";
export type { AgentProfile, OrchestrationResult } from "./orchestrator";
export { Planner } from "./planner";

// ==================== 基础设施 ====================
export { AgentConfig } from "./config";
export { ToolKit } from "./toolkit";
export { CheckpointManager } from "./checkpoint";

// ==================== 类型 ====================
export type { SSEEvent, AgentRunOptions, PlanStep, ExecutionPlan } from "./types";

// ==================== 提示词 ====================
export { SEARCH_AGENT_PROMPT, ANALYST_AGENT_PROMPT, WRITER_AGENT_PROMPT, REVIEWER_AGENT_PROMPT } from "./prompts";

// ==================== 便捷：默认实例 ====================
import { ChatAgent } from "./chat-agent";

/** 默认 ChatAgent 单例（无 checkpointer，适合简单场景） */
let defaultAgent: ChatAgent | null = null;

export function getDefaultAgent(): ChatAgent {
  if (!defaultAgent) {
    defaultAgent = new ChatAgent();
  }
  return defaultAgent;
}

/** 测试/重置用 */
export function resetDefaultAgent(): void {
  defaultAgent = null;
}

// ==================== 向后兼容：函数式 API ====================

import type { AgentResult } from "@/types/agent";
import type { SSEEvent, AgentRunOptions } from "./types";

/**
 * @deprecated 请使用 new ChatAgent().runStream()
 */
export async function* runAgentStream(
  question: string,
  options?: AgentRunOptions,
): AsyncGenerator<SSEEvent> {
  const agent = new ChatAgent();
  yield* agent.runStream(question, options);
}

/**
 * @deprecated 请使用 new ChatAgent().run()
 */
export async function runAgent(
  question: string,
  options?: AgentRunOptions,
): Promise<AgentResult> {
  const agent = new ChatAgent();
  return agent.run(question, options);
}

/**
 * @deprecated 请使用 new ChatAgent().resume()
 */
export async function resumeAgent(
  threadId: string,
  options?: { resume?: string },
): Promise<AgentResult> {
  const agent = new ChatAgent();
  return agent.resume(threadId, options);
}
