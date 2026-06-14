"use client";

import { useState, useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="border-t p-4 backdrop-blur-sm"
      style={{
        borderColor: "var(--border-subtle)",
        background: "color-mix(in srgb, var(--bg-panel) 80%, transparent)",
      }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Input area */}
        <div
          className={[
            "flex items-end gap-2 rounded-2xl border p-2 shadow-sm",
            "transition-all duration-300 ease-in-out",
            disabled ? "" : "focus-within:ring-2",
          ].join(" ")}
          style={{
            background: "var(--bg-elevated)",
            borderColor: "var(--border-default)",
          }}
        >
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
            placeholder="输入问题，回车发送，Shift+回车换行..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 160) + "px";
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Button
            onClick={handleSubmit}
            disabled={disabled || !text.trim()}
            loading={disabled}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 text-sm font-medium shadow-sm transition-all duration-200"
          >
            发送
          </Button>
        </div>

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
