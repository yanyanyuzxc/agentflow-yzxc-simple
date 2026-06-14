import type { StreamingAgentStep } from "@/types/agent";
import { Spinner } from "@/components/ui/Spinner";

interface AnswerCardProps {
  step: StreamingAgentStep;
}

export function AnswerCard({ step }: AnswerCardProps) {
  const isStreaming = step.status === "running";
  const isDone = step.status === "done";

  return (
    <div className="py-2">
      {isDone && (
        <p className="text-xs font-medium text-gray-400 mb-1">回答</p>
      )}
      <div className="prose prose-sm max-w-none">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {step.content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-4 bg-blue-500 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </p>
      </div>
      {isStreaming && (
        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Spinner size="sm" />
          回答中...
        </p>
      )}
    </div>
  );
}
