"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Monitor, LogIn as LogInIcon, LogOut, Sun, Moon,
  PanelLeftOpen, PanelLeftClose, Settings,
  MessageCircle, Database, FileText, Upload, Search, ArrowLeft,
} from "lucide-react";
import { ChatArea } from "@/features/ChatArea";
import { ConversationList } from "@/features/ConversationList";
import { UserSettings } from "@/features/UserSettings";
import { ErrorBoundary } from "@/components/ui/ErrorFallback";
import { useUserStore } from "@/store/user";
import { authService } from "@/services/authService";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/ui";
import { notify } from "@/lib/toast";

// Knowledge 子组件 — 直接使用，不走 KnowledgePanel 窄面板
const FileUpload = dynamic(
  () => import("@/features/KnowledgePanel/components/FileUpload").then((m) => ({ default: m.FileUpload })),
  { ssr: false },
);
const DocumentList = dynamic(
  () => import("@/features/KnowledgePanel/components/DocumentList").then((m) => ({ default: m.DocumentList })),
  { ssr: false },
);
const SearchTest = dynamic(
  () => import("@/features/KnowledgePanel/components/SearchTest").then((m) => ({ default: m.SearchTest })),
  { ssr: false },
);
const DocumentDetail = dynamic(
  () => import("@/features/KnowledgePanel/components/DocumentDetail").then((m) => ({ default: m.DocumentDetail })),
  { ssr: false },
);
import { useKnowledgePanel } from "@/features/KnowledgePanel/hooks/useKnowledgePanel";

const AuthModal = dynamic(
  () => import("@/features/AuthModal").then((m) => ({ default: m.AuthModal })),
  { ssr: false },
);

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [ready, setReady] = useState(false);
  const user = useUserStore((s) => s.user);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { mode, cycle, label } = useTheme();
  const showLeftPanel = useUIStore((s) => s.showLeftPanel);
  const activePage = useUIStore((s) => s.activePage);
  const { toggleLeftPanel, setActivePage } = useUIStore.getState();

  useEffect(() => {
    if (isAuthenticated) { setReady(true); return; }
    authService.refresh().then(() => { setReady(true); }).catch(() => { setReady(true); });
  }, []);

  if (!ready) return null;

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-app)" }}>
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      {/* Header */}
      <header
        className="shrink-0 h-12 flex items-center gap-3 px-4 z-10"
        style={{
          background: "color-mix(in srgb, var(--bg-panel) 85%, transparent)",
          backdropFilter: "saturate(180%) blur(16px)",
          WebkitBackdropFilter: "saturate(180%) blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Monitor className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            AI Agent
          </span>
        </div>

        <div className="flex-1" />

        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-semibold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.charAt(0).toUpperCase() ?? "U"
              )}
            </div>
            <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
              {user.name}
            </span>
            <button
              onClick={() => { authService.logout(); notify.info("已退出登录"); }}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all
              bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700"
          >
            <LogInIcon className="w-3 h-3" />
            登录
          </button>
        )}

        <button
          onClick={cycle}
          className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          title={label}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {mode === "system" ? <Monitor className="w-3 h-3" /> : mode === "dark" ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
        </button>
      </header>

      {/* Body */}
      <main className="flex-1 min-h-0 flex">
        {/* Left Sidebar */}
        <aside
          className="shrink-0 flex flex-col transition-[width] duration-300 ease-out overflow-hidden"
          style={{
            width: showLeftPanel ? 256 : 0,
            background: "var(--bg-sidebar)",
            borderRight: showLeftPanel ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          {/* Navigation tabs */}
          <nav className="shrink-0 px-3 pt-4 pb-2 flex flex-col gap-0.5">
            <button
              onClick={() => setActivePage("chat")}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200"
              style={{
                color: activePage === "chat" ? "var(--brand-700)" : "var(--text-secondary)",
                background: activePage === "chat" ? "var(--bg-active)" : "transparent",
              }}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={activePage === "chat" ? 2.5 : 1.5} />
              对话
            </button>
            <button
              onClick={() => setActivePage("knowledge")}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200"
              style={{
                color: activePage === "knowledge" ? "var(--brand-700)" : "var(--text-secondary)",
                background: activePage === "knowledge" ? "var(--bg-active)" : "transparent",
              }}
            >
              <Database className="w-4 h-4" strokeWidth={activePage === "knowledge" ? 2.5 : 1.5} />
              知识库
            </button>
            <button
              onClick={() => setActivePage("settings")}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200"
              style={{
                color: activePage === "settings" ? "var(--brand-700)" : "var(--text-secondary)",
                background: activePage === "settings" ? "var(--bg-active)" : "transparent",
              }}
            >
              <Settings className="w-4 h-4" strokeWidth={activePage === "settings" ? 2.5 : 1.5} />
              设置
            </button>
          </nav>

          {/* Divider */}
          <div className="mx-3 h-px shrink-0" style={{ background: "var(--border-subtle)" }} />

          {/* Sidebar content based on active page */}
          {activePage === "chat" ? (
            <ErrorBoundary variant="silent">
              <ConversationList />
            </ErrorBoundary>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <p className="text-[11px] font-medium mb-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                文档会自动分片、向量化后存入知识库
              </p>
            </div>
          )}

          {/* Collapse button */}
          <div className="shrink-0 px-3 py-2 flex justify-end">
            <button
              onClick={toggleLeftPanel}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* Collapsed sidebar toggle */}
        {!showLeftPanel && (
          <div
            className="shrink-0 flex flex-col items-center pt-4 gap-2"
            style={{ width: 36, borderRight: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={toggleLeftPanel}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              title="展开侧栏"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActivePage("chat")}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: activePage === "chat" ? "var(--brand-600)" : "var(--text-tertiary)" }}
              title="对话"
            >
              <MessageCircle className="w-3.5 h-3.5" strokeWidth={activePage === "chat" ? 2.5 : 1.5} />
            </button>
            <button
              onClick={() => setActivePage("knowledge")}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: activePage === "knowledge" ? "var(--brand-600)" : "var(--text-tertiary)" }}
              title="知识库"
            >
              <Database className="w-3.5 h-3.5" strokeWidth={activePage === "knowledge" ? 2.5 : 1.5} />
            </button>
            <button
              onClick={() => setActivePage("settings")}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: activePage === "settings" ? "var(--brand-600)" : "var(--text-tertiary)" }}
              title="设置"
            >
              <Settings className="w-3.5 h-3.5" strokeWidth={activePage === "settings" ? 2.5 : 1.5} />
            </button>
          </div>
        )}

        {/* Center */}
        <div className="flex-1 min-w-0 flex flex-col" style={{ background: "var(--bg-app)" }}>
          {activePage === "chat" && (
            <ErrorBoundary variant="silent">
              <ChatArea />
            </ErrorBoundary>
          )}
          {activePage === "knowledge" && (
            <ErrorBoundary variant="silent">
              <KnowledgePage />
            </ErrorBoundary>
          )}
          {activePage === "settings" && (
            <ErrorBoundary variant="silent">
              <UserSettings onBack={() => setActivePage("chat")} />
            </ErrorBoundary>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── 知识库页面 ─── */

const VIEW_OPTIONS = [
  { key: "documents", label: "文档", icon: <FileText className="w-3.5 h-3.5" /> },
  { key: "upload", label: "上传", icon: <Upload className="w-3.5 h-3.5" /> },
  { key: "search", label: "检索测试", icon: <Search className="w-3.5 h-3.5" /> },
] as const;

function KnowledgePage() {
  const kp = useKnowledgePanel();

  return (
    <div className="flex-1 overflow-y-auto w-full flex flex-col">
      {/* 工具栏 — 紧凑单行，不用 Hero */}
      <div
        className="shrink-0 px-6 py-3 flex items-center gap-4"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {kp.selectedDoc ? (
          /* 文档详情：返回按钮 + 标题 */
          <button
            onClick={kp.handleBack}
            className="flex items-center gap-1.5 text-[13px] font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>
        ) : (
          <>
            {/* 视图切换 — 紧凑分段控件 */}
            <div
              className="flex rounded-lg p-0.5 gap-0.5"
              style={{ background: "var(--bg-hover)" }}
            >
              {VIEW_OPTIONS.map((v) => {
                const active = kp.activeTab === v.key;
                return (
                  <button
                    key={v.key}
                    onClick={() => kp.setActiveTab(v.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-all duration-200"
                    style={{
                      color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                      background: active ? "var(--bg-panel)" : "transparent",
                      boxShadow: active ? "var(--shadow-xs)" : "none",
                    }}
                  >
                    {v.icon}
                    {v.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1" />

            {/* 文档数量 */}
            {kp.activeTab === "documents" && (
              <span className="text-[11px]" style={{ color: "var(--text-quaternary)" }}>
                {kp.docCount != null ? `${kp.docCount} 个文档` : ""}
              </span>
            )}
          </>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-5">
          {kp.selectedDoc ? (
            <DocumentDetail doc={kp.selectedDoc} onBack={kp.handleBack} onDeleted={kp.handleDeleted} />
          ) : kp.activeTab === "upload" ? (
            <FileUpload onComplete={kp.handleUploadComplete} />
          ) : kp.activeTab === "search" ? (
            <SearchTest />
          ) : (
            <DocumentList key={kp.refreshKey} refreshKey={kp.refreshKey} onSelect={kp.handleSelectDoc} />
          )}
        </div>
      </div>
    </div>
  );
}
