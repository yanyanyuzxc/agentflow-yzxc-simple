import { useEffect, useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import type { Document } from "@/types/models";

export function useDocumentList(refreshKey: number) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const list = await documentService.list();
      setDocs(list);
    } catch {
      setError("加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs, refreshKey]);

  return { docs, loading, error, refetch: fetchDocs };
}
