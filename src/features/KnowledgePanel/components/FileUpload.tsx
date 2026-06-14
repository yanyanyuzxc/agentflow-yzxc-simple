"use client";

import { useRef } from "react";
import { Check, Upload, CircleAlert, Info } from "lucide-react";
import { useFileUpload } from "../hooks/useFileUpload";
import { UPLOAD_ACCEPT_TYPES } from "@/lib/fileType";

export function FileUpload({ onComplete }: { onComplete: () => void }) {
  const { uploadState, errorMsg, dragOver, setDragOver, result, handleDrop, handleChange } = useFileUpload(onComplete);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-4 space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? "var(--brand-500)" : "var(--border-default)",
          background: dragOver ? "var(--gradient-brand-soft)" : "var(--bg-app)",
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
          <div className="flex flex-col items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-full border-[3px] animate-spin"
              style={{ borderColor: "var(--brand-100)", borderTopColor: "var(--brand-500)" }}
            />
            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>正在处理文件...</p>
          </div>
        ) : uploadState === "success" && result ? (
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#dcfce7", color: "#15803d" }}>
              <Check className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{result.title}</p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>已分片 {result.totalChunks} 个</p>
          </div>
        ) : (
          <>
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform"
              style={{ background: "var(--gradient-brand-soft)", color: "var(--brand-600)", transform: dragOver ? "scale(1.1)" : "scale(1)" }}
            >
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {dragOver ? "松开以上传" : "拖拽文件到此处"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              或点击选择 · .txt / .md / .pdf · ≤ 5MB
            </p>
          </>
        )}
      </div>

      {/* Error */}
      {uploadState === "error" && (
        <div className="rounded-lg px-3 py-2.5 flex items-start gap-2" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <CircleAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-700" />
          <p className="text-xs" style={{ color: "#991b1b" }}>{errorMsg}</p>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--gradient-brand-soft)", border: "1px solid var(--brand-100)" }}>
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--brand-600)" }} />
          <p className="text-xs leading-relaxed" style={{ color: "var(--brand-700)" }}>
            文件会自动分片、向量化后存入知识库。Agent 在对话中可自动检索相关内容。
          </p>
        </div>
      </div>
    </div>
  );
}
