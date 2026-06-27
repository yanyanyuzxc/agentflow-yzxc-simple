"use client";

import { useEffect, useRef, useState } from "react";
import { Cog } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";
import { ThoughtCard } from "./components/ThoughtCard";
import { ToolCallCard } from "./components/ToolCallCard";
import { ObservationCard } from "./components/ObservationCard";
import { AnswerCard } from "./components/AnswerCard";
import { SearchDrawer } from "./components/SearchDrawer";

interface AgentStepsProps {
  steps: StreamingAgentStep[];
}

export function AgentSteps({ steps }: AgentStepsProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [searchDrawerStep, setSearchDrawerStep] = useState<StreamingAgentStep | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps.length, steps[steps.length - 1]?.status]);

  if (steps.length === 0) return null;

  return (
    <div className="px-4 pb-4 max-w-3xl mx-auto w-full">
      {/* Timeline container */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border-subtle)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center gap-2"
          style={{
            background: "var(--gradient-brand-soft)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Cog className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--brand-700)" }}
          >
            Agent 执行轨迹
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded ml-auto"
            style={{
              background: "var(--bg-panel)",
              color: "var(--text-tertiary)",
            }}
          >
            {steps.length} 步
          </span>
        </div>

        {/* Timeline */}
        <div className="px-3 py-3 space-y-2.5">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
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
                {step.type === "observation" && (
                  <ObservationCard step={step} onViewResults={setSearchDrawerStep} />
                )}
                {step.type === "answer" && <AnswerCard step={step} />}
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {/* 搜索结果抽屉 */}
      <SearchDrawer step={searchDrawerStep} onClose={() => setSearchDrawerStep(null)} />
    </div>
  );
}
