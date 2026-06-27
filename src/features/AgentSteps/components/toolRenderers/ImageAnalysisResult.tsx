"use client";

import { useState } from "react";
import { Check, Image } from "lucide-react";
import type { ToolResultRenderer } from "./registry";
import { Spinner } from "@/components/ui/Spinner";

const PREFIX = "[图片分析结果]";

/**
 * see_image 渲染器 — 展示图片分析的文字描述。
 * 去除 [图片分析结果] 前缀，以正常字体渲染自然语言。
 */
const ImageAnalysisResult: ToolResultRenderer = ({ step }) => {
  const [expanded, setExpanded] = useState(false);
  const isRunning = step.status === "running";
  const raw = step.result || "";
  const text = raw.startsWith(PREFIX) ? raw.slice(PREFIX.length).trim() : raw;

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
          <Image className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            图片分析
          </span>
          {step.durationMs != null && (
            <span className="text-[10px] font-medium" style={{ color: "var(--text-tertiary)" }}>
              · {step.durationMs}ms
            </span>
          )}
        </div>
        {text && (
          <div
            className="rounded-lg px-2.5 py-1.5"
            style={{ background: "var(--bg-app)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
               style={{ color: "var(--text-secondary)" }}>
              {expanded ? text : text.slice(0, 300) + (text.length > 300 ? "..." : "")}
            </p>
            {text.length > 300 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] mt-1 font-medium hover:underline"
                style={{ color: "var(--brand-600)" }}
              >
                {expanded ? "收起" : "展开全部"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalysisResult;
