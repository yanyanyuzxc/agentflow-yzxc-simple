import Link from "next/link";
import { Monitor, ArrowRight } from "lucide-react";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg-app)" }}>
      {/* Nav */}
      <header
        className="shrink-0 h-14 flex items-center gap-6 px-6 sticky top-0 z-20"
        style={{
          background: "color-mix(in srgb, var(--bg-app) 85%, transparent)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
            style={{ background: "var(--gradient-brand)" }}
          >
            <Monitor className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[14px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            AI Agent
          </span>
        </Link>

        <div className="flex-1" />

        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/#features"
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            功能
          </Link>
          <Link
            href="/docs"
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            文档
          </Link>
          <Link
            href="/#how-it-works"
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            工作原理
          </Link>
        </nav>

        <Link
          href="/chat"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all duration-200 hover:scale-[1.02]"
          style={{ background: "var(--gradient-brand)" }}
        >
          开始使用
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="shrink-0 px-6 py-8"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Monitor className="w-3 h-3 text-white" />
            </div>
            <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
              AI Agent 工作台
            </span>
          </div>
          <div className="flex items-center gap-6 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            <Link href="/chat" className="hover:underline underline-offset-4">
              对话
            </Link>
            <a href="mailto:hi@example.com" className="hover:underline underline-offset-4">
              联系
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
