import { ChatAgent } from "./chat-agent";
import { AgentConfig } from "./config";
import { ToolRegistry } from "@/lib/tools";
import { z } from "zod/v4";
import type { ToolDef } from "@/lib/tools";
import type { SSEEvent, AgentRunOptions } from "./types";
import { agentProfiles } from "./agentProfiles";
import { listMemories } from "@/lib/db";
import { logger } from "@/lib/log";

// ==================== 类型 ====================

export interface AgentProfile {
  name: string;
  description: string;
  systemPrompt: string;
  tools: string[];
  disabledTools?: string[];
}

export type OrchestrationResult = {
  agent: string;
  result: string;
  error?: string;
};

// ==================== Supervisor Prompt ====================

async function buildSupervisorPrompt(profiles: Record<string, AgentProfile>, userId: number): Promise<string> {
  const agentList = Object.entries(profiles)
    .map(([id, p]) => `- **${id}**（${p.name}）：${p.description}`)
    .join("\n");

  // 动态段：日期 + 用户记忆
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" });
  const timeStr = now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  let dynamicSection = `\n## 环境信息\n当前时间：${dateStr} ${timeStr}（北京时间）。涉及时效性问题时参考此时间。`;

  try {
    const memories = await listMemories(userId);
    if (memories.length > 0) {
      const lines = memories.map((m) => `- [${m.type}] ${m.content}`);
      dynamicSection += `\n\n## 用户记忆\n${lines.join("\n")}\n回答时请参考这些信息。`;
    }
  } catch { /* 记忆加载失败不影响主流程 */ }

  return `你是**协调者**——你有一个 Agent 团队来回答问题。

## 可用 Agent

${agentList}

## 你的工具

- **speak(agent, instruction)** — 委托专业 Agent 执行任务。可以同时调多个 speak 来并行工作。
- 你没有直接的搜索工具，需要搜索时必须通过 speak("search", ...) 委托搜索 Agent。

## 决策指南

1. **简单问题直接回答** — 常识、计算、闲聊不用调 Agent
2. **需要搜索 → speak("search", ...)** — 告诉 search agent 具体搜什么
3. **用户问"我的知识库/文档/记忆" → 必须 speak("search", ...)** — 只有 search Agent 能访问知识库
4. **多个搜索维度 → 一次调多个 speak** — 它们会并行执行
5. **信息够了就回答** — 不要无限委托，直接整合结果输出最终回答

## 重要规则

- speak 的 instruction 要具体（"搜索 X 在 Y 方面的最新数据"），不要模糊（"帮我搜一下"）
- 不要对同一个问题重复委托相同的 Agent
- 你的最终回答是用户唯一看到的内容——确保它完整、有据可查
- **简洁回答** — 用要点列表而非长段落。搜索结果足够丰富时，只提炼最核心的要点
- **用你自己的话整合回答** — 不要直接把 speak 返回的文本原样输出给用户。消化、提炼后再输出最终回答。
- **不要在文末列出参考来源清单**（搜索结果已在面板中可点击查看）
- **不要重复搜索 Agent 已经说过的内容** — 你是整合者，不是复读机
${dynamicSection}`;
}

// ==================== Speak 工具 ====================

const SpeakInput = z.object({
  agent: z.enum(["search", "analyst", "writer"] as const).describe("委托的 Agent 类型"),
  instruction: z.string().min(1).describe("给 Agent 的具体指令，越具体越好"),
});

type EventSink = (ev: SSEEvent) => void;

function createSpeakToolDef(
  profiles: Record<string, AgentProfile>,
  userId: number,
  sink: EventSink,
): ToolDef {
  return {
    name: "speak",
    description:
      "委托专业 Agent 执行任务。search=搜索互联网获取信息，" +
      "analyst=对比分析数据找出模式和矛盾，" +
      "writer=基于分析撰写结构化报告。" +
      "可以同时调多个 speak 让 Agent 并行工作。",
    schema: SpeakInput,

    async call({ agent, instruction }) {
      const agentName = agent as string;
      const task = instruction as string;
      const profile = profiles[agentName];
      if (!profile) {
        return `[speak] 未知 Agent 类型: ${agentName}。可选: ${Object.keys(profiles).join(", ")}`;
      }

      // 子 Agent：根据 profile.tools 计算禁用列表
      const allDefaultNames = ToolRegistry.default().getNames();
      // 永远禁用的（防止嵌套委托）
      const alwaysDisabled = ["save_memory", "speak"];
      // profile.tools 声明了允许的工具 → 禁用不在声明列表中的所有默认工具
      const profileAllowed = new Set(profile.tools);
      const notAllowed = allDefaultNames.filter((t) => !profileAllowed.has(t) && !alwaysDisabled.includes(t));
      const disabledTools = [
        ...alwaysDisabled,
        ...notAllowed,
        ...(profile.disabledTools ?? []),
      ];

      const config = new AgentConfig({
        systemPrompt: profile.systemPrompt,
        disabledTools,
      });

      const subAgent = new ChatAgent(config);
      const subStepId = `speak_${Date.now().toString(36)}_${agentName}`;
      let collected = "";

      try {
        sink({
          event: "step_start",
          data: { step_id: subStepId, type: "thought", label: `${profile.name}: ${task.slice(0, 40)}` },
        });

        for await (const ev of subAgent.runStream(task, { userId })) {
          if (ev.event === "message_chunk" || ev.event === "thought") {
            const text = (ev.data as any).content || "";
            collected += text;
          }
          // 只转发步骤事件（tool_call/observation），不转发 message_chunk / done
          // message_chunk 是子 Agent 给 Supervisor 的内部材料
          // done 是子 Agent 的结束信号，不应发送给前端（Supervisor 还没回答完）
          if (ev.event !== "message_chunk" && ev.event !== "done") {
            sink(ev);
          }
        }

        sink({ event: "step_end", data: { step_id: subStepId } });
      } catch (e) {
        logger.error(`[Orch:speak] speak 失败`, { error: (e as Error).message });
        return `[speak] Agent "${agentName}" 执行失败: ${(e as Error).message}`;
      }

      if (!collected.trim()) {
        return `[speak] Agent "${agentName}" 未返回有效内容`;
      }

      // 截断过长结果，避免撑爆 Supervisor 上下文（它只需关键信息做整合）
      const MAX_RESULT = 1500;
      const truncated = collected.length > MAX_RESULT
        ? collected.slice(0, MAX_RESULT) + `\n\n...（已截断，共 ${collected.length} 字符）`
        : collected;
      return `[Agent ${profile.name} 执行结果]\n指令: ${task}\n\n${truncated}`;
    },
  };
}

// ==================== Orchestrator ====================

export class Orchestrator {
  private profiles: Record<string, AgentProfile>;

  constructor(profiles?: Record<string, AgentProfile>) {
    this.profiles = profiles ?? agentProfiles;
  }

  /**
   * 流式执行——替代 Planner.plan() + 三分支。
   * 返回 SSE 事件流，可直接 enqueue 给前端。
   */
  async *run(
    question: string,
    userId: number,
    options?: AgentRunOptions,
  ): AsyncGenerator<SSEEvent> {
    // 事件缓冲——子 Agent 事件通过 sink 推入，在主循环中排空
    // 不使用 directSink：缓冲确保子 Agent 事件排在 Supervisor 事件之后，避免乱序
    const tStart = performance.now();
    const { threadId, resume, history, images, disabledTools } = options ?? {};
    const eventBuffer: SSEEvent[] = [];
    const sink: EventSink = (ev) => eventBuffer.push(ev);

    // 创建 speak 工具
    const speakToolDef = createSpeakToolDef(this.profiles, userId, sink);

    // Supervisor 只能通过 speak 委派任务，禁用所有默认工具
    const supervisorPrompt = await buildSupervisorPrompt(this.profiles, userId);
    const supervisorConfig = new AgentConfig({
      systemPrompt: supervisorPrompt,
      disabledTools: [...ToolRegistry.default().getNames(), ...(disabledTools ?? [])],
    });

    // 动态注入 speak 工具到默认注册表（带清理标记）
    const defaultRegistry = ToolRegistry.default();
    let speakRegistered = false;

    try {
      defaultRegistry.register(speakToolDef);
      speakRegistered = true;

      // 构建含图片的增强问题
      let msgContent = question;
      if (images?.length) {
        const imageInfos = images
          .map((img) => `- ${img.url}${img.question ? ` (问题: ${img.question})` : ""}`)
          .join("\n");
        msgContent = question
          ? `${question}\n\n[用户上传了 ${images.length} 张图片]\n${imageInfos}\n\n如需理解图片内容，可调用 see_image 或 speak("search", ...) 搜索相关信息。`
          : `[用户上传了 ${images.length} 张图片]\n${imageInfos}`;
      }

      const supervisor = new ChatAgent(supervisorConfig);

      for await (const ev of supervisor.runStream(msgContent, {
        threadId,
        resume,
        userId,
        history,
        images,
      })) {
        // 排空子 Agent 事件（确保在下一个 Supervisor 事件之前发送）
        while (eventBuffer.length > 0) {
          yield eventBuffer.shift()!;
        }
        // 覆写 done 的总耗时（Orchestrator 的启动开销 + speak 时间也包括在内）
        if (ev.event === "done") {
          yield { event: "done", data: { totalDurationMs: Math.round(performance.now() - tStart) } };
        } else {
          yield ev;
        }
      }

      // 排空剩余的子 Agent 事件
      while (eventBuffer.length > 0) {
        yield eventBuffer.shift()!;
      }
    } finally {
      // 仅当 register 成功后才清理
      if (speakRegistered) {
        defaultRegistry.unregister(speakToolDef);
      }
    }
  }
}
