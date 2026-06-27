import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Monitor, Bot, Sparkles, Trash2 } from "lucide-react";
import type { Message } from "@/types/models";
import type { StreamingAgentStep } from "@/types/agent";
import { formatTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StepsPanel } from "./StepsPanel";
import { buildPairs } from "../utils";

// 延迟加载 Markdown（~100KB react-markdown + highlight.js），首屏不阻塞
const Markdown = dynamic(() => import("./Markdown").then((m) => ({ default: m.Markdown })), {
  loading: () => <div className="h-4 w-32 rounded animate-pulse" style={{ background: "var(--bg-hover)" }} />,
});

interface MessageListProps {
  messages: Message[];
  agentSteps?: StreamingAgentStep[];
  isStreaming?: boolean;
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
  const renderSteps = agentSteps?.filter((s) => s.type !== "answer") ?? [];
  const assistantHasContent = lastMsg?.role === "assistant" && !!lastMsg.content;
  const stepsAllDone = renderSteps.every((s) => s.status === "done" || s.status === "error");
  const showThinking = isStreaming && lastMsg?.role === "user" && stepsAllDone;

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

            const isLastUser = isUser && i === messages.length - 1 && !assistantHasContent;
            const isLastAssistant = !isUser && i === messages.length - 1 && msg.role === "assistant";

            return (
              <div key={i}>
                {showTime && <MessageTime dateStr={msg.created_at} />}

                {/* 步骤面板 */}
                {(isLastUser || isLastAssistant) && renderSteps.length > 0 && (
                  <div className="flex gap-2.5 mb-3 message-enter">
                    <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 shadow-sm">
                      <Bot className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <StepsPanel steps={renderSteps} autoCollapse={isLastAssistant && !isStreaming} />
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
                    {isUser ? "U" : <Bot className="w-4 h-4" strokeWidth={2.5} />}
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
                  <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>思考中</span>
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
