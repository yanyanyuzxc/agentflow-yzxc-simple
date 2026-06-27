"use client";

import { useRef } from "react";
import { Check, Upload, CircleAlert } from "lucide-react";
import { useFileUpload } from "../hooks/useFileUpload";
import { UPLOAD_ACCEPT_TYPES } from "@/lib/fileType";

export function FileUpload({ onComplete }: { onComplete: () => void }) {
  const { uploadState, errorMsg, dragOver, setDragOver, result, handleDrop, handleChange } = useFileUpload(onComplete);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300"
        style={{
          borderColor: dragOver ? "var(--brand-400)" : "var(--border-default)",
          background: dragOver
            ? "var(--gradient-brand-soft)"
            : "var(--bg-panel)",
          boxShadow: dragOver ? "0 0 0 4px rgba(99,102,241,0.06)" : "var(--shadow-xs)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={UPLOAD_ACCEPT_TYPES}
          onChange={handleChange}
          className="hidden"
        />

        {uploadState === "uploading" ? (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "var(--brand-100)", borderTopColor: "var(--brand-500)" }}
            />
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              正在处理文件...
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              分片与向量化中
            </p>
          </div>
        ) : uploadState === "success" && result ? (
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--brand-50)", color: "var(--brand-600)" }}
            >
              <Check className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {result.title}
            </p>
            <p
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ color: "var(--brand-600)", background: "var(--brand-50)" }}
            >
              已分片 {result.totalChunks} 个片段
            </p>
          </div>
        ) : (
          <>
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all duration-300"
              style={{
                background: dragOver ? "var(--gradient-brand)" : "var(--gradient-brand-soft)",
                color: dragOver ? "#fff" : "var(--brand-500)",
                transform: dragOver ? "scale(1.06)" : "scale(1)",
                boxShadow: dragOver ? "0 8px 24px rgba(99,102,241,0.2)" : "none",
              }}
            >
              <Upload className="w-6 h-6" strokeWidth={dragOver ? 2.5 : 1.5} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {dragOver ? "松开放下" : "拖拽文件到此处上传"}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
              或点击选择文件 · 支持 .txt / .md / .pdf · 单文件 ≤ 5MB
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {uploadState === "error" && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2.5"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-default)" }}
        >
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "var(--brand-500)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {errorMsg}
          </p>
        </div>
      )}
    </div>
  );
}
