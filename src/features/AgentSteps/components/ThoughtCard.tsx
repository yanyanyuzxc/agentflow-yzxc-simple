import { Check } from "lucide-react";
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

export function ThoughtCard({ step }: ThoughtCardProps) {
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
        </div>
        <div
          className="rounded-lg px-2.5 py-1.5"
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap break-words"
            style={{ color: "var(--text-secondary)" }}
          >
            {step.content || (step.status === "pending" ? "..." : "")}
          </p>
        </div>
      </div>
    </div>
  );
}
