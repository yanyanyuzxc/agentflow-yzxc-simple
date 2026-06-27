import { ChatAgent } from "./chat-agent";
import { AgentConfig } from "./config";
import { ToolRegistry, buildTool } from "@/lib/tools";
import { z } from "zod/v4";
import type { ToolDef } from "@/lib/tools";
import type { SSEEvent, AgentRunOptions } from "./types";
import { agentProfiles } from "./agentProfiles";

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

function buildSupervisorPrompt(profiles: Record<string, AgentProfile>): string {
  const agentList = Object.entries(profiles)
    .map(([id, p]) => `- **${id}**（${p.name}）：${p.description}`)
    .join("\n");

  return `你是**协调者**——你有一个 Agent 团队来回答问题。

## 可用 Agent

${agentList}

## 你的工具

- **speak(agent, instruction)** — 委托专业 Agent 执行任务。可以同时调多个 speak 来并行工作。
- 你也可以直接使用 web_search、crawl_page 等工具自己搜索。

## 决策指南

1. **简单问题直接回答** — 常识、计算、闲聊不用调 Agent
2. **需要搜索 → speak("search", ...)** — 告诉 search agent 具体搜什么
3. **多个搜索维度 → 一次调多个 speak** — 它们会并行执行
4. **需要对比分析 → speak("analyst", ...)** — 把搜索结果给 analyst 分析
5. **需要写报告 → speak("writer", ...)** — writer 基于分析结果撰写
6. **信息够了就回答** — 不要无限委托，直接整合结果输出最终回答

## 重要规则

- speak 的 instruction 要具体（"搜索 X 在 Y 方面的最新数据"），不要模糊（"帮我搜一下"）
- 不要对同一个问题重复委托相同的 Agent
- 你的最终回答是用户唯一看到的内容——确保它完整、有据可查
- **不要在文末列出参考来源清单**（搜索结果已在面板中可点击查看）`;
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

      // 子 Agent：使用 profile 的 systemPrompt + 禁用不需要的工具
      const disabledTools = [
        ...(profile.disabledTools ?? []),
        "search_docs",
        "save_memory",
        "speak", // 防止嵌套委托
      ];

      // 如果 profile.tools 为空，禁用所有搜索工具
      if (profile.tools.length === 0) {
        disabledTools.push("web_search", "crawl_page", "see_image", "run_python", "get_time");
      }

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
            collected += (ev.data as any).content || "";
          }
          if (ev.event !== "message_chunk") {
            sink(ev);
          }
        }

        sink({ event: "step_end", data: { step_id: subStepId } });
      } catch (e) {
        return `[speak] Agent "${agentName}" 执行失败: ${(e as Error).message}`;
      }

      if (!collected.trim()) {
        return `[speak] Agent "${agentName}" 未返回有效内容`;
      }

      return `[Agent ${profile.name} 执行结果]\n指令: ${task}\n\n${collected}`;
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
    const { threadId, resume, history, images, disabledTools } = options ?? {};

    // 事件缓冲——子 Agent 事件通过 sink 推入，在主循环中排空
    const eventBuffer: SSEEvent[] = [];
    const sink: EventSink = (ev) => eventBuffer.push(ev);

    // 创建 speak 工具
    const speakToolDef = createSpeakToolDef(this.profiles, userId, sink);

    // Supervisor 配置：使用 Supervisor prompt + 禁用不需要的工具
    // 合并运行时 disabledTools（如 route 层判断不需要 RAG 时传 ["search_docs"]）
    const supervisorConfig = new AgentConfig({
      systemPrompt: buildSupervisorPrompt(this.profiles),
      disabledTools: ["search_docs", "save_memory", ...(disabledTools ?? [])],
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
        // 先排空子 Agent 事件（出现在 supervisor 事件之间）
        while (eventBuffer.length > 0) {
          yield eventBuffer.shift()!;
        }
        yield ev;
      }

      // 排空剩余
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
