import {
  StateGraph,
  END,
  MessagesAnnotation,
  Command,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  AIMessageChunk,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import type { StructuredTool } from "@langchain/core/tools";
import type { AgentResult, AgentStep } from "@/types/agent";
import type { SSEEvent, AgentRunOptions } from "./types";
import { AgentConfig } from "./config";
import { ToolKit } from "./toolkit";
import { CheckpointManager } from "./checkpoint";
import { buildSystemPrompt } from "./prompt";
import { logger } from "@/lib/log";

// ==================== 常量 ====================

/** 最多允许的工具调用轮数 */
const MAX_TOOL_ROUNDS = 8;
/** 上下文压缩阈值（~60% of DeepSeek 128k window） */
const COMPRESS_THRESHOLD = 80_000;

// ==================== P1: LLM 重试 ====================

function isRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (/timeout|timed out|econnrefused|econnreset|enotfound|enetunreach|socket|abort|network/i.test(msg)) return true;
  if (/5\d\d|503|502|504|429/.test(msg)) return true;
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, label = "LLM"): Promise<T> {
  const maxRetries = 3;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < maxRetries && isRetryable(e)) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        logger.warn(`[ChatAgent] ${label} 失败 (尝试 ${attempt + 1}/${maxRetries + 1})，${delay}ms 后重试`, { error: (e as Error).message });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("unreachable");
}

// ==================== P2: 上下文压缩 ====================

function estimateTokens(messages: BaseMessage[]): number {
  let chars = 0;
  for (const m of messages) {
    const c = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
    chars += c.length;
    if (AIMessage.isInstance(m)) {
      const tc = (m as AIMessage).tool_calls;
      if (tc?.length) chars += JSON.stringify(tc).length;
    }
  }
  const chineseChars = (chars.toString().match(/[一-鿿]/g) || []).length;
  const otherChars = chars - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}

async function compressMessages(
  messages: BaseMessage[],
  llm: ChatOpenAI,
): Promise<BaseMessage[]> {
  const tokens = estimateTokens(messages);
  if (tokens < COMPRESS_THRESHOLD) return messages;

  const keepCount = Math.min(6, messages.length);
  const toKeep = messages.slice(-keepCount);
  const toCompress = messages.slice(0, -keepCount);

  if (toCompress.length < 4) return messages;

  logger.info(`[ChatAgent] 上下文压缩`, { tokens, threshold: COMPRESS_THRESHOLD, messages: toCompress.length });

  try {
    const compressPrompt = [
      "将以下对话历史压缩为简短摘要（300 字以内）。只保留关键信息：用户问了什么、Agent 做了什么搜索、得到了什么结论。",
      "---",
      ...toCompress.map((m) => {
        const role = m instanceof HumanMessage ? "用户" : m instanceof AIMessage ? "Agent" : m instanceof ToolMessage ? `工具[${(m as ToolMessage).name}]` : "系统";
        const content = typeof m.content === "string" ? m.content.slice(0, 500) : "(非文本)";
        return `${role}: ${content}`;
      }),
    ].join("\n");

    const response = await withRetry(
      () => llm.invoke([new HumanMessage(compressPrompt)]),
      "compress",
    );
    const summary = (response.content as string).trim();

    return [
      new SystemMessage(`[对话历史摘要]\n${summary}\n---`),
      ...toKeep,
    ];
  } catch (e) {
    logger.warn("[ChatAgent] 上下文压缩失败，保持原消息", { error: (e as Error).message });
    return messages;
  }
}

// ==================== DeepSeek XML 工具调用解析 ====================

function parseXmlToolCalls(content: string): { name: string; args: Record<string, unknown>; id: string }[] {
  const results: { name: string; args: Record<string, unknown>; id: string }[] = [];
  const invokeRe = /<invoke\s+name="([^"]+)"[^>]*>([\s\S]*?)<\/invoke>/gi;
  let m: RegExpExecArray | null;
  while ((m = invokeRe.exec(content)) !== null) {
    const toolName = m[1];
    const body = m[2];
    const argRe = /<parameter\s+name="arguments"[^>]*>([\s\S]*?)<\/parameter>/i;
    const argMatch = argRe.exec(body);
    let args: Record<string, unknown> = {};
    if (argMatch) {
      try { args = JSON.parse(argMatch[1].trim()); } catch { /* keep {} */ }
    }
    results.push({
      name: toolName,
      args,
      id: `call_${Math.random().toString(36).slice(2, 10)}`,
    });
  }
  return results;
}

function hasToolCallMarkup(content: string): boolean {
  return /DSML|dsml|<tool[>_\s]|<invoke/i.test(content);
}

// ==================== ChatAgent ====================

/**
 * ChatAgent — ReAct 对话 Agent。
 *
 * 自包含模块：持有 config / toolkit / checkpointManager，
 * 负责 LangGraph 图构建、编译、流式/非流式执行。
 *
 * 图结构：__start__ → agent ⇄ tools → END
 *
 * @example
 * const agent = new ChatAgent();
 * for await (const ev of agent.runStream("你好", { userId: 1 })) { ... }
 */
export class ChatAgent {
  protected config: AgentConfig;
  protected toolkit: ToolKit;
  protected checkpointManager: CheckpointManager;

  /** 瞬态运行上下文：runStream 开始时设置，agent 节点闭包中读取 */
  private _run: {
    /** 历史消息数（不含本轮），用于排除历史 tool_calls 计数 */
    historyMsgCount: number;
    /** 运行时禁用的工具列表（优先级高于 config.disabledTools） */
    disabledTools?: string[];
    /** token 级流式回调：每收到一个 token 就调用 */
    onToken?: (token: string) => void;
  } = { historyMsgCount: 0 };

  constructor(
    config?: Partial<AgentConfig>,
    toolkit?: ToolKit,
    checkpointManager?: CheckpointManager,
  ) {
    this.config = new AgentConfig(config);
    this.toolkit = toolkit ?? new ToolKit(this.config);
    this.checkpointManager = checkpointManager ?? new CheckpointManager(this.config.dbUrl);
  }

  // ==================== 编译 ====================

  /**
   * 编译 LangGraph 图。如果传了 threadId 则注入 checkpointer 并启用中断。
   */
  async compile(userId: number, threadId?: string): Promise<any> {
    const tools = this.toolkit.build(userId);
    const graph = this.buildGraph(tools, userId);

    if (threadId) {
      const cp = await this.checkpointManager.get();
      if (cp) {
        return graph.compile({
          checkpointer: cp,
          interruptAfter: this.config.interruptAfter as any,
        });
      }
    }

    return graph.compile();
  }

  // ==================== 图构建 ====================

  protected buildGraph(
    tools: StructuredTool[],
    _userId: number,
  ) {
    const llm = new ChatOpenAI({
      apiKey: this.config.apiKey,
      configuration: { baseURL: this.config.baseURL, timeout: 60000 },
      model: this.config.model,
    });

    const toolMap = new Map<string, StructuredTool>();
    for (const t of tools) toolMap.set(t.name, t);

    // 在闭包中捕获 this，agent 节点执行时读取 _run 瞬态
    const self = this;

    return new StateGraph(MessagesAnnotation)
      .addNode("agent", async (state: typeof MessagesAnnotation.State) => {
        // 统计本轮已完成的工具调用轮数（排除历史消息中的 tool_calls）
        const toolCallRounds = state.messages
          .slice(self._run.historyMsgCount)
          .filter((m) => AIMessage.isInstance(m) && (m as AIMessage).tool_calls?.length)
          .length;
        // 合并运行时 + 配置层的禁用工具列表
        const disabledTools = [
          ...(self._run.disabledTools ?? []),
          ...(self.config.disabledTools ?? []),
        ];

        // 超过上限 → 强制不带工具直接回答
        if (toolCallRounds >= MAX_TOOL_ROUNDS) {
          const prompt = self.config.systemPrompt ?? await buildSystemPrompt(_userId);
          const forceStop = [
            prompt,
            "## ⚠️ 强制终止搜索",
            `你已经进行了 ${toolCallRounds} 轮工具调用（上限 ${MAX_TOOL_ROUNDS} 轮）。`,
            "现在必须给出最终答案，绝对不能再调用任何工具。",
            "如果搜索结果中确实没有找到用户需要的信息，请诚实告知用户，并说明你尝试了哪些搜索关键词。",
            "不要编造信息来填补空白。",
          ].join("\n\n");
          const systemMsg = new SystemMessage(forceStop);
          const compressed = await compressMessages(state.messages, llm);
          const fChunks: AIMessageChunk[] = [];
          const fStream = await llm.stream([systemMsg, ...compressed]);
          for await (const chunk of fStream) {
            if (chunk.content) self._run.onToken?.(chunk.content as string);
            fChunks.push(chunk);
          }
          const response = fChunks.reduce((acc, c) => acc.concat(c));
          return { messages: [response] };
        }

        // 正常流程：带工具推理
        const activeTools = disabledTools.length
          ? tools.filter((t) => !disabledTools.includes(t.name))
          : tools;
        const llmWithTools = llm.bindTools(activeTools);
        const basePrompt = self.config.systemPrompt ?? await buildSystemPrompt(_userId);
        // 收敛信号：渐进式提醒 LLM 适可而止
        let finalPrompt = basePrompt;
        if (toolCallRounds >= 2 && toolCallRounds < 5) {
          finalPrompt = basePrompt + `\n\n## 收敛提醒\n你已经进行了 ${toolCallRounds} 轮工具调用。如果现有信息已足够回答用户问题，请直接给出答案，不要继续搜索。只有在确实缺少关键信息时才追加搜索。`;
        } else if (toolCallRounds >= 5) {
          finalPrompt = basePrompt + `\n\n## ⚠️ 强制收敛\n你已经进行了 ${toolCallRounds} 轮工具调用，接近上限 ${MAX_TOOL_ROUNDS} 轮。必须尽快基于现有信息给出答案。不要追求完美——有据可查即可。`;
        }
        const systemMsg = new SystemMessage(finalPrompt);

        const compressed = await compressMessages(state.messages, llm);

        let response: AIMessage;
        try {
          const sChunks: AIMessageChunk[] = [];
          const sStream = await llmWithTools.stream([systemMsg, ...compressed]);
          for await (const chunk of sStream) {
            if (chunk.content) self._run.onToken?.(chunk.content as string);
            sChunks.push(chunk);
          }
          response = sChunks.reduce((acc, c) => acc.concat(c));
        } catch (e) {
          logger.error(`[ChatAgent] agent 节点: stream 失败`, { error: (e as Error).message });
          throw e;
        }

        // DeepSeek XML 工具调用解析
        const responseContent = (response.content as string) || "";
        const hasParsedTools = !!(response as AIMessage).tool_calls?.length;
        if (hasToolCallMarkup(responseContent)) {
          const xmlParsed = parseXmlToolCalls(responseContent);
          if (xmlParsed.length > 0) {
            const merged = [...((response as AIMessage).tool_calls || []), ...xmlParsed];
            const seen = new Set<string>();
            const unique = merged.filter((tc) => {
              const key = tc.name + JSON.stringify(tc.args);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            const cleanContent = responseContent.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/gi, "").trim();
            (response as any).content = cleanContent;
            (response as any).tool_calls = unique;
          } else if (!hasParsedTools) {
            const cleanContent = responseContent.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/gi, "").trim();
            (response as any).content = cleanContent;
          }
        }

        return { messages: [response] };
      })
      .addNode("tools", async (state: typeof MessagesAnnotation.State) => {
        const last = state.messages[state.messages.length - 1] as AIMessage;
        let toolCalls = last.tool_calls ?? [];

        if (toolCalls.length === 0) return { messages: [] };

        // 并行执行所有工具调用
        const results = await Promise.allSettled(
          toolCalls.map(async (tc) => {
            const tool = toolMap.get(tc.name);
            if (!tool) {
              return new ToolMessage({
                content: `[${tc.name}] 工具未找到`,
                tool_call_id: tc.id!,
                name: tc.name,
              });
            }
            try {
              const output = await tool.invoke(tc.args as Record<string, unknown>);
              return new ToolMessage({
                content: typeof output === "string" ? output : JSON.stringify(output),
                tool_call_id: tc.id!,
                name: tc.name,
              });
            } catch (e) {
              return new ToolMessage({
                content: `[${tc.name}] 执行失败: ${(e as Error).message}`,
                tool_call_id: tc.id!,
                name: tc.name,
              });
            }
          }),
        );

        return {
          messages: results.map((r) =>
            r.status === "fulfilled" ? r.value : new ToolMessage({
              content: `工具执行异常: ${(r.reason as any)?.message || "未知"}`,
              tool_call_id: "unknown",
              name: "error",
            }),
          ),
        };
      })
      .addEdge("__start__", "agent")
      .addConditionalEdges("agent", (state: typeof MessagesAnnotation.State): string => {
        const last = state.messages[state.messages.length - 1];
        if ((last as AIMessage).tool_calls?.length) {
          return "tools";
        }
        return END;
      })
      .addEdge("tools", "agent");
  }

  // ==================== 事件构建辅助 ====================

  /** 将 tool_calls 按工具名分组，处理 args 解析 */
  private static _groupToolCalls(toolCalls: any[]): Map<string, { args: Record<string, unknown>[] }> {
    const groups = new Map<string, { args: Record<string, unknown>[] }>();
    for (const tc of toolCalls) {
      const name = tc.name;
      if (!name) continue;
      if (!groups.has(name)) groups.set(name, { args: [] });
      let args: Record<string, unknown> = {};
      try { args = typeof tc.args === "string" ? JSON.parse(tc.args) : (tc.args ?? {}); } catch { /* keep {} */ }
      groups.get(name)!.args.push(args);
    }
    return groups;
  }

  // ==================== 流式执行 ====================

  async *runStream(
    question: string,
    options?: AgentRunOptions,
  ): AsyncGenerator<SSEEvent> {
    const t0 = performance.now();
    const { threadId, resume, userId = 1, history, images, disabledTools } = options ?? {};

    // token 缓冲区：agent 节点流式推送，runStream 主循环排空
    const pendingTokens: string[] = [];

    // 设置瞬态运行上下文（agent 节点闭包中读取）
    this._run = {
      historyMsgCount: history?.length ?? 0,
      disabledTools,
      onToken: (token) => { pendingTokens.push(token); },
    };

    // 非 resume 模式 → 清除旧检查点，确保每次对话从干净状态开始
    // 不清会导致 LangGraph 尝试 resume 旧 thread 状态 → 冲突卡死
    if (threadId && !resume) {
      await this.checkpointManager.clearThread(threadId);
    }

    const graph = await this.compile(userId, threadId);
    const config = threadId ? { configurable: { thread_id: threadId } } : {};

    // 构建含图片信息的 HumanMessage
    let msgContent = question;
    if (images?.length) {
      const imageInfos = images
        .map((img) => `- ${img.url}${img.question ? ` (问题: ${img.question})` : ""}`)
        .join("\n");
      msgContent = question
        ? `${question}\n\n[用户上传了 ${images.length} 张图片]\n${imageInfos}\n\n如果你需要理解图片内容来回答用户的问题，请调用 see_image 工具，传入图片URL。`
        : `[用户上传了 ${images.length} 张图片]\n${imageInfos}\n\n请调用 see_image 工具了解图片内容。`;
    }

    const input = resume
      ? new Command({ resume } as any)
      : msgContent
        ? { messages: [...(history ?? []), new HumanMessage(msgContent)] }
        : null;

    const runId = `${Date.now().toString(36)}`;
    let stepCounter = 0;
    let roundCounter = 0;
    const sid = () => `${runId}_${++stepCounter}`;

    const stream = await graph.stream(input, {
      ...config,
      streamMode: "updates" as any,
      recursionLimit: 25,
    });

    try {
      for await (const rawChunk of stream) {
        // streamMode: "updates" → 每个 chunk 是 { nodeName: { messages: [...] } }
        const nodeName = Object.keys(rawChunk as Record<string, unknown>)[0];
        const nodeOutput = (rawChunk as Record<string, unknown>)[nodeName] as { messages?: BaseMessage[] };
        const messages = nodeOutput?.messages ?? [];

        // agent 节点 → LLM 思考 + 决策（可能含 tool_calls）
        if (nodeName === "agent") {
          for (const msg of messages) {
            const ai = msg as AIMessage;
            const toolCalls = ai.tool_calls;

            if (toolCalls?.length) {
              // 有工具调用 → pendingTokens 是思考文字，丢弃
              pendingTokens.length = 0;
              roundCounter++;
              // 轮次标识
              const rs = sid();
              yield { event: "step_start", data: { step_id: rs, type: "thought", label: `🔄 第 ${roundCounter} 轮` } } as SSEEvent;
              yield { event: "thought", data: { step_id: rs, content: `思考中...` } } as SSEEvent;
              // 按工具名分组输出
              for (const [name, group] of ChatAgent._groupToolCalls(toolCalls as any)) {
                const tcs = sid();
                const suffix = group.args.length > 1 ? ` (${group.args.length}次)` : "";
                yield { event: "step_start", data: { step_id: tcs, type: "tool_call", label: `调用 ${name}${suffix}` } } as SSEEvent;
                const displayArgs = group.args.length === 1 ? group.args[0] : group.args;
                yield { event: "tool_call", data: { step_id: tcs, name, args: displayArgs } } as SSEEvent;
                yield { event: "step_end", data: { step_id: tcs } } as SSEEvent;
              }
              yield { event: "step_end", data: { step_id: rs } } as SSEEvent;
            } else {
              // 最终回答：优先流式 token，fallback 完整 content
              if (pendingTokens.length > 0) {
                for (const token of pendingTokens) {
                  yield { event: "message_chunk", data: { content: token } };
                }
                pendingTokens.length = 0;
              } else {
                const content = (ai.content as string) || "";
                if (content && !hasToolCallMarkup(content)) {
                  yield { event: "message_chunk", data: { content } };
                }
              }
            }
          }
        }

        // tools 节点 → 工具执行结果
        if (nodeName === "tools") {
          for (const msg of messages) {
            const tm = msg as ToolMessage;
            const os = sid();
            const rawContent = (tm.content as string) || "";
            yield { event: "step_start", data: { step_id: os, type: "observation", label: `${tm.name ?? "tool"} 返回` } } as SSEEvent;
            yield { event: "observation", data: { step_id: os, name: tm.name ?? "tool", result: rawContent.slice(0, 200) } } as SSEEvent;
            yield { event: "step_end", data: { step_id: os } } as SSEEvent;
          }
        }
      }

      // 检查中断状态
      if (threadId) {
        const state = await graph.getState(config);
        if (state.next.length > 0) {
          yield { event: "interrupt", data: { interrupt_id: threadId, message: "工具执行完毕，是否继续？" } };
          return;
        }
      }
      yield { event: "done", data: { totalDurationMs: Math.round(performance.now() - t0) } };
    } catch (e) {
      yield { event: "error", data: { message: (e as Error).message } };
    } finally {
      // 清理瞬态上下文
      this._run = { historyMsgCount: 0 };
    }
  }

  // ==================== 非流式执行 ====================

  async run(
    question: string,
    options?: AgentRunOptions,
  ): Promise<AgentResult> {
    const { threadId, resume, userId = 1, history } = options ?? {};

    this._run = { historyMsgCount: history?.length ?? 0 };

    const graph = await this.compile(userId, threadId);
    const config = threadId ? { configurable: { thread_id: threadId } } : {};

    const input = resume
      ? new Command({ resume } as any)
      : question
        ? { messages: [...(history ?? []), new HumanMessage(question)] }
        : null;

    const result = await graph.invoke(input, config);

    const state = await graph.getState(config);
    const interrupted = state.next.length > 0;

    const messages = (
      interrupted ? state.values.messages : (result as any).messages
    ) as BaseMessage[];
    const steps = ChatAgent.extractSteps(messages);
    const lastAnswer = [...messages]
      .reverse()
      .find((m) => m instanceof AIMessage && !(m as AIMessage).tool_calls?.length);

    this._run = { historyMsgCount: 0 };

    return {
      answer: (lastAnswer?.content as string) || "",
      steps,
      interrupted,
      threadId,
    };
  }

  async resume(
    threadId: string,
    options?: { resume?: string },
  ): Promise<AgentResult> {
    return this.run("", { threadId, resume: options?.resume });
  }

  async *resumeStream(
    threadId: string,
    options?: { resume?: string; userId?: number },
  ): AsyncGenerator<SSEEvent> {
    yield* this.runStream("", { threadId, resume: options?.resume, userId: options?.userId });
  }

  // ==================== 静态工具 ====================

  /** 从 LangGraph messages 中提取 AgentStep 列表（历史回放用） */
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
