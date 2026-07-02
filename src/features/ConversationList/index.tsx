"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Plus, MessageCircle, Trash2, Pencil, Search, Download } from "lucide-react";
import { useChatStore } from "@/store/chat/store";
import { useConversationList } from "./hooks/useConversationList";
import { ConvSkeletonList } from "./components/SkeletonList";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/format";
import { chatService } from "@/services/chatService";
import { authHeaders } from "@/services/client";

export function ConversationList() {
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const { loading, error, refetch, handleNew, handleSelect, handleDelete } = useConversationList();
  const [searchQuery, setSearchQuery] = useState("");
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (renamingId != null) renameInputRef.current?.focus();
  }, [renamingId]);

  const startRename = (id: number, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const commitRename = async () => {
    if (renamingId == null) return;
    const title = renameValue.trim();
    if (title) {
      useChatStore.getState().updateConversationTitle(renamingId, title);
      chatService.update(renamingId, { title }).catch(() => {});
    }
    setRenamingId(null);
  };

  const cancelRename = () => setRenamingId(null);

  const handleExport = useCallback(async (e: React.MouseEvent, id: number, title: string) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/conversations/${id}/export`, { headers: await authHeaders() });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("导出失败:", err);
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-2">
        <button
          onClick={handleNew}
          className="group w-full flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition-all hover:shadow-md hover:-translate-y-px"
          style={{ background: "var(--gradient-brand)" }}
        >
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
          新建对话
        </button>
      </div>

      {/* Search */}
      <div className="shrink-0 px-3 pb-2">
        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: "var(--bg-hover)" }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索对话..."
            className="flex-1 text-[12px] bg-transparent focus:outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[10px] shrink-0 px-1.5 py-0.5 rounded hover:bg-black/10"
              style={{ color: "var(--text-tertiary)" }}
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <div className="shrink-0 px-4 pt-1.5 pb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          最近对话
        </span>
        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}>
          {conversations.length}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && <ConvSkeletonList />}
        {error && <ErrorDisplay message={error} onRetry={refetch} />}

        {!loading && !error && conversations.length === 0 && (
          <EmptyState
            icon={<MessageCircle className="w-10 h-10" strokeWidth={1.5} />}
            title="暂无对话"
            description="点击上方按钮开始"
          />
        )}

        <div className="space-y-1">
          {filtered.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className={`group relative px-3 py-2.5 cursor-pointer rounded-lg transition-all ${isActive ? "shadow-sm" : "hover:shadow-sm"}`}
                style={{
                  background: isActive ? "var(--bg-active)" : "transparent",
                  border: isActive ? "1px solid var(--brand-200)" : "1px solid transparent",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isActive && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--brand-500)" }} />}
                      {renamingId === conv.id ? (
                        <input
                          ref={renameInputRef}
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[13px] font-medium px-1 py-0.5 rounded border w-full"
                          style={{
                            color: "var(--text-primary)",
                            background: "var(--bg-elevated)",
                            borderColor: "var(--brand-400)",
                          }}
                        />
                      ) : (
                        <h3
                          className={`text-[13px] truncate ${isActive ? "font-semibold" : "font-medium"}`}
                          style={{ color: isActive ? "var(--brand-700)" : "var(--text-primary)" }}
                        >
                          {conv.title}
                        </h3>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      <span className="inline-flex items-center gap-0.5">
                        <MessageCircle className="w-3 h-3" />
                        {conv.message_count}
                      </span>
                      <span>·</span>
                      <span>{formatDate(conv.updated_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={(e) => handleExport(e, conv.id, conv.title)}
                      className={`shrink-0 p-1 rounded-md transition-all ${isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      style={{ color: "var(--text-tertiary)" }}
                      title="导出为 Word"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => startRename(conv.id, conv.title, e)}
                      className={`shrink-0 p-1 rounded-md transition-all ${isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      style={{ color: "var(--text-tertiary)" }}
                      title="重命名"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      className={`shrink-0 p-1 rounded-md transition-all ${isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      style={{ color: "var(--text-tertiary)" }}
                      title="删除对话"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-between text-[11px]"
        style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)" }}
      >
        <span>v0.1 · LangGraph</span>
        <a href="#" className="hover:underline" style={{ color: "var(--brand-600)" }}>文档</a>
      </div>
    </div>
  );
}
