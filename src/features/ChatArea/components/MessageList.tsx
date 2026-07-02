import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Monitor, Bot, Sparkles, Trash2, User, Pencil } from "lucide-react";
import type { Message } from "@/types/models";
import type { StreamingAgentStep } from "@/types/agent";
import { formatTime } from "@/lib/format";
import { useChatStore } from "@/store/chat/store";
import { getFileTypeStyle } from "@/lib/fileType";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StepsPanel } from "./StepsPanel";
import { buildPairs } from "../utils";

// 延迟加载 Markdown（~100KB react-markdown + highlight.js），首屏不阻塞
const Markdown = dynamic(() => import("./Markdown").then((m) => ({ default: m.Markdown })), {
  loading: () => <div className="h-4 w-32 rounded animate-pulse" style={{ background: "var(--bg-hover)" }} />,
});

/** 安全解析消息携带的 agent_steps JSON */
function parseAgentSteps(raw: string | undefined): StreamingAgentStep[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface MessageListProps {
  messages: Message[];
  agentSteps?: StreamingAgentStep[];
  isStreaming?: boolean;
  totalDurationMs?: number | null;
  onDeletePair?: (humanMsg: Message, aiMsg: Message) => void;
  onRegenerate?: (humanMsg: Message, aiMsg: Message) => void;
  onRewind?: (humanMsg: Message, aiMsg: Message) => void;
}

function MessageTime({ dateStr }: { dateStr: string }) {
  const time = formatTime(dateStr);
  if (!time) return null;
  return (
    <div className="flex justify-center my-3">
      <span
        className="text-[11px] px-2 py-0.5 rounded-full"
        style={{ color: "var(--text-tertiary)", background: "var(--bg-hover)" }}
      >
        {time}
      </span>
    </div>
  );
}

export function MessageList({
  messages,
  agentSteps,
  isStreaming,
  totalDurationMs,
  onDeletePair,
  onRegenerate,
  onRewind,
}: MessageListProps) {
  const noSteps = !agentSteps || agentSteps.length === 0;
  const [deleteTarget, setDeleteTarget] = useState<{ human: Message; ai: Message } | null>(null);
  const pairs = buildPairs(messages);

  const handleDelete = useCallback(() => {
    if (deleteTarget && onDeletePair) {
      onDeletePair(deleteTarget.human, deleteTarget.ai);
    }
    setDeleteTarget(null);
  }, [deleteTarget, onDeletePair]);

  if (messages.length === 0 && noSteps && !isStreaming) {
    return (
      <EmptyState
        icon={
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Monitor className="w-8 h-8 text-white" />
          </div>
        }
        title="开始新的对话"
        description="输入问题开始与 AI Agent 交流"
      />
    );
  }

  const lastMsg = messages[messages.length - 1];
  const stepsAllDone = (agentSteps ?? []).filter((s) => s.type !== "answer").every((s) => s.status === "done" || s.status === "error");
  const showThinking = isStreaming && lastMsg?.role === "user" && stepsAllDone;

  // 根据当前步骤推断打字指示器文案
  const thinkingLabel = useMemo(() => {
    if (!isStreaming) return "思考中";
    const lastStep = (agentSteps ?? []).slice(-1)[0];
    if (!lastStep) return "思考中";
    if (lastStep.type === "tool_call" && lastStep.name === "web_search") return "正在联网搜索…";
    if (lastStep.type === "tool_call" && lastStep.name === "search_docs") return "搜索知识库中…";
    if (lastStep.type === "tool_call" && lastStep.name === "crawl_page") return "正在抓取页面…";
    if (lastStep.type === "tool_call" && lastStep.name === "speak") return "正在委派 Agent…";
    if (lastStep.type === "observation") return "正在处理结果…";
    if (lastStep.type === "thought") return "思考中…";
    return "AI 思考中…";
  }, [isStreaming, agentSteps]);

  return (
    <div className="px-6 py-6">
      <div className="max-w-4xl mx-auto space-y-5">
        {messages.length > 0 &&
          messages.map((msg, i) => {
            const isUser = msg.role === "user";
            const prev = messages[i - 1];
            const showTime =
              !prev ||
              new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60 * 1000;

            const isLastUser = isUser && i === messages.length - 1 && lastMsg?.role === "user";
            const isLastAssistant = !isUser && i === messages.length - 1 && msg.role === "assistant";

            // 确定当前消息对的步骤数据：
            // - 最后一条（正在流式）→ 用 store 的 agentSteps
            // - 历史消息 → 用 message.agent_steps（DB 持久化的 JSON）
            let pairSteps: StreamingAgentStep[] = [];
            if (isLastAssistant || isLastUser) {
              pairSteps = (agentSteps ?? []).filter((s) => s.type !== "answer");
            } else if (!isUser) {
              pairSteps = parseAgentSteps(msg.agent_steps).filter((s) => s.type !== "answer");
            }

            // 当前轮的回答还没产出 → 不在用户气泡旁边显示步骤
            const assistantHasContent = isLastUser ? false : lastMsg?.role === "assistant" && !!lastMsg.content;

            return (
              <div key={i}>
                {showTime && <MessageTime dateStr={msg.created_at} />}

                {/* 步骤面板 — 每个消息对使用各自的 agent_steps */}
                {pairSteps.length > 0 && (
                  <div className="flex gap-2.5 mb-3 message-enter">
                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
                      <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <StepsPanel
                        steps={pairSteps}
                        autoCollapse={!isStreaming || i < messages.length - 1}
                        totalDurationMs={totalDurationMs}
                      />
                    </div>
                  </div>
                )}

                {/* 消息气泡 */}
                <div className={`group flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div
                    className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold shadow-sm ${
                      isUser ? "bg-gradient-to-br from-blue-500 to-blue-600" : "bg-gradient-to-br from-purple-500 to-pink-500"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" strokeWidth={2.5} /> : <Bot className="w-4 h-4" strokeWidth={2.5} />}
                  </div>
                  <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
                    {/* 用户图片缩略图 */}
                    {isUser && msg.images && msg.images.length > 0 && (
                      <div className="flex gap-1.5 mb-1.5 flex-wrap justify-end">
                        {msg.images.map((img, j) => (
                          <a
                            key={j}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-20 h-20 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            style={{ border: "1px solid var(--border-subtle)" }}
                          >
                            <img
                              src={img.url}
                              alt={img.name}
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                    {/* 用户文档卡片 */}
                    {isUser && msg.documents && msg.documents.length > 0 && (
                      <div className="flex gap-1.5 mb-1.5 flex-wrap justify-end">
                        {msg.documents.map((doc, j) => {
                          const style = getFileTypeStyle(doc.type);
                          return (
                            <div
                              key={j}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 shadow-sm"
                              style={{
                                background: style.bg,
                                border: `1px solid ${style.color}20`,
                              }}
                              title={`${doc.name} (${doc.tokens} tokens${doc.truncated ? ", 已截断" : ""})`}
                            >
                              <span className="text-base">{style.icon}</span>
                              <div className="min-w-0">
                                <p
                                  className="text-[11px] font-medium truncate max-w-[140px]"
                                  style={{ color: style.color }}
                                >
                                  {doc.name}
                                </p>
                                <p className="text-[10px]" style={{ color: `${style.color}99` }}>
                                  {doc.type.toUpperCase()} · {(doc.size / 1024).toFixed(0)}KB
                                  {doc.truncated && " · 已截断"}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {msg.content && (
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                          isUser ? "bg-blue-600 text-white rounded-tr-sm" : "rounded-tl-sm"
                        }`}
                        style={
                          isUser
                            ? undefined
                            : { background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }
                        }
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        ) : (
                          <Markdown content={msg.content} />
                        )}
                        {/* Token 用量 */}
                        {!isUser && msg.tokens != null && msg.tokens > 0 && (
                          <div className="mt-1.5 pt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)" }}>
                            <span className="opacity-70">{msg.tokens >= 1000 ? `${(msg.tokens / 1000).toFixed(1)}k` : msg.tokens} tokens</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 用户消息 — 编辑按钮 */}
                    {isUser && msg.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1 justify-end">
                        <button
                          className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors hover:bg-white/10"
                          style={{ color: "var(--text-tertiary)" }}
                          onClick={() => useChatStore.getState().setDraft(msg.content)}
                          title="编辑后重新发送"
                        >
                          <Pencil className="w-3 h-3" />
                          编辑
                        </button>
                      </div>
                    )}

                    {/* 操作按钮 */}
                    {!isUser && pairs.has(i) && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex items-center gap-1">
                        {onRegenerate && i === messages.length - 1 && (
                          <button
                            className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors hover:bg-white/10"
                            style={{ color: "var(--text-tertiary)" }}
                            onClick={() => onRegenerate(messages[pairs.get(i)!], msg)}
                            title="删除这对消息并重新生成"
                          >
                            <Sparkles className="w-3 h-3" />
                            重新生成
                          </button>
                        )}
                        {onRewind && (
                          <button
                            className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors hover:bg-white/10"
                            style={{ color: "var(--text-tertiary)" }}
                            onClick={() => onRewind(messages[pairs.get(i)!], msg)}
                            title="回退到此处，删除之后所有消息"
                          >
                            回退到此
                          </button>
                        )}
                        {onDeletePair && (
                          <button
                            className="px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors hover:bg-white/10"
                            style={{ color: "var(--text-tertiary)" }}
                            onClick={() => setDeleteTarget({ human: messages[pairs.get(i)!], ai: msg })}
                            title="删除此问答对"
                          >
                            <Trash2 className="w-3 h-3" />
                            删除
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {/* 思考中占位 */}
        {showThinking && (
          <div className="flex gap-2.5 message-enter">
            <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
              <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start max-w-[85%]">
              <div
                className="rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>{thinkingLabel}</span>
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认弹窗 */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="删除此问答对？"
          description="将同时删除这条用户消息和 AI 回复，之后可以从这一轮重新开始对话。"
          confirmLabel="删除"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </div>
    </div>
  );
}
