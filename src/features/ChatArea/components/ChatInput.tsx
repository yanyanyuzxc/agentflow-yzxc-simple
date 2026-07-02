"use client";

import { useState, useRef, useEffect, type KeyboardEvent, type DragEvent, type ClipboardEvent } from "react";
import { ImagePlus, Paperclip, X, Loader, Globe, Database } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authHeaders } from "@/services/client";
import { useChatStore } from "@/store/chat/store";
import { getFileTypeStyle } from "@/lib/fileType";
import type { ImageAttachment, DocumentAttachment } from "@/types/models";

interface ChatInputProps {
  onSend: (text: string, images?: ImageAttachment[], documents?: DocumentAttachment[]) => void;
  disabled?: boolean;
}

const MAX_FILES = 5;
const DOC_ACCEPT = ".txt,.md,.markdown,.pdf,.docx";
const DOC_EXTS = [".txt", ".md", ".markdown", ".pdf", ".docx"] as const;
const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

function isDocFile(name: string): boolean {
  const ext = "." + name.split(".").pop()?.toLowerCase();
  return DOC_EXTS.includes(ext as (typeof DOC_EXTS)[number]);
}

async function uploadImage(file: File): Promise<ImageAttachment> {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("/api/upload/image", {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "上传失败" }));
    throw new Error(err.message || "上传失败");
  }

  const body = await res.json();
  return { url: body.data.url, name: file.name };
}

async function uploadDocument(file: File): Promise<DocumentAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload/document", {
    method: "POST",
    headers: await authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "上传失败" }));
    throw new Error(err.message || "上传失败");
  }

  const body = await res.json();
  return body.data as DocumentAttachment;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.setWebSearchEnabled);
  const knowledgeBaseEnabled = useChatStore((s) => s.knowledgeBaseEnabled);
  const toggleKnowledgeBase = useChatStore((s) => s.setKnowledgeBaseEnabled);
  const draft = useChatStore((s) => s.draft);
  const setDraft = useChatStore((s) => s.setDraft);

  // 收到编辑草稿 → 回填到输入框
  useEffect(() => {
    if (draft) {
      setText(draft);
      setDraft("");
      inputRef.current?.focus();
    }
  }, [draft, setDraft]);

  const totalFiles = images.length + documents.length;
  const canSend = !disabled && (!!text.trim() || totalFiles > 0);

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(
      text.trim(),
      images.length > 0 ? images : undefined,
      documents.length > 0 ? documents : undefined,
    );
    setText("");
    setImages([]);
    setDocuments([]);
    setUploadError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 上传单个文件 — 按类型分流
  const processFile = async (file: File) => {
    // 判断类型
    const isImage = file.type.startsWith("image/");
    const isDoc = isDocFile(file.name);

    if (!isImage && !isDoc) {
      setUploadError("仅支持图片和文档文件（.txt / .md / .pdf / .docx）");
      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      setUploadError("图片超过 10MB 限制");
      return;
    }
    if (isDoc && file.size > MAX_DOC_SIZE) {
      setUploadError("文档超过 5MB 限制");
      return;
    }
    if (totalFiles >= MAX_FILES) {
      setUploadError(`最多上传 ${MAX_FILES} 个文件`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      if (isImage) {
        const attachment = await uploadImage(file);
        setImages((prev) => [...prev, attachment]);
      } else {
        const attachment = await uploadDocument(file);
        setDocuments((prev) => [...prev, attachment]);
      }
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // 粘贴图片
  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    }
  };

  // 拖拽
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
  };

  // 文件选择
  const handleImageChange = () => {
    const files = imageInputRef.current?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleDocChange = () => {
    const files = docInputRef.current?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
    if (docInputRef.current) docInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const hasPreviews = images.length > 0 || documents.length > 0 || uploading;

  return (
    <div
      className="border-t p-4 backdrop-blur-sm"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-panel) 80%, transparent)",
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto">
        {/* 输入区 */}
        <div
          className={[
            "flex flex-col gap-2 rounded-2xl border p-2 shadow-sm",
            "transition-all duration-300 ease-in-out",
            disabled ? "" : "focus-within:ring-2",
          ].join(" ")}
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
          }}
        >
          {/* 文件预览条 — 在 textarea 上方 */}
          {hasPreviews && (
            <div className="flex gap-2 flex-wrap pl-10">
              {/* 图片预览 */}
              {images.map((img, i) => (
                <div
                  key={`img-${i}`}
                  className="relative group shrink-0"
                >
                  <div
                    className="w-16 h-16 rounded-lg overflow-hidden shadow-sm"
                    style={{ border: "1px solid var(--border-subtle)" }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    title="移除图片"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* 文档预览 */}
              {documents.map((doc, i) => {
                const style = getFileTypeStyle(doc.type);
                return (
                  <div
                    key={`doc-${i}`}
                    className="relative group shrink-0"
                    title={doc.name}
                  >
                    <div
                      className="w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm overflow-hidden"
                      style={{
                        background: style.bg,
                        border: `1px solid ${style.color}25`,
                      }}
                    >
                      <span className="text-2xl leading-none">{style.icon}</span>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                        style={{
                          color: style.color,
                          background: `${style.color}15`,
                        }}
                      >
                        {doc.type}
                      </span>
                    </div>
                    {/* 截断标记 */}
                    {doc.truncated && (
                      <div
                        className="absolute -bottom-0.5 left-1 right-1 h-1 rounded-full"
                        style={{ background: "var(--warning, #f59e0b)" }}
                        title="文档过长已截断"
                      />
                    )}
                    <button
                      onClick={() => removeDocument(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="移除文档"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {/* 上传中 loading */}
              {uploading && (
                <div
                  className="shrink-0 w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ background: "var(--bg-hover)", border: "1px dashed var(--border-default)" }}
                >
                  <Loader className="w-5 h-5 animate-spin" style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}
            </div>
          )}

          {/* 输入行 */}
          <div className="flex items-end gap-2">
            {/* 图片按钮 */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageChange}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={disabled || totalFiles >= MAX_FILES}
              className="shrink-0 p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{ color: "var(--text-tertiary)" }}
              title="添加图片"
            >
              <ImagePlus className="w-4 h-4" />
            </button>

            {/* 文档按钮 */}
            <input
              ref={docInputRef}
              type="file"
              accept={DOC_ACCEPT}
              multiple
              className="hidden"
              onChange={handleDocChange}
            />
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={disabled || totalFiles >= MAX_FILES}
              className="shrink-0 p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{ color: "var(--text-tertiary)" }}
              title="添加文档（.txt / .md / .pdf / .docx）"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* 知识库搜索开关 */}
            <button
              onClick={() => toggleKnowledgeBase(!knowledgeBaseEnabled)}
              disabled={disabled}
              className="shrink-0 p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{
                color: knowledgeBaseEnabled ? "#7c3aed" : "var(--text-tertiary)",
              }}
              title={knowledgeBaseEnabled ? "知识库搜索已开启" : "知识库搜索已关闭"}
            >
              <Database className="w-4 h-4" />
            </button>

            {/* 联网搜索开关 */}
            <button
              onClick={() => toggleWebSearch(!webSearchEnabled)}
              disabled={disabled}
              className="shrink-0 p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{
                color: webSearchEnabled ? "#2563eb" : "var(--text-tertiary)",
              }}
              title={webSearchEnabled ? "联网搜索已开启" : "联网搜索已关闭"}
            >
              <Globe className="w-4 h-4" />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              className={[
                "flex-1 resize-none rounded-lg px-2 py-2 text-sm transition-all duration-200",
                "focus:outline-none",
              ].join(" ")}
              style={{
                color: "var(--text-primary)",
                background: "transparent",
              }}
              placeholder="输入问题，回车发送，Shift+回车换行...（可粘贴图片或拖入文档）"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 160) + "px";
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled}
            />
            <Button
              onClick={handleSubmit}
              disabled={!canSend}
              loading={disabled}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
            >
              发送
            </Button>
          </div>

        </div>

        {/* 错误提示 */}
        {uploadError && (
          <div className="text-xs text-red-500 mt-1">{uploadError}</div>
        )}

        {/* Loading indicator */}
        <div
          className={[
            "flex items-center justify-center gap-1.5 text-xs text-gray-500 mt-2",
            "transition-all duration-300 ease-in-out overflow-hidden",
            disabled ? "max-h-8 opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <span className="flex gap-0.5">
            <span
              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </span>
          AI 思考中... 按 Esc 可中断
        </div>
      </div>
    </div>
  );
}
