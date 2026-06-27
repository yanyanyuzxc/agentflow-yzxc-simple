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
        console.warn(`[ChatAgent] ${label} 失败 (尝试 ${attempt + 1}/${maxRetries + 1})，${delay}ms 后重试:`, (e as Error).message);
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

  console.warn(`[ChatAgent] 上下文 ${tokens} tokens > ${COMPRESS_THRESHOLD}，压缩 ${toCompress.length} 条旧消息`);

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
    console.warn("[ChatAgent] 上下文压缩失败，保持原消息:", (e as Error).message);
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
        console.warn(`[ChatAgent] agent 节点进入: round=${toolCallRounds}, msgs=${state.messages.length}`);

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
          const response = await withRetry(() => llm.invoke([systemMsg, ...compressed]), "llm");
          return { messages: [response] };
        }

        // 正常流程：带工具推理
        const activeTools = disabledTools.length
          ? tools.filter((t) => !disabledTools.includes(t.name))
          : tools;
        const llmWithTools = llm.bindTools(activeTools);
        const prompt = self.config.systemPrompt ?? await buildSystemPrompt(_userId);
        const systemMsg = new SystemMessage(prompt);

        const compressed = await compressMessages(state.messages, llm);

        console.warn(`[ChatAgent] agent 节点: 开始 invoke, msgs=${compressed.length}`);
        let response: AIMessage;
        try {
          response = await withRetry(
            () => llmWithTools.invoke([systemMsg, ...compressed]),
            "llm",
          );
          console.warn(`[ChatAgent] agent 节点: invoke 成功`);
        } catch (e) {
          console.error(`[ChatAgent] agent 节点: invoke 失败:`, (e as Error).message);
          throw e;
        }

        // DeepSeek XML 工具调用解析
        const responseContent = (response.content as string) || "";
        const hasParsedTools = !!(response as AIMessage).tool_calls?.length;
        console.warn(`[ChatAgent] agent 节点返回: tool_calls=${(response as AIMessage).tool_calls?.length || 0}, content_len=${responseContent.length}, hasXML=${hasToolCallMarkup(responseContent)}`);
        if (hasToolCallMarkup(responseContent)) {
          const xmlParsed = parseXmlToolCalls(responseContent);
          if (xmlParsed.length > 0) {
            console.warn(`[ChatAgent] 从 XML 解析到 ${xmlParsed.length} 个 tool_calls，` +
              `原有 tool_calls=${(response as AIMessage).tool_calls?.length || 0}`);
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

        // 第一轮拦截：LLM 没调工具就直接回答 → escalating retry
        if (toolCallRounds === 0) {
          const userMsg = state.messages.find((m) => m instanceof HumanMessage);
          const question = ((userMsg?.content as string) || "").trim();
          const trivialPatterns = /^(你好|hi|hello|hey|谢谢|再见|bye|好的|ok|嗯|哦|哈|啊|额|\?$|！$)/i;
          const needsResearch = question.length > 6 && !trivialPatterns.test(question);

          if (needsResearch) {
            console.warn("[ChatAgent] 第一轮未调工具，启动 escalating retry:", question.slice(0, 50));
            const forceMessages = [
              "⚠️ 你必须先调用 web_search 搜索最新信息，然后再回答。不要跳过搜索步骤直接编造答案。",
              "⚠️⚠️ 你再次跳过了搜索。这是严重错误。必须调用 web_search 或 search_docs 获取真实信息。不搜索直接回答 = 编造。",
            ];

            for (let attempt = 0; attempt < forceMessages.length; attempt++) {
              if ((response as AIMessage).tool_calls?.length) break;
              console.warn("[ChatAgent] retry %d/2: LLM 仍未调工具，升级警告", attempt + 1);
              const forceMsg = new SystemMessage(forceMessages[attempt]);
              response = await withRetry(
                () => llmWithTools.invoke([systemMsg, forceMsg, ...compressed]),
                "llm",
              );
            }
          }
        }

        return { messages: [response] };
      })
      .addNode("tools", async (state: typeof MessagesAnnotation.State) => {
        const last = state.messages[state.messages.length - 1] as AIMessage;
        let toolCalls = last.tool_calls ?? [];

        // 兜底：如果 agent 节点没解析成功，tools 节点再试 XML 解析
        if (toolCalls.length === 0) {
          const lastContent = (last.content as string) || "";
          if (hasToolCallMarkup(lastContent)) {
            const parsed = parseXmlToolCalls(lastContent);
            if (parsed.length > 0) {
              console.warn(`[ChatAgent] tools 节点兜底解析到 ${parsed.length} 个 tool_calls`);
              toolCalls = parsed;
            }
          }
        }

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

  // ==================== 流式执行 ====================

  async *runStream(
    question: string,
    options?: AgentRunOptions,
  ): AsyncGenerator<SSEEvent> {
    const { threadId, resume, userId = 1, history, images, disabledTools } = options ?? {};

    // 设置瞬态运行上下文（agent 节点闭包中读取）
    this._run = {
      historyMsgCount: history?.length ?? 0,
      disabledTools,
    };

    // DB 加载了历史 → 清除旧检查点
    const hasHistory = history && history.length > 0;
    if (hasHistory && threadId) {
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
    const sid = () => `${runId}_${++stepCounter}`;

    const stream = await graph.stream(input, {
      ...config,
      streamMode: "messages",
      recursionLimit: 25,
    });

    try {
      for await (const rawChunk of stream) {
        const msg = Array.isArray(rawChunk) ? rawChunk[0] : rawChunk;

        const isAIChunk = AIMessageChunk.isInstance(msg);
        const isAIMsg = !isAIChunk && AIMessage.isInstance(msg);
        const isToolMsg = msg instanceof ToolMessage;

        if (isToolMsg) {
          const tm = msg as ToolMessage;
          const os = sid();
          yield { event: "step_start", data: { step_id: os, type: "observation", label: `${tm.name ?? "tool"} 返回` } } as SSEEvent;
          yield { event: "observation", data: { step_id: os, name: tm.name ?? "tool", result: (tm.content as string).slice(0, 600) } } as SSEEvent;
          yield { event: "step_end", data: { step_id: os } } as SSEEvent;
          continue;
        }

        if (isAIChunk || isAIMsg) {
          const ai = msg as AIMessage;
          const toolCalls = isAIChunk
            ? (msg as AIMessageChunk).tool_call_chunks
            : ai.tool_calls;

          // 工具调用 — 只用完整 AIMessage，按工具名分组
          if (!isAIChunk && toolCalls?.length) {
            const tcGroups = new Map<string, { args: Record<string, unknown>[] }>();
            for (const tc of toolCalls) {
              const tcName = (tc as any).name;
              const tcArgs = (tc as any).args ?? "{}";
              if (!tcName) continue;
              if (!tcGroups.has(tcName)) tcGroups.set(tcName, { args: [] });
              let args: Record<string, unknown> = {};
              try { args = typeof tcArgs === "string" ? JSON.parse(tcArgs) : tcArgs; } catch { /* keep {} */ }
              tcGroups.get(tcName)!.args.push(args);
            }
            for (const [name, group] of tcGroups) {
              const tcs = sid();
              const suffix = group.args.length > 1 ? ` (${group.args.length}次)` : "";
              yield { event: "step_start", data: { step_id: tcs, type: "tool_call", label: `调用 ${name}${suffix}` } } as SSEEvent;
              const displayArgs = group.args.length === 1 ? group.args[0] : group.args;
              yield { event: "tool_call", data: { step_id: tcs, name, args: displayArgs } } as SSEEvent;
              yield { event: "step_end", data: { step_id: tcs } } as SSEEvent;
            }
          }

          // 文字输出 → 拦截 XML 标记
          const content = (ai.content as string) || "";
          const blocked = hasToolCallMarkup(content)
            || (isAIChunk && !!(msg as AIMessageChunk).tool_call_chunks?.length)
            || (!isAIChunk && !!(ai as AIMessage).tool_calls?.length);
          if (content && !blocked) {
            yield { event: "message_chunk", data: { content } };
          } else if (content && blocked) {
            const reason = hasToolCallMarkup(content) ? "XML" :
              (isAIChunk && (msg as AIMessageChunk).tool_call_chunks?.length) ? "chunk_tc" : "msg_tc";
            console.warn(`[ChatAgent] 拦截 ${reason} content:`, content.slice(0, 120));
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
      yield { event: "done", data: {} };
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
