"use client";

import { useSearchTest } from "../hooks/useSearchTest";

export function SearchTest() {
  const { query, setQuery, results, loading, error, handleSearch } = useSearchTest();

  return (
    <div className="p-3 space-y-3">
      {/* Input */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="输入搜索关键词..."
          className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-400"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="text-xs bg-blue-500 text-white rounded-lg px-3 py-1.5 hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "搜索中..." : "搜索"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-2">
          {results.results.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">无匹配结果</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-gray-400">共 {results.total} 条结果</span>
                {results.reranked && <span className="text-[11px] text-blue-500">已重排序</span>}
              </div>
              {results.results.map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-500">片段 #{r.chunk_index + 1}</span>
                    <span className="text-[11px] text-blue-500 font-medium">{(r.similarity * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{r.text}</p>
                  {r.title && <p className="text-[11px] text-gray-400 truncate">来源: {r.title}</p>}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {!results && !error && (
        <p className="text-xs text-gray-400 text-center py-8">输入关键词测试知识库检索效果</p>
      )}
    </div>
  );
}
