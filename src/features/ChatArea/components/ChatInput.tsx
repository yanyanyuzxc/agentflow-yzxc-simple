"use client";

import { useState, useRef, type KeyboardEvent, type DragEvent, type ClipboardEvent } from "react";
import { ImagePlus, X, Loader, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { authHeaders } from "@/services/client";
import { useChatStore } from "@/store/chat/store";
import type { ImageAttachment } from "@/types/models";

interface ChatInputProps {
  onSend: (text: string, images?: ImageAttachment[]) => void;
  disabled?: boolean;
}

const MAX_IMAGES = 5;

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
  // resOk 格式: { code: 0, data: { url, name, size } }
  return { url: body.data.url, name: file.name };
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const toggleWebSearch = useChatStore((s) => s.setWebSearchEnabled);

  const canSend = !disabled && (!!text.trim() || images.length > 0);

  const handleSubmit = () => {
    if (!canSend) return;
    onSend(text.trim(), images.length > 0 ? images : undefined);
    setText("");
    setImages([]);
    setUploadError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // 上传单个文件
  const processFile = async (file: File) => {
    // 客户端校验
    if (!file.type.startsWith("image/")) {
      setUploadError("仅支持图片文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("图片超过 10MB 限制");
      return;
    }
    if (images.length >= MAX_IMAGES) {
      setUploadError(`最多上传 ${MAX_IMAGES} 张图片`);
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const attachment = await uploadImage(file);
      setImages((prev) => [...prev, attachment]);
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
  const handleFileChange = () => {
    const files = fileInputRef.current?.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      processFile(files[i]);
    }
    // 重置 input 以允许重复选同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
          {/* 图片预览条 — 在 textarea 上方 */}
          {(images.length > 0 || uploading) && (
            <div className="flex gap-2 flex-wrap pl-10">
              {images.map((img, i) => (
                <div
                  key={i}
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
              {/* 上传中 loading 占位 */}
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

          {/* 输入行：图片按钮 + textarea + 发送 */}
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || images.length >= MAX_IMAGES}
              className="shrink-0 p-2 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
              style={{ color: "var(--text-tertiary)" }}
              title="添加图片"
            >
              <ImagePlus className="w-4 h-4" />
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
              placeholder="输入问题，回车发送，Shift+回车换行...（可粘贴图片）"
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
