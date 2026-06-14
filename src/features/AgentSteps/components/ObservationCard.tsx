import { Check } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";
import { Spinner } from "@/components/ui/Spinner";

interface ObservationCardProps {
  step: StreamingAgentStep;
}

export function ObservationCard({ step }: ObservationCardProps) {
  const isRunning = step.status === "running";

  return (
    <div className="flex gap-2.5 pl-0.5">
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background: "var(--bg-panel)",
          border: `1.5px solid ${isRunning ? "var(--brand-400)" : "var(--border-default)"}`,
        }}
      >
        {isRunning ? (
          <Spinner size="sm" />
        ) : (
          <Check className="w-3 h-3" strokeWidth={2.5} style={{ color: "var(--text-tertiary)" }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            工具结果
          </span>
          {step.name && (
            <code
              className="text-[10px] font-mono px-1 rounded"
              style={{
                background: "var(--bg-hover)",
                color: "var(--text-tertiary)",
              }}
            >
              {step.name}
            </code>
          )}
          {step.durationMs != null && (
            <span
              className="text-[10px] font-medium"
              style={{ color: "var(--text-tertiary)" }}
            >
              · {step.durationMs}ms
            </span>
          )}
        </div>
        {step.result && (
          <div
            className="rounded-lg px-2.5 py-1.5"
            style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p
              className="text-[12px] leading-relaxed whitespace-pre-wrap break-words font-mono"
              style={{ color: "var(--text-secondary)" }}
            >
              {step.result.length > 300
                ? step.result.slice(0, 300) + "..."
                : step.result}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
