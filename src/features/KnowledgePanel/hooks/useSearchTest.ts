import { useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import type { SearchResponse } from "@/types/api";

export function useSearchTest() {
  const [query, setQuery] = useState("");
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
        threshold: 0.3,
        mode: "hybrid",
        useReranker: true,
        useExpansion: true,
      });
      setResults(res);
    } catch {
      setError("搜索失败");
    } finally {
      setLoading(false);
    }
  }, [query]);

  return { query, setQuery, results, loading, error, handleSearch };
}
