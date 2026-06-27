import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatAgent } from "./chat-agent";
import type { SSEEvent } from "./types";
import type { ExecutionPlan, PlanStep } from "./types";
import { PLANNER_PROMPT, SEARCH_AGENT_PROMPT, ANALYST_AGENT_PROMPT, WRITER_AGENT_PROMPT, REVIEWER_AGENT_PROMPT } from "./prompts";
import { getEnv } from "@/lib/env";

/** 专用 Agent 的 system prompt 映射 */
const ROLE_PROMPTS: Record<PlanStep["agent"], string> = {
  search: SEARCH_AGENT_PROMPT,
  analyst: ANALYST_AGENT_PROMPT,
  writer: WRITER_AGENT_PROMPT,
  reviewer: REVIEWER_AGENT_PROMPT,
};

/** 非搜索 Agent 禁用的工具（analyst/writer/reviewer 不应调用搜索） */
const NON_SEARCH_DISABLED_TOOLS = ["web_search", "crawl_page"];

/** Agent 类型的中文标签 */
const AGENT_LABEL: Record<PlanStep["agent"], string> = {
  search: "搜索",
  analyst: "分析",
  writer: "撰写",
  reviewer: "审校",
};

/** 简单问题的降级 plan */
const SIMPLE_PLAN: ExecutionPlan = {
  complexity: "simple",
  reasoning: "简单问题，直接回答",
  steps: [],
};

/** 步骤输出最短长度（字符），低于此值触发重试 */
const MIN_STEP_OUTPUT_LENGTH = 20;

/** 步骤最大重试次数 */
const MAX_STEP_RETRIES = 1;

/**
 * Planner — 在 ReAct 前面加一层任务规划。
 *
 * 流程:
 * 1. plan(question) — LLM 判断复杂度，生成 JSON 执行计划
 * 2. compactPlan()  — 合并连续 search 步骤为一个（LLM 并行发多个 web_search）
 * 3. execute(plan)  — 串行执行压缩后的步骤
 *
 * 简单问题直接走现有 ChatAgent，不生成计划。
 */
export class Planner {
  private llm: ChatOpenAI;

  constructor() {
    const env = getEnv();
    this.llm = new ChatOpenAI({
      apiKey: env.SILICONFLOW_API_KEY,
      configuration: { baseURL: env.LLM_BASE_URL ?? "https://api.siliconflow.cn/v1", timeout: 30000 },
      model: env.LLM_MODEL ?? "deepseek-ai/DeepSeek-V4-Flash",
    });
  }

  // ==================== 计划生成 ====================

  /**
   * 判断问题复杂度并生成执行计划。
   * 解析失败时降级为简单问题。
   */
  async plan(question: string): Promise<ExecutionPlan> {
    const now = new Date();
    const dateStr = now.toLocaleDateString("zh-CN", {
      year: "numeric", month: "2-digit", day: "2-digit", weekday: "long",
    });
    const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const prompt = PLANNER_PROMPT.replace("{currentDate}", `${dateStr} ${timeStr}（北京时间）`);

    try {
      const response = await this.llm.invoke([
        new SystemMessage(prompt),
        new HumanMessage(question),
      ]);

      const text = (response.content as string).trim();
      const plan = this.parsePlan(text);

      if (plan.complexity !== "simple" && !this.validatePlan(plan)) {
        console.warn("[Planner] 计划不合理，降级为简单模式");
        return SIMPLE_PLAN;
      }

      return plan;
    } catch (e) {
      console.warn("[Planner] LLM 调用失败，降级为简单模式:", (e as Error).message);
      return SIMPLE_PLAN;
    }
  }

  /** 从 LLM 输出中解析 JSON 计划 */
  private parsePlan(text: string): ExecutionPlan {
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      const parsed = JSON.parse(jsonStr);

      if (!parsed.complexity || !Array.isArray(parsed.steps)) {
        console.warn("[Planner] JSON 格式不完整，降级为简单模式:", jsonStr.slice(0, 200));
        return SIMPLE_PLAN;
      }

      if (parsed.complexity === "simple") {
        return { complexity: "simple", reasoning: parsed.reasoning || "", steps: [] };
      }

      const validAgents = ["search", "analyst", "writer", "reviewer"];
      const steps: PlanStep[] = parsed.steps
        .filter((s: any) => s.agent && s.task)
        .map((s: any) => ({
          agent: validAgents.includes(s.agent) ? s.agent : "search",
          task: String(s.task),
        }));

      if (steps.length === 0) return SIMPLE_PLAN;

      return {
        complexity: parsed.complexity === "complex" ? "complex" : "medium",
        reasoning: parsed.reasoning || "",
        steps,
      };
    } catch {
      console.warn("[Planner] JSON 解析失败，降级为简单模式:", jsonStr.slice(0, 200));
      return SIMPLE_PLAN;
    }
  }

  /** 校验计划的合理性 */
  private validatePlan(plan: ExecutionPlan): boolean {
    if (plan.steps.length === 0) return true;

    if (plan.steps.length > 10) {
      console.warn("[Planner] 步骤过多:", plan.steps.length);
      return false;
    }

    const searchIndices = plan.steps
      .map((s, i) => (s.agent === "search" ? i : -1))
      .filter((i) => i >= 0);

    for (let i = 0; i < plan.steps.length; i++) {
      const agent = plan.steps[i].agent;
      if ((agent === "analyst" || agent === "writer")) {
        if (searchIndices.length === 0 || searchIndices[0] > i) {
          console.warn(`[Planner] ${agent} 在步骤 ${i + 1}，但之前没有 search`);
          return false;
        }
      }
    }

    if (plan.steps[0].agent === "reviewer") {
      console.warn("[Planner] reviewer 不应作为第一步");
      return false;
    }

    return true;
  }

  // ==================== 计划压缩（合并连续 search） ====================

  /**
   * 检测 task 是否引用了前 N 个步骤的答案 {{N.answer}}。
   */
  private hasDependency(task: string, startIndex: number): boolean {
    const re = /\{\{(\d+)\.answer\}\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(task)) !== null) {
      const refIdx = parseInt(m[1], 10);
      if (refIdx <= startIndex) return true;
    }
    return false;
  }

  /**
   * 将连续 search 步骤合并为一个。
   *
   * 合并后的 task 告诉 LLM "为每个维度分别调用 web_search，可以并行调"。
   * 一个 Agent 一次性发 3 个 web_search → LangGraph ToolNode 并行执行 → 1 次 LLM 收结果。
   *
   * @returns 压缩后的步骤列表 + 旧索引到新索引的映射（用于重写 {{N.answer}} 引用）
   */
  private compactSteps(steps: PlanStep[]): PlanStep[] {
    if (steps.length === 0) return [];

    const newSteps: PlanStep[] = [];
    const oldToNew: number[] = new Array(steps.length).fill(-1);
    let i = 0;

    while (i < steps.length) {
      // 非 search → 直接保留
      if (steps[i].agent !== "search") {
        oldToNew[i] = newSteps.length;
        newSteps.push({ ...steps[i] });
        i++;
        continue;
      }

      // 收集连续 search 步骤
      const batchIndices: number[] = [i];
      i++;
      while (
        i < steps.length &&
        steps[i].agent === "search" &&
        !this.hasDependency(steps[i].task, batchIndices[0])
      ) {
        batchIndices.push(i);
        i++;
      }

      const newIndex = newSteps.length;
      for (const idx of batchIndices) {
        oldToNew[idx] = newIndex;
      }

      if (batchIndices.length === 1) {
        // 单个搜索 → 保留原样
        newSteps.push({ ...steps[batchIndices[0]] });
      } else {
        // 多个搜索 → 合并为一个 task
        const dimensions = batchIndices
          .map((idx, k) => `**维度${k + 1}**：${steps[idx].task}`)
          .join("\n\n");

        const combinedTask =
          `你需要搜索以下 ${batchIndices.length} 个维度的信息。` +
          `请**为每个维度分别调用 web_search**（可以在同一轮工具调用中并行发出），` +
          `搜索完成后整理汇总所有结果。\n\n${dimensions}`;

        newSteps.push({ agent: "search" as const, task: combinedTask });
      }
    }

    // 重写后续步骤中的 {{N.answer}} 引用
    for (const step of newSteps) {
      step.task = step.task.replace(/\{\{(\d+)\.answer\}\}/g, (_, num: string) => {
        const oldIdx = parseInt(num, 10) - 1;
        const newIdx = oldToNew[oldIdx];
        return newIdx >= 0 ? `{{${newIdx + 1}.answer}}` : `{{${num}.answer}}`;
      });
    }

    return newSteps;
  }

  // ==================== 计划执行 ====================

  /** 解析模板变量 */
  private resolveTemplate(task: string, stepAnswers: string[], upToIndex: number): string {
    let resolved = task;
    for (let j = 0; j < upToIndex; j++) {
      resolved = resolved.replaceAll(`{{${j + 1}.answer}}`, stepAnswers[j] || "(无结果)");
    }
    return resolved;
  }

  /**
   * 按计划顺序执行，产出 SSE 事件流。
   *
   * 所有步骤串行执行（连续 search 已在 compactSteps 中合并为一个 Agent）。
   * - search 步骤：tool_call + observation 实时显示，message_chunk 仅内部累积
   * - analyst/writer/reviewer 步骤：message_chunk 流式输出到聊天区
   */
  async *execute(
    plan: ExecutionPlan,
    userId: number,
    threadId?: string,
  ): AsyncGenerator<SSEEvent> {
    const compacted = this.compactSteps(plan.steps);
    const stepAnswers: string[] = [];
    const totalSteps = compacted.length;

    if (totalSteps === 0) {
      yield { event: "message_chunk", data: { content: plan.reasoning } };
      yield { event: "done", data: {} };
      return;
    }

    // 先发计划摘要（用压缩后的步骤数，不是 Planner 原始输出数）
    {
      const summaryId = `plan_${Date.now().toString(36)}_summary`;
      const agentSeq = compacted.map((s) => AGENT_LABEL[s.agent]).join(" → ");
      yield {
        event: "step_start",
        data: {
          step_id: summaryId,
          type: "thought",
          label: `执行计划: ${totalSteps} 步 (${agentSeq}) — ${plan.reasoning.slice(0, 60)}`,
        },
      };
      yield { event: "step_end", data: { step_id: summaryId } };
    }

    let searchRound = 0;

    for (let i = 0; i < compacted.length; i++) {
      const step = compacted[i];
      const stepId = `plan_${i + 1}`;
      const stepNum = i + 1;

      // 解析模板变量
      const task = this.resolveTemplate(step.task, stepAnswers, i);

      // 步骤标题：合并搜索用简短维度名，非搜索用 task 摘要
      const agentLabel = AGENT_LABEL[step.agent];
      let label: string;
      if (step.agent === "search" && task.startsWith("你需要搜索以下")) {
        // 合并搜索 → 提取维度关键词做标题
        const dimMatches = task.match(/\*\*维度\d+\*\*[：:]\s*(.*?)(?:\n|$)/g);
        if (dimMatches && dimMatches.length > 0) {
          const dims = dimMatches.map((d) => d.replace(/\*\*维度\d+\*\*[：:]\s*/, "").slice(0, 25)).join("、");
          label = `步骤 ${stepNum}/${totalSteps}: 搜索 ${dimMatches.length} 个维度：${dims}`;
        } else {
          label = `步骤 ${stepNum}/${totalSteps}: 搜索 ${compacted.length > 1 ? "多维度" : ""}`;
        }
      } else {
        const taskSummary = task.length > 40 ? task.slice(0, 40) + "..." : task;
        label = `步骤 ${stepNum}/${totalSteps}: ${agentLabel} — ${taskSummary}`;
      }
      yield {
        event: "step_start",
        data: {
          step_id: stepId,
          type: "thought",
          label,
        },
      };

      // 执行步骤
      let stepContent = "";
      let retries = 0;

      while (retries <= MAX_STEP_RETRIES) {
        stepContent = "";

        try {
          const agentPrompt = ROLE_PROMPTS[step.agent];
          const attemptTask = retries > 0
            ? task + `\n\n⚠️ 你的上一次输出太短（少于 ${MIN_STEP_OUTPUT_LENGTH} 字符）或为空。请确保返回完整结果，不要跳过关键步骤。`
            : task;
          // P3: 非搜索 Agent 禁止调用 web_search / crawl_page
          const agentDisabledTools = step.agent === "search" ? undefined : NON_SEARCH_DISABLED_TOOLS;
          const agent = new ChatAgent({ systemPrompt: agentPrompt, disabledTools: agentDisabledTools });

          for await (const ev of agent.runStream(attemptTask, { userId })) {
            if (ev.event === "done") continue;

            if (ev.event === "message_chunk") {
              stepContent += (ev.data as any).content || "";
              // 搜索步骤：message_chunk 仅内部累积，不输出
              // 非搜索步骤：流式输出到聊天区
              if (step.agent !== "search") {
                yield ev;
              }
              continue;
            }

            // 工具调用 + 观察结果 → 加前缀后输出
            if ("step_id" in (ev.data as any) && (ev.data as any).step_id) {
              const data = { ...(ev.data as any) };
              data.step_id = `${stepId}_${data.step_id}`;
              yield { event: ev.event, data } as SSEEvent;
            } else {
              yield ev;
            }
          }

          if (stepContent.trim().length >= MIN_STEP_OUTPUT_LENGTH) {
            break;
          }
        } catch (e) {
          const errMsg = (e as Error).message;
          console.error(`[Planner] 步骤 ${i + 1} 失败 (尝试 ${retries + 1}/${MAX_STEP_RETRIES + 1}):`, errMsg);
          if (retries >= MAX_STEP_RETRIES) {
            stepContent = `(执行失败: ${errMsg})`;
            yield { event: "error", data: { message: `步骤 ${i + 1} 执行失败: ${errMsg}` } };
          }
        }

        if (stepContent.trim().length < MIN_STEP_OUTPUT_LENGTH && retries < MAX_STEP_RETRIES) {
          const retryId = `${stepId}_retry`;
          yield {
            event: "step_start",
            data: { step_id: retryId, type: "thought", label: `步骤 ${stepNum}/${totalSteps}: 输出过短，重试...` },
          };
          yield { event: "step_end", data: { step_id: retryId } };
        }
        retries++;
      }

      stepAnswers[i] = stepContent || "(无结果)";
      yield { event: "step_end", data: { step_id: stepId } };

      // 搜索步骤完成后 → 整理摘要
      if (step.agent === "search") {
        searchRound++;
        const summaryId = `plan_search_summary_${searchRound}`;
        const preview = step.task.replace(/\n/g, " ").slice(0, 60);
        yield {
          event: "step_start",
          data: {
            step_id: summaryId,
            type: "thought",
            label: `已完成搜索：${preview}${preview.length < Math.min(step.task.length, 60) ? "..." : ""}`,
          },
        };
        yield { event: "step_end", data: { step_id: summaryId } };
      }
    }

    yield { event: "done", data: {} };
  }
}
