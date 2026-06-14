import { useEffect, useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import type { Document } from "@/types/models";
import type { DocumentContent } from "@/services/documentService";

export function useDocumentDetail(doc: Document, onDeleted: () => void) {
  const [detail, setDetail] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showContent, setShowContent] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const content = await documentService.getContent(doc.id);
      setDetail(content);
    } catch {
      try {
        const chunks = await documentService.getChunks(doc.id);
        if (chunks.chunks) {
          setDetail({
            id: doc.id,
            title: doc.title,
            fileType: doc.file_type ?? "",
            content: chunks.chunks.map((c) => c.text).join("\n\n---\n\n"),
            chunkCount: chunks.chunks.length,
          });
        }
      } catch {
        setError("无法加载文档内容");
      }
    } finally {
      setLoading(false);
    }
  }, [doc.id, doc.title, doc.file_type]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`确定删除「${doc.title}」？`)) return;
    setDeleting(true);
    try {
      await documentService.delete(doc.id);
      onDeleted();
    } catch {
      alert("删除失败");
      setDeleting(false);
    }
  }, [doc.id, doc.title, onDeleted]);

  return { detail, loading, error, deleting, showContent, setShowContent, handleDelete };
}
