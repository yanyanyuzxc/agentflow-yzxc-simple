"use client";

import { Trash2, Layers, Clock } from "lucide-react";
import { useDocumentDetail } from "../hooks/useDocumentDetail";
import { formatSize, formatDate } from "@/lib/format";
import { getFileTypeStyle } from "@/lib/fileType";
import type { Document } from "@/types/models";

export function DocumentDetail({
  doc,
  onBack,
  onDeleted,
}: {
  doc: Document;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const { detail, loading, error, deleting, showContent, setShowContent, handleDelete } = useDocumentDetail(doc, onDeleted);
  const typeStyle = getFileTypeStyle(doc.file_type);

  return (
    <div className="flex flex-col">
      {/* 标题行 */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: typeStyle.bg, color: typeStyle.color }}
        >
          {typeStyle.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
            {doc.title}
          </h2>
          <div className="flex items-center gap-3 mt-1.5 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            <span
              className="px-1.5 py-0.5 rounded font-medium"
              style={{ color: typeStyle.color, background: typeStyle.bg }}
            >
              {doc.file_type?.toUpperCase() ?? "?"}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {doc.chunk_count} 片段
            </span>
            {doc.file_size != null && doc.file_size > 0 && (
              <span>{formatSize(doc.file_size)}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(doc.created_at)}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200 disabled:opacity-40"
          style={{ color: "var(--text-tertiary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-hover)";
            e.currentTarget.style.color = "#dc2626";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? "删除中..." : "删除"}
        </button>
      </div>

      {/* 内容 */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="w-6 h-6 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "var(--border-default)", borderTopColor: "var(--brand-500)" }}
            />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        ) : detail ? (
          <div>
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                共 {detail.chunkCount} 个文本片段
              </span>
              <button
                onClick={() => setShowContent(!showContent)}
                className="text-[12px] font-medium transition-colors"
                style={{ color: "var(--brand-500)" }}
              >
                {showContent ? "收起内容" : "查看原文"}
              </button>
            </div>
            {showContent && (
              <div className="p-4">
                <pre
                  className="text-[13px] leading-relaxed whitespace-pre-wrap break-words rounded-lg p-4 max-h-80 overflow-y-auto"
                  style={{
                    background: "var(--bg-app)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {detail.content}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
