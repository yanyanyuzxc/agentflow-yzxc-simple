"use client";

import { Check, Search, ArrowUpRight } from "lucide-react";
import type { ToolResultRenderer } from "./registry";
import { Spinner } from "@/components/ui/Spinner";

function parseSearchMeta(result: string): { query: string; count: number } {
  const queryMatch = result.match(/for query:\s*"([^"]*)"/);
  const countMatch = result.match(/Results:\s*(\d+)/);
  return {
    query: queryMatch?.[1] || "",
    count: countMatch ? parseInt(countMatch[1]) : 0,
  };
}

const WebSearchResult: ToolResultRenderer = ({ step, onViewSearchResults }) => {
  const isRunning = step.status === "running";
  const result = step.result || "";

  if (step.status === "done" && onViewSearchResults) {
    const { query, count } = parseSearchMeta(result);
    return (
      <div className="flex gap-2.5 pl-0.5">
        <div
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "var(--bg-panel)", border: "1.5px solid var(--border-default)" }}
        >
          <Check className="w-3 h-3" strokeWidth={2.5} style={{ color: "var(--text-tertiary)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Search className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              搜索
            </span>
            <span
              className="text-[10px] truncate max-w-[200px]"
              style={{ color: "var(--text-secondary)" }}
            >
              {query}
            </span>
          </div>
          <button
            onClick={() => onViewSearchResults(step)}
            className="group flex items-center gap-2 text-xs rounded-lg px-3 py-2 w-full text-left
              transition-all duration-200 hover:shadow-sm"
            style={{
              background: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span className="text-sm">📚</span>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>
              参考 {count} 个来源
            </span>
            <span
              className="shrink-0 text-[10px] ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--brand-600)" }}
            >
              查看详情
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 pl-0.5">
      <div
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
        style={{
          background: "var(--bg-panel)",
          border: `1.5px solid ${isRunning ? "var(--brand-400)" : "var(--border-default)"}`,
        }}
      >
        {isRunning ? <Spinner size="sm" /> : <Check className="w-3 h-3" strokeWidth={2.5} style={{ color: "var(--text-tertiary)" }} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Search className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            {isRunning ? "搜索中" : "搜索"}
          </span>
          <code className="text-[10px] font-mono px-1 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-tertiary)" }}>
            web_search
          </code>
          {step.durationMs != null && (
            <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
              · {step.durationMs}ms
            </span>
          )}
        </div>
        {result && (
          <p className="text-[11px] leading-relaxed whitespace-pre-wrap break-words mt-0.5"
             style={{ color: "var(--text-tertiary)" }}>
            {result.slice(0, 100)}
          </p>
        )}
      </div>
    </div>
  );
};

export default WebSearchResult;
