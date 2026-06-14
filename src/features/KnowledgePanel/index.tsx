"use client";

import { BookOpen } from "lucide-react";
import { FileUpload } from "./components/FileUpload";
import { DocumentList } from "./components/DocumentList";
import { SearchTest } from "./components/SearchTest";
import { DocumentDetail } from "./components/DocumentDetail";
import { useKnowledgePanel } from "./hooks/useKnowledgePanel";
import { KNOWLEDGE_TABS } from "./config";

export function KnowledgePanel() {
  const {
    activeTab,
    setActiveTab,
    selectedDoc,
    refreshKey,
    handleUploadComplete,
    handleSelectDoc,
    handleBack,
    handleDeleted,
  } = useKnowledgePanel();

  return (
    <div className="flex flex-col h-full w-80">
      {/* Header */}
      <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "var(--gradient-brand-soft)", color: "var(--brand-600)" }}
        >
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>知识库</h2>
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>文档检索 · RAG</p>
        </div>
      </div>

      {/* Tabs */}
      {!selectedDoc && (
        <div className="shrink-0 px-3 pt-1 pb-3">
          <div className="flex p-0.5 rounded-lg gap-0.5" style={{ background: "var(--bg-hover)" }}>
            {KNOWLEDGE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-all"
                style={
                  activeTab === tab.key
                    ? { background: "var(--bg-panel)", color: "var(--brand-600)", boxShadow: "var(--shadow-sm)" }
                    : { color: "var(--text-tertiary)" }
                }
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {selectedDoc ? (
          <DocumentDetail doc={selectedDoc} onBack={handleBack} onDeleted={handleDeleted} />
        ) : activeTab === "upload" ? (
          <FileUpload onComplete={handleUploadComplete} />
        ) : activeTab === "search" ? (
          <SearchTest />
        ) : (
          <DocumentList key={refreshKey} refreshKey={refreshKey} onSelect={handleSelectDoc} />
        )}
      </div>
    </div>
  );
}
