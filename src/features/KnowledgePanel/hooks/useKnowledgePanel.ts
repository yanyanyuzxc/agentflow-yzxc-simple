import { useState, useCallback, useEffect } from "react";
import type { Document } from "@/types/models";
import type { KnowledgeTab } from "../config";
import { documentService } from "@/services/documentService";

export function useKnowledgePanel() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("documents");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [docCount, setDocCount] = useState<number | null>(null);

  // 加载文档数量（工具栏展示用）
  useEffect(() => {
    documentService.list().then((list) => setDocCount(list.length)).catch(() => {});
  }, [refreshKey]);

  const handleUploadComplete = useCallback(() => {
    setActiveTab("documents");
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSelectDoc = useCallback((doc: Document) => {
    setSelectedDoc(doc);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedDoc(null);
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedDoc(null);
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    activeTab,
    setActiveTab,
    selectedDoc,
    refreshKey,
    docCount,
    handleUploadComplete,
    handleSelectDoc,
    handleBack,
    handleDeleted,
  };
}
