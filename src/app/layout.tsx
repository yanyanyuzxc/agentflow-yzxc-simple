import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agent 工作台",
  description: "智能对话工作台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <head>
        {/* 防止暗色模式闪烁：在 HTML 渲染前读取 localStorage */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem("theme");var d=(t==="dark"||(t!="light"&&window.matchMedia("(prefers-color-scheme:dark)").matches));if(d)document.documentElement.classList.add("dark")})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
