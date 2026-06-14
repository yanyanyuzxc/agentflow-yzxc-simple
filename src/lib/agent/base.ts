import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import type { AgentStep } from "@/types/agent";
import { AgentConfig } from "./config";
import { ToolKit } from "./toolkit";
import { CheckpointManager } from "./checkpoint";

/**
 * BaseAgent — 所有 Agent 的抽象基类。
 *
 * 职责：
 * - 持有 Config / ToolKit / CheckpointManager
 * - 提供 buildGraph() 抽象方法（子类实现 LangGraph 图结构）
 * - 提供 compile() 统一编译（checkpointer 注入）
 * - 提供 extractSteps() 静态工具方法
 */
export abstract class BaseAgent {
  protected config: AgentConfig;
  protected toolkit: ToolKit;
  protected checkpointManager: CheckpointManager;

  constructor(
    config?: Partial<AgentConfig>,
    toolkit?: ToolKit,
    checkpointManager?: CheckpointManager,
  ) {
    this.config = new AgentConfig(config);
    this.toolkit = toolkit ?? new ToolKit(this.config);
    this.checkpointManager = checkpointManager ?? new CheckpointManager(this.config.dbUrl);
  }

  // ==================== 子类必须实现 ====================

  /**
   * 构建 LangGraph 状态图。
   * 返回类型用 any 绕过 LangGraph 复杂的泛型推断
   * （泛型参数随 addNode 调用而变化，无法在抽象类层面精确标注）。
   */
  protected abstract buildGraph(
    tools: StructuredTool[],
    userId: number,
  ): any;

  // ==================== 编译 ====================

  /**
   * 编译图。如果传了 threadId 则注入 checkpointer 并启用中断。
   */
  async compile(userId: number, threadId?: string): Promise<any> {
    const tools = this.toolkit.build(userId);
    const graph = this.buildGraph(tools, userId);

    if (threadId) {
      const cp = await this.checkpointManager.get();
      if (cp) {
        return graph.compile({
          checkpointer: cp,
          // LangGraph 类型约束 interruptAfter 为只含 __start__ 的数组，
          // 实际运行时支持任意节点名，此处强制转换
          interruptAfter: this.config.interruptAfter as any,
        });
      }
    }

    return graph.compile();
  }

  // ==================== 步骤提取（静态工具） ====================

  /** 从 LangGraph messages 中提取 AgentStep 列表（用于历史回放） */
  static extractSteps(messages: BaseMessage[]): AgentStep[] {
    const steps: AgentStep[] = [];

    for (const msg of messages) {
      if (msg instanceof HumanMessage) continue;

      if (msg instanceof AIMessage) {
        const aiMsg = msg as AIMessage;
        if (aiMsg.tool_calls?.length) {
          steps.push({ type: "thought", content: (aiMsg.content as string) || "" });
          for (const tc of aiMsg.tool_calls!) {
            steps.push({
              type: "tool_call",
              content: `调用 ${tc.name}`,
              name: tc.name,
              args: tc.args as Record<string, unknown>,
            });
          }
        } else {
          steps.push({ type: "answer", content: aiMsg.content as string });
        }
      } else if (msg instanceof ToolMessage) {
        const tm = msg as ToolMessage;
        steps.push({
          type: "observation",
          content: (tm.content as string).slice(0, 300),
          name: tm.name,
          result: (tm.content as string).slice(0, 300),
        });
      }
    }

    return steps;
  }
}
