import {
  StateGraph,
  END,
  MessagesAnnotation,
  Command,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
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
import type { AgentResult } from "@/types/agent";
import { BaseAgent } from "./base";
import type { SSEEvent, AgentRunOptions } from "./types";
import { buildSystemPrompt } from "./prompt";


/**
 * ChatAgent — 标准 ReAct 对话 Agent。
 *
 * 图结构：__start__ → agent ⇄ tools → END
 * - agent 节点：LLM + 工具绑定
 * - tools 节点：ToolNode 执行
 * - 条件边：有 tool_calls → tools，否则 → END
 * - interruptAfter=["tools"]：每次工具调用后暂停
 *
 * @example
 * const agent = new ChatAgent({ model: "deepseek-ai/DeepSeek-V4-Flash" });
 * for await (const ev of agent.runStream("你好", { userId: 1 })) {
 *   // 发送 SSE 到客户端
 * }
 */
/** 最多允许的工具调用轮数，超过后强制 LLM 直接回答 */
const MAX_TOOL_ROUNDS = 8;

export class ChatAgent extends BaseAgent {
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

    const toolNode = new ToolNode(tools);

    return new StateGraph(MessagesAnnotation)
      .addNode("agent", async (state: typeof MessagesAnnotation.State) => {
        // 统计已完成的工具调用轮数（AIMessage 中带 tool_calls 的次数）
        const toolCallRounds = state.messages.filter(
          (m) => AIMessage.isInstance(m) && (m as AIMessage).tool_calls?.length,
        ).length;

        // 超过上限 → 强制不带工具直接回答，防止无限搜索循环
        if (toolCallRounds >= MAX_TOOL_ROUNDS) {
          const prompt = await buildSystemPrompt(_userId);
          const forceStop = [
            prompt,
            "## ⚠️ 强制终止搜索",
            `你已经进行了 ${toolCallRounds} 轮工具调用（上限 ${MAX_TOOL_ROUNDS} 轮）。`,
            "现在必须给出最终答案，绝对不能再调用任何工具。",
            "如果搜索结果中确实没有找到用户需要的信息，请诚实告知用户，并说明你尝试了哪些搜索关键词。",
            "不要编造信息来填补空白。",
          ].join("\n\n");
          const systemMsg = new SystemMessage(forceStop);
          const response = await llm.invoke([systemMsg, ...state.messages]);
          return { messages: [response] };
        }

        // 正常流程：带工具推理
        const llmWithTools = llm.bindTools(tools);
        const prompt = await buildSystemPrompt(_userId);
        const systemMsg = new SystemMessage(prompt);

        let response = await llmWithTools.invoke([systemMsg, ...state.messages]);

        // 第一轮拦截：LLM 没调工具就直接回答 → escalating retry
        if (toolCallRounds === 0) {
          const userMsg = state.messages.find((m) => m instanceof HumanMessage);
          const question = ((userMsg?.content as string) || "").trim();
          // 判断是否需要搜索：长度 > 6 且非纯问候/计算
          const trivialPatterns = /^(你好|hi|hello|hey|谢谢|再见|bye|好的|ok|嗯|哦|哈|啊|额|\?$|！$)/i;
          const needsResearch = question.length > 6 && !trivialPatterns.test(question);

          if (needsResearch) {
            console.warn("[ChatAgent] 第一轮未调工具，启动 escalating retry:", question.slice(0, 50));
            const forceMessages = [
              "⚠️ 你必须先调用 web_search 搜索最新信息，然后再回答。不要跳过搜索步骤直接编造答案。",
              "⚠️⚠️ 你再次跳过了搜索。这是严重错误。必须调用 web_search 或 search_docs 获取真实信息。不搜索直接回答 = 编造。",
            ];

            for (let attempt = 0; attempt < forceMessages.length; attempt++) {
              if ((response as AIMessage).tool_calls?.length) break; // 已调工具，放行
              console.warn("[ChatAgent] retry %d/2: LLM 仍未调工具，升级警告", attempt + 1);
              const forceMsg = new SystemMessage(forceMessages[attempt]);
              response = await llmWithTools.invoke([systemMsg, forceMsg, ...state.messages]);
            }
          }
        }

        return { messages: [response] };
      })
      .addNode("tools", toolNode)
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

  /**
   * 流式执行 Agent，通过 async generator 实时产出 SSE 事件。
   *
   * 使用 streamMode: "messages" 实现真实的逐 token 流式输出，
   * 替代之前的 setTimeout 假分块方案。
   *
   * @param question  用户问题（resume 模式传空字符串）
   * @param options   可选：threadId, resume, userId
   */
  async *runStream(
    question: string,
    options?: AgentRunOptions,
  ): AsyncGenerator<SSEEvent> {
    const { threadId, resume, userId = 1, history } = options ?? {};

    // DB 加载了历史 → 清除旧检查点，避免重复消息
    const hasHistory = history && history.length > 0;
    if (hasHistory && threadId) {
      await this.checkpointManager.clearThread(threadId);
    }

    const graph = await this.compile(userId, threadId);
    const config = threadId ? { configurable: { thread_id: threadId } } : {};

    const input = resume
      ? new Command({ resume } as any)
      : question
        ? { messages: [...(history ?? []), new HumanMessage(question)] }
        : null;

    const runId = `${Date.now().toString(36)}`;
    let stepCounter = 0;
    const sid = () => `${runId}_${++stepCounter}`;

    // 研究 Agent：所有文字 → message_chunk（气泡），工具调用 → step（轨迹面板）
    const stream = await graph.stream(input, {
      ...config,
      streamMode: "messages",
      recursionLimit: 25, // 安全网：25 步 ≈ 12 轮工具调用后强制终止
    });

    try {
      for await (const rawChunk of stream) {
        const msg = Array.isArray(rawChunk) ? rawChunk[0] : rawChunk;

        const isAIChunk = AIMessageChunk.isInstance(msg);
        const isAIMsg = !isAIChunk && AIMessage.isInstance(msg);

        if (isAIChunk || isAIMsg) {
          const ai = msg as AIMessage;
          const toolCalls = isAIChunk
            ? (msg as AIMessageChunk).tool_call_chunks
            : ai.tool_calls;

          // 工具调用 → AgentSteps（轨迹面板）
          if (toolCalls?.length) {
            for (const tc of toolCalls) {
              const tcName = (tc as any).name;
              const tcArgs = (tc as any).args ?? "{}";
              if (tcName) {
                const tcs = sid();
                yield { event: "step_start", data: { step_id: tcs, type: "tool_call", label: `调用 ${tcName}` } };
                let args: Record<string, unknown> = {};
                try { args = typeof tcArgs === "string" ? JSON.parse(tcArgs) : tcArgs; } catch { /* keep {} */ }
                yield { event: "tool_call", data: { step_id: tcs, name: tcName, args } };
                yield { event: "step_end", data: { step_id: tcs } };
              }
            }
          }

          // 所有文字 → 直接流式输出到 MessageList
          const content = ai.content as string;
          if (content) {
            yield { event: "message_chunk", data: { content } };
          }
        } else if (msg instanceof ToolMessage) {
          // 工具结果 → AgentSteps
          const tm = msg as ToolMessage;
          const os = sid();
          const toolName = tm.name ?? "tool";
          yield { event: "step_start", data: { step_id: os, type: "observation", label: `${toolName} 返回` } };
          yield { event: "observation", data: { step_id: os, name: toolName, result: (tm.content as string).slice(0, 300) } };
          yield { event: "step_end", data: { step_id: os } };
        }
      }

      // 检查中断状态（仅当有 checkpointer 时）
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
    }
  }

  // ==================== 非流式执行 ====================

  /**
   * 非流式执行 Agent，返回完整结果。
   */
  async run(
    question: string,
    options?: AgentRunOptions,
  ): Promise<AgentResult> {
    const { threadId, resume, userId = 1, history } = options ?? {};

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
    const steps = BaseAgent.extractSteps(messages);
    const lastAnswer = [...messages]
      .reverse()
      .find(
        (m) => m instanceof AIMessage && !(m as AIMessage).tool_calls?.length,
      );

    return {
      answer: (lastAnswer?.content as string) || "",
      steps,
      interrupted,
      threadId,
    };
  }

  /**
   * 从中断处恢复执行（非流式，返回完整结果）。
   */
  async resume(
    threadId: string,
    options?: { resume?: string },
  ): Promise<AgentResult> {
    return this.run("", { threadId, resume: options?.resume });
  }

  /**
   * 从中断处恢复执行（流式，产出 SSE 事件）。
   */
  async *resumeStream(
    threadId: string,
    options?: { resume?: string; userId?: number },
  ): AsyncGenerator<SSEEvent> {
    yield* this.runStream("", { threadId, resume: options?.resume, userId: options?.userId });
  }
}
