"use client";

import { FileText, ChevronRight, Clock, Layers } from "lucide-react";
import type { Document } from "@/types/models";
import { useDocumentList } from "../hooks/useDocumentList";
import { DocSkeletonList } from "./SkeletonList";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { formatSize, formatDate } from "@/lib/format";
import { getFileTypeStyle } from "@/lib/fileType";

export function DocumentList({
  onSelect,
  refreshKey,
}: {
  onSelect: (doc: Document) => void;
  refreshKey: number;
}) {
  const { docs, loading, error, refetch } = useDocumentList(refreshKey);

  if (loading) return <DocSkeletonList />;
  if (error) return <ErrorDisplay message={error} onRetry={refetch} />;

  if (docs.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "var(--gradient-brand-soft)",
          }}
        >
          <FileText className="w-7 h-7" style={{ color: "var(--brand-500)" }} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            知识库为空
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            切换到「上传」添加你的第一个文档
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {docs.map((doc) => {
        const typeStyle = getFileTypeStyle(doc.file_type);
        return (
          <button
            key={doc.id}
            onClick={() => onSelect(doc)}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--bg-panel)";
              e.currentTarget.style.boxShadow = "var(--shadow-sm)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {/* 文件类型图标 */}
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: typeStyle.bg, color: typeStyle.color }}
            >
              {typeStyle.icon}
            </div>

            {/* 主信息 */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium truncate leading-snug"
                style={{ color: "var(--text-primary)" }}
              >
                {doc.title}
              </p>
              <div
                className="flex items-center gap-2 mt-1 text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
              >
                <span
                  className="px-1.5 py-0.5 rounded font-medium"
                  style={{
                    color: typeStyle.color,
                    background: typeStyle.bg,
                  }}
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

            {/* 状态 / 箭头 */}
            {doc.status === "processing" ? (
              <span
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{ color: "#b45309", background: "#fffbeb" }}
              >
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#f59e0b" }} />
                处理中
              </span>
            ) : (
              <ChevronRight
                className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                style={{ color: "var(--text-quaternary)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
