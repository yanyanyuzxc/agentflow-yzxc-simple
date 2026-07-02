import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";
import { Spinner } from "@/components/ui/Spinner";

interface ThoughtCardProps {
  step: StreamingAgentStep;
}

const statusIcon = (status: StreamingAgentStep["status"]) => {
  switch (status) {
    case "pending":
      return <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--border-strong)" }} />;
    case "running":
      return <Spinner size="sm" />;
    case "done":
      return <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: "var(--brand-600)" }} />;
    case "error":
      return (
        <span className="text-red-500 text-[10px] font-bold">!</span>
      );
  }
};

const hasDetail = (step: StreamingAgentStep) =>
  (step.label && step.label !== step.type && step.label.length > 40) ||
  (step.content && step.content.length > 0);

export function ThoughtCard({ step }: ThoughtCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-2.5 pl-0.5">
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: "var(--bg-panel)",
          border: "1.5px solid var(--brand-200)",
        }}
      >
        {statusIcon(step.status)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--brand-600)" }}
          >
            思考
          </span>
          {hasDetail(step) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto text-[10px] font-medium flex items-center gap-0.5 hover:underline"
              style={{ color: "var(--text-tertiary)" }}
            >
              {expanded ? "收起" : "展开"}
              <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        {/* 摘要行 — 始终显示 */}
        <div
          className="rounded-lg px-2.5 py-1.5"
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {step.label && (
            <p
              className={`text-[11px] font-medium mb-0.5 ${!expanded && step.label.length > 40 ? "truncate" : ""}`}
              style={{ color: "var(--text-primary)" }}
            >
              {step.label}
            </p>
          )}
          <p
            className={`text-[13px] leading-relaxed whitespace-pre-wrap break-words ${!expanded ? "line-clamp-2" : ""}`}
            style={{ color: "var(--text-secondary)" }}
          >
            {step.content || (step.status === "pending" ? "..." : "")}
          </p>
        </div>
      </div>
    </div>
  );
}
