import { useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import type { SearchResponse, SearchMode } from "@/types/api";

export function useSearchTest() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("hybrid");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await documentService.search({
        query: query.trim(),
        limit: 5,
        threshold: mode === "keyword" ? 0.1 : 0.3,
        mode,
        useReranker: mode !== "keyword",
        useExpansion: mode !== "keyword",
      });
      setResults(res);
    } catch {
      setError("搜索失败");
    } finally {
      setLoading(false);
    }
  }, [query, mode]);

  return { query, setQuery, mode, setMode, results, loading, error, handleSearch };
}
