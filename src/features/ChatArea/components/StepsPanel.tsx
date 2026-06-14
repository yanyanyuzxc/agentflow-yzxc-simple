import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";
import { ThoughtCard } from "@/features/AgentSteps/components/ThoughtCard";
import { ToolCallCard } from "@/features/AgentSteps/components/ToolCallCard";
import { ObservationCard } from "@/features/AgentSteps/components/ObservationCard";

/** 步骤面板：可折叠，使用现有 AgentSteps 卡片 */
export function StepsPanel({
  steps,
  autoCollapse,
}: {
  steps: StreamingAgentStep[];
  autoCollapse: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // assistant 消息出现时自动折叠
  useEffect(() => {
    if (autoCollapse) setCollapsed(true);
  }, [autoCollapse]);

  if (steps.length === 0) return null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-3 py-2 flex items-center gap-2 transition-colors hover:brightness-95"
        style={{
          background: "var(--gradient-brand-soft)",
          borderBottom: collapsed ? "none" : "1px solid var(--border-subtle)",
        }}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
        <span className="text-xs font-semibold" style={{ color: "var(--brand-700)" }}>
          Agent 执行轨迹
        </span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto"
          style={{ background: "var(--bg-panel)", color: "var(--text-tertiary)" }}
        >
          {steps.length} 步
        </span>
      </button>

      {!collapsed && (
        <div className="px-3 py-3 space-y-2.5">
          {steps.map((step, si) => {
            const isLast = si === steps.length - 1;
            return (
              <div key={step.stepId} className="relative">
                {!isLast && (
                  <div
                    className="absolute left-[11px] top-6 w-px h-[calc(100%+0.4rem)]"
                    style={{ background: "var(--border-default)" }}
                  />
                )}
                {step.type === "thought" && <ThoughtCard step={step} />}
                {step.type === "tool_call" && <ToolCallCard step={step} />}
                {step.type === "observation" && <ObservationCard step={step} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
