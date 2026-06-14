"use client";

import { useDocumentDetail } from "../hooks/useDocumentDetail";
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
        <h3 className="text-xs font-medium text-gray-700 truncate flex-1">{doc.title}</h3>
        <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
          {deleting ? "删除中..." : "删除"}
        </button>
      </div>

      {/* Meta */}
      <div className="shrink-0 px-3 py-2 border-b border-gray-50">
        <div className="flex items-center gap-3 text-[11px] text-gray-400">
          <span>📄 {doc.file_type?.toUpperCase() ?? "未知"}</span>
          {doc.file_size != null && doc.file_size > 0 && (
            <span>
              {doc.file_size > 1024 * 1024 ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB` : `${(doc.file_size / 1024).toFixed(1)} KB`}
            </span>
          )}
          <span>{doc.chunk_count} 片段</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center"><p className="text-xs text-red-500">{error}</p></div>
        ) : detail ? (
          <div className="p-3">
            <button onClick={() => setShowContent(!showContent)} className="text-xs text-blue-500 hover:underline mb-2">
              {showContent ? "收起内容" : "查看原文"}
            </button>
            {showContent && (
              <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 mb-3 max-h-60 overflow-y-auto">
                {detail.content}
              </pre>
            )}
            <div className="text-[11px] text-gray-400">共 {detail.chunkCount} 个文本片段</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
