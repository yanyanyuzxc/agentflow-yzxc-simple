"use client";

import { X, Globe, ChevronRight } from "lucide-react";
import type { StreamingAgentStep } from "@/types/agent";

interface SearchDrawerProps {
  step: StreamingAgentStep | null;
  onClose: () => void;
}

interface ResultBlock {
  title: string;
  url: string;
  content: string;
}

function parseResults(text: string): { headerLines: string[]; blocks: ResultBlock[] } {
  const lines = text.split("\n");
  const headerLines: string[] = [];
  const blocks: ResultBlock[] = [];
  let current: ResultBlock | null = null;

  for (const line of lines) {
    const resultMatch = line.match(/^\[(\d+)\]\s*(.*)/);
    const urlMatch = line.match(/^URL:\s*(.*)/);
    const contentMatch = line.match(/^内容:\s*(.*)/);

    if (resultMatch) {
      if (current) blocks.push(current);
      current = { title: resultMatch[2], url: "", content: "" };
    } else if (urlMatch && current) {
      current.url = urlMatch[1];
    } else if (contentMatch && current) {
      current.content = contentMatch[1];
    } else if (!current) {
      headerLines.push(line);
    }
  }
  if (current) blocks.push(current);

  return { headerLines, blocks };
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

export function SearchDrawer({ step, onClose }: SearchDrawerProps) {
  if (!step) return null;

  const { headerLines, blocks } = parseResults(step.result || "");
  const query = headerLines.find((l) => l.includes("query:"))?.replace(/.*query:\s*/, "").replace(/"/g, "") || "";
  const duration = headerLines.find((l) => l.includes("Duration:"))?.replace(/.*Duration:\s*/, "") || "";

  return (
    <>
      {/* 遮罩 */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.2)" }}
        onClick={onClose}
      />

      {/* 抽屉 — 右侧弹出 */}
      <div
        className="fixed inset-y-0 right-0 w-full max-w-md z-50 flex flex-col animate-slide-in"
        style={{ background: "var(--bg-panel)" }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 py-4 flex items-start justify-between"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📚</span>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                参考来源
              </h2>
            </div>
            {query && (
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                搜索 "{query}"{duration ? ` · ${duration}` : ""}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 结果列表 */}
        <div className="flex-1 overflow-y-auto">
          {blocks.length > 0 ? (
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {blocks.map((block, i) => {
                const domain = extractDomain(block.url);
                return (
                  <a
                    key={i}
                    href={block.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-5 py-4 transition-colors hover:bg-black/[0.02] group"
                  >
                    <div className="flex items-start gap-3">
                      {/* 序号 */}
                      <span
                        className="shrink-0 w-[18px] h-[18px] rounded flex items-center justify-center text-[10px] font-semibold mt-0.5"
                        style={{
                          background: "var(--bg-hover)",
                          color: "var(--text-tertiary)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        {/* 标题 */}
                        <p
                          className="text-[13px] font-medium leading-snug mb-1 group-hover:underline"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {block.title}
                        </p>
                        {/* 域名 */}
                        {domain && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Globe className="w-3 h-3" style={{ color: "var(--text-tertiary)" }} />
                            <span className="text-[11px] truncate" style={{ color: "var(--text-tertiary)" }}>
                              {domain}
                            </span>
                          </div>
                        )}
                        {/* 摘要 */}
                        {block.content && (
                          <p
                            className="text-[12px] leading-relaxed line-clamp-3"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {block.content}
                          </p>
                        )}
                      </div>
                      <ChevronRight
                        className="w-3.5 h-3.5 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-tertiary)" }}
                      />
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="p-5">
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap p-3 rounded-lg"
                style={{
                  background: "var(--bg-app)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {step.result}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 px-5 py-3 text-[11px]"
          style={{
            color: "var(--text-tertiary)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          {blocks.length} 个来源 · 点击可跳转原网页
        </div>
      </div>
    </>
  );
}
