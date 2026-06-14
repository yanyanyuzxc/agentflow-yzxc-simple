"use client";

import { useState } from "react";
import { Wrench, ChevronDown } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";
import { Spinner } from "@/components/ui/Spinner";

interface ToolCallCardProps {
  step: StreamingAgentStep;
}

export function ToolCallCard({ step }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasArgs =
    step.args && Object.keys(step.args as Record<string, unknown>).length > 0;

  const isRunning = step.status === "running";
  const isDone = step.status === "done";

  return (
    <div className="flex gap-2.5 pl-0.5">
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: isRunning
            ? "var(--brand-50)"
            : isDone
            ? "var(--bg-panel)"
            : "var(--bg-panel)",
          border: `1.5px solid ${isRunning ? "var(--brand-400)" : "var(--border-default)"}`,
        }}
      >
        {isRunning ? (
          <Spinner size="sm" />
        ) : (
          <Wrench className="w-3 h-3" strokeWidth={2.5} style={{ color: "var(--text-tertiary)" }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            工具调用
          </span>
        </div>
        <div
          className="rounded-lg overflow-hidden"
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5">
            <code
              className="text-[12px] font-mono font-semibold"
              style={{ color: "var(--brand-700)" }}
            >
              {step.name}
            </code>
            {hasArgs && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-auto text-[10px] font-medium flex items-center gap-0.5 hover:underline"
                style={{ color: "var(--text-tertiary)" }}
              >
                {expanded ? "收起" : "参数"}
                <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
          {expanded && hasArgs && (
            <pre
              className="text-[11px] font-mono px-2.5 py-2 overflow-x-auto max-h-32"
              style={{
                background: "var(--bg-panel)",
                color: "var(--text-secondary)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              {JSON.stringify(step.args, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
