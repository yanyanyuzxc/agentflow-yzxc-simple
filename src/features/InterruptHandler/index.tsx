"use client";

import { useState } from "react";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useChatStore } from "@/store/chat/store";
import { Button } from "@/components/ui/Button";

export function InterruptHandler() {
  const [input, setInput] = useState("");
  const { resume, abort } = useStreamChat();
  const isInterrupted = useChatStore((s) => s.isInterrupted);
  const interruptData = useChatStore((s) => s.interruptData);

  if (!isInterrupted) return null;

  const handleResume = () => {
    resume(input || undefined);
    setInput("");
  };

  return (
    <div className="border-t-2 border-amber-300 bg-amber-50 px-4 py-2.5">
      <div className="max-w-3xl mx-auto flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">
            {interruptData?.message ?? "Agent 已暂停，等待确认"}
          </p>
          <input
            type="text"
            className="mt-1 w-full rounded border border-amber-200 px-2 py-1 text-sm
              focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
              placeholder:text-amber-300"
            placeholder="补充说明（可选）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleResume();
            }}
          />
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" onClick={abort}>
            取消
          </Button>
          <Button size="sm" onClick={handleResume}>
            继续
          </Button>
        </div>
      </div>
    </div>
  );
}
