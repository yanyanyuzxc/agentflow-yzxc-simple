import type { AgentResult } from "@/types/agent";
import { ChatAgent } from "./chat-agent";
import type { AgentRunOptions } from "./types";

/**
 * 编排任务定义
 */
export interface OrchestrationTask {
  /** 任务名称（用于结果映射） */
  name: string;
  /** 执行的 Agent 实例 */
  agent: ChatAgent;
  /** 问题文本 */
  question: string;
  /** 可选配置 */
  options?: AgentRunOptions;
}

/**
 * 编排结果
 */
export interface OrchestrationResult {
  name: string;
  result: AgentResult;
  error?: string;
}

/**
 * AgentOrchestrator — 多 Agent 编排器。
 *
 * 支持：
 * - register(name, agent)  注册 Agent
 * - run(name, question)    委托给指定 Agent
 * - sequence(tasks)        串行执行（后一个可见前一个结果）
 * - parallel(tasks)        并行执行
 *
 * @example
 * const orch = new AgentOrchestrator();
 * orch.register("chat", new ChatAgent());
 * orch.register("research", new ChatAgent({ model: "deepseek-r1" }));
 *
 * // 串行：先研究再总结
 * const results = await orch.sequence([
 *   { name: "research", agent: orch.get("research")!, question: "研究量子计算" },
 *   { name: "summary", agent: orch.get("chat")!,     question: "总结：{{research.answer}}" },
 * ]);
 */
export class AgentOrchestrator {
  private agents = new Map<string, ChatAgent>();

  /** 注册 Agent */
  register(name: string, agent: ChatAgent): this {
    this.agents.set(name, agent);
    return this;
  }

  /** 获取已注册的 Agent */
  get(name: string): ChatAgent | undefined {
    return this.agents.get(name);
  }

  /** 列出所有已注册名称 */
  list(): string[] {
    return [...this.agents.keys()];
  }

  /**
   * 委托给指定 Agent 执行。
   * 若 agentName 未注册，直接 new ChatAgent 执行。
   */
  async run(
    agentName: string,
    question: string,
    options?: AgentRunOptions,
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentName) ?? new ChatAgent();
    return agent.run(question, options);
  }

  /**
   * 串行执行多个任务。
   * 支持模板变量：`{{name.field}}` 引用前序任务结果。
   * 例如：`"总结：{{research.answer}}"` 会替换为 research 任务的 answer。
   */
  async sequence(tasks: OrchestrationTask[]): Promise<OrchestrationResult[]> {
    const results: OrchestrationResult[] = [];

    for (const task of tasks) {
      // 模板变量替换
      let question = task.question;
      for (const prev of results) {
        question = question.replaceAll(`{{${prev.name}.answer}}`, prev.result.answer);
        question = question.replaceAll(`{{${prev.name}.steps}}`, JSON.stringify(prev.result.steps));
      }

      try {
        const result = await task.agent.run(question, task.options);
        results.push({ name: task.name, result });
      } catch (e) {
        results.push({
          name: task.name,
          result: { answer: "", steps: [] },
          error: (e as Error).message,
        });
        // 默认：出错即停（可改为 continue）
        break;
      }
    }

    return results;
  }

  /**
   * 并行执行多个任务。
   */
  async parallel(tasks: OrchestrationTask[]): Promise<OrchestrationResult[]> {
    const promises = tasks.map(async (task): Promise<OrchestrationResult> => {
      try {
        const result = await task.agent.run(task.question, task.options);
        return { name: task.name, result };
      } catch (e) {
        return {
          name: task.name,
          result: { answer: "", steps: [] },
          error: (e as Error).message,
        };
      }
    });

    return Promise.all(promises);
  }
}
