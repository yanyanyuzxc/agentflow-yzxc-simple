import { useState, useCallback } from "react";
import type { Document } from "@/types/models";
import type { KnowledgeTab } from "../config";

export function useKnowledgePanel() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("documents");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

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
    handleUploadComplete,
    handleSelectDoc,
    handleBack,
    handleDeleted,
  };
}
