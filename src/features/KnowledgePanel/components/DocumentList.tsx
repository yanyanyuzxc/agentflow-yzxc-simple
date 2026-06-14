"use client";

import { File, ChevronRight } from "lucide-react";
import type { Document } from "@/types/models";
import { useDocumentList } from "../hooks/useDocumentList";
import { DocSkeletonList } from "./SkeletonList";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatSize, formatDateSimple } from "@/lib/format";
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
      <EmptyState
        icon={<File className="w-10 h-10" strokeWidth={1.5} />}
        title="知识库为空"
        description="切换到「上传」添加文档"
      />
    );
  }

  return (
    <div className="px-2 py-1 space-y-1">
      {docs.map((doc) => {
        const typeStyle = getFileTypeStyle(doc.file_type);
        return (
          <div
            key={doc.id}
            onClick={() => onSelect(doc)}
            className="group flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-lg transition-all hover:shadow-sm"
            style={{ background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <div
              className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-base"
              style={{ background: typeStyle.bg, color: typeStyle.color }}
            >
              {typeStyle.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                {doc.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                <span>{doc.chunk_count} 片段</span>
                {doc.file_size != null && doc.file_size > 0 && (
                  <><span>·</span><span>{formatSize(doc.file_size)}</span></>
                )}
                <span>·</span>
                <span>{formatDateSimple(doc.created_at)}</span>
              </div>
            </div>
            {doc.status === "processing" ? (
              <span className="shrink-0 text-[11px] flex items-center gap-1 mt-1.5" style={{ color: "#d97706" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#d97706" }} />
                处理中
              </span>
            ) : (
              <ChevronRight
                className="w-4 h-4 mt-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
