"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Monitor, LogIn as LogInIcon, LogOut, Sun, Moon, PanelLeftOpen, PanelLeftClose, PanelRightOpen, PanelRightClose } from "lucide-react";
import { ChatArea } from "@/features/ChatArea";
import { ConversationList } from "@/features/ConversationList";
import { useUserStore } from "@/store/user";
import { authService } from "@/services/authService";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/ui";
import { notify } from "@/lib/toast";

// 延迟加载：仅在需要时才加载代码（首屏 JS 减少 ~80KB）
const AuthModal = dynamic(
  () => import("@/features/AuthModal").then((m) => ({ default: m.AuthModal })),
  { ssr: false },
);
const KnowledgePanel = dynamic(
  () => import("@/features/KnowledgePanel").then((m) => ({ default: m.KnowledgePanel })),
  { ssr: false },
);

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const [ready, setReady] = useState(false);
  const user = useUserStore((s) => s.user);
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const { theme, toggle: toggleTheme } = useTheme();
  const showLeftPanel = useUIStore((s) => s.showLeftPanel);
  const showRightPanel = useUIStore((s) => s.showRightPanel);
  const { toggleLeftPanel, toggleRightPanel } = useUIStore.getState();

  // 启动时尝试 refresh cookie 自动登录
  useEffect(() => {
    if (isAuthenticated) { setReady(true); return; }
    authService.refresh().then(() => {
      setReady(true);
    }).catch(() => {
      setReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-app)" }}>
      {/* Auth Modal */}
      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />

      {/* Header */}
      <header
        className="shrink-0 h-14 flex items-center gap-3 px-5 z-10"
        style={{
          background: "color-mix(in srgb, var(--bg-panel) 85%, transparent)",
          backdropFilter: "saturate(180%) blur(16px)",
          WebkitBackdropFilter: "saturate(180%) blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
              AI Agent
            </h1>
            <span
              className="text-[11px] font-medium px-1.5 py-0.5 rounded-md"
              style={{
                background: "var(--gradient-brand-soft)",
                color: "var(--brand-700)",
              }}
            >
              BETA
            </span>
          </div>
        </div>

        {/* 分割线 */}
        <div className="h-5 w-px mx-1" style={{ background: "var(--border-default)" }} />

        {/* 中间标题 */}
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-medium truncate" style={{ color: "var(--text-secondary)" }}>
            智能对话工作台
          </span>
        </div>

        {/* 右侧：用户 */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: "var(--gradient-brand)" }}
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.name?.charAt(0).toUpperCase() ?? "U"
              )}
            </div>
            <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
              {user.name}
            </span>
            <div className="h-4 w-px" style={{ background: "var(--border-default)" }} />
            <button
              onClick={() => { authService.logout(); notify.info("已退出登录"); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut className="w-3 h-3" />
              退出
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all
              bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:from-blue-600 hover:to-blue-700"
          >
            <LogInIcon className="w-3.5 h-3.5" />
            登录
          </button>
        )}

        {/* 状态指示 */}
        <div className="flex items-center gap-2">
          {/* 主题切换 */}
          <button
            onClick={toggleTheme}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
            title={theme === "dark" ? "切换亮色" : "切换暗色"}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <div
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-secondary)",
            }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-75 pulse-ring"
                style={{ background: "#10b981" }}
              />
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#10b981" }} />
            </span>
            服务在线
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 min-h-0 flex">
        {/* 左侧对话列表 */}
        <aside
          className="shrink-0 flex flex-col transition-[width] duration-300 ease-out overflow-hidden"
          style={{
            width: showLeftPanel ? 256 : 0,
            background: "var(--bg-sidebar)",
            borderRight: showLeftPanel ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
              对话
            </span>
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
          <ConversationList />
        </aside>

        {/* 左侧折叠展开按钮 */}
        {!showLeftPanel && (
          <div
            className="shrink-0 flex flex-col items-center pt-3 gap-2"
            style={{ width: 36, borderRight: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={toggleLeftPanel}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="展开对话列表"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 中间聊天区 */}
        <div
          className="flex-1 min-w-0 flex flex-col"
          style={{ background: "var(--bg-app)" }}
        >
          <ChatArea />
        </div>

        {/* 右侧折叠展开按钮 */}
        {!showRightPanel && (
          <div
            className="shrink-0 flex flex-col items-center pt-3 gap-2"
            style={{ width: 36, borderLeft: "1px solid var(--border-subtle)" }}
          >
            <button
              onClick={toggleRightPanel}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="展开知识库"
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 右侧知识库 */}
        <aside
          className="shrink-0 flex flex-col transition-[width] duration-300 ease-out overflow-hidden"
          style={{
            width: showRightPanel ? 320 : 0,
            background: "var(--bg-panel)",
            borderLeft: showRightPanel ? "1px solid var(--border-subtle)" : "none",
          }}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--text-tertiary)" }}>
              知识库
            </span>
            <button
              onClick={toggleRightPanel}
              className="w-6 h-6 flex items-center justify-center rounded-md transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <KnowledgePanel />
        </aside>
      </main>
    </div>
  );
}
