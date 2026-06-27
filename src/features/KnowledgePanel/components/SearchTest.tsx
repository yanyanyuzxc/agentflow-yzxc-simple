"use client";

import { Search, Sparkles, Cpu, Type, GitMerge } from "lucide-react";
import { useSearchTest } from "../hooks/useSearchTest";
import type { SearchMode } from "@/types/api";

const MODE_OPTIONS: { key: SearchMode; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: "hybrid", label: "混合", icon: <GitMerge className="w-3 h-3" />, hint: "RRF 融合语义+关键词" },
  { key: "semantic", label: "语义", icon: <Cpu className="w-3 h-3" />, hint: "pgvector 向量相似度" },
  { key: "keyword", label: "关键词", icon: <Type className="w-3 h-3" />, hint: "ILIKE + pg_trgm" },
];

export function SearchTest() {
  const { query, setQuery, mode, setMode, results, loading, error, handleSearch } = useSearchTest();

  return (
    <div className="space-y-5">
      {/* 搜索栏 */}
      <div className="flex gap-2">
        <div
          className="flex-1 flex items-center gap-2 rounded-xl px-3.5 py-2.5 transition-all duration-200"
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <Search className="w-4 h-4 shrink-0" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="输入关键词测试知识库检索效果..."
            className="flex-1 text-[13px] bg-transparent focus:outline-none"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 disabled:opacity-40"
          style={{
            background: "var(--gradient-brand)",
            color: "#fff",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {loading ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? "搜索中..." : "检索"}
        </button>
      </div>

      {/* 检索模式选择 */}
      <div className="flex items-center gap-3">
        <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>检索模式</span>
        <div
          className="flex rounded-lg p-0.5 gap-0.5"
          style={{ background: "var(--bg-hover)" }}
        >
          {MODE_OPTIONS.map((opt) => {
            const active = mode === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setMode(opt.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-all duration-200"
                title={opt.hint}
                style={{
                  color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                  background: active ? "var(--bg-panel)" : "transparent",
                  boxShadow: active ? "var(--shadow-xs)" : "none",
                }}
              >
                {opt.icon}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-default)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px]">
            <span style={{ color: "var(--text-tertiary)" }}>
              共 {results.total} 条结果
            </span>
            <span
              className="px-1.5 py-0.5 rounded font-medium"
              style={{ color: "var(--brand-600)", background: "var(--brand-50)" }}
            >
              {MODE_OPTIONS.find((m) => m.key === mode)?.label ?? mode}
            </span>
            {results.reranked && (
              <span
                className="px-1.5 py-0.5 rounded font-medium"
                style={{ color: "var(--brand-600)", background: "var(--brand-50)" }}
              >
                已重排序
              </span>
            )}
          </div>

          {results.results.length === 0 ? (
            <p className="text-xs text-center py-12" style={{ color: "var(--text-tertiary)" }}>
              无匹配结果，试试换个关键词或检索模式
            </p>
          ) : (
            <div className="space-y-2">
              {results.results.map((r, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-semibold w-5 h-5 rounded flex items-center justify-center"
                        style={{ color: "var(--brand-600)", background: "var(--brand-50)" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                        片段 #{r.chunk_index + 1}
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: "var(--brand-500)" }}
                    >
                      {(r.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p
                    className="text-[13px] leading-relaxed line-clamp-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {r.text}
                  </p>
                  {r.title && (
                    <p
                      className="text-[11px] mt-1.5 truncate"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      来源: {r.title}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 空状态 — 还没搜过 */}
      {!results && !error && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-brand-soft)" }}
          >
            <Search className="w-5 h-5" style={{ color: "var(--brand-400)" }} strokeWidth={1.5} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            输入关键词测试知识库检索效果
          </p>
        </div>
      )}
    </div>
  );
}
