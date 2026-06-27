"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-docs">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold mt-4 mb-1.5" style={{ color: "var(--text-primary)" }}>
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[14px] leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1 text-[14px]" style={{ color: "var(--text-secondary)" }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1 text-[14px]" style={{ color: "var(--text-secondary)" }}>
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-[14px] leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
              {children}
            </strong>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="text-[13px] px-1.5 py-0.5 rounded font-mono"
                  style={{
                    background: "var(--bg-hover)",
                    color: "var(--brand-600)",
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre
                className="text-[13px] p-4 rounded-xl mb-4 overflow-x-auto font-mono leading-relaxed"
                style={{
                  background: "var(--bg-hover)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <code>{children}</code>
              </pre>
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table
                className="w-full text-[13px]"
                style={{ borderCollapse: "collapse" }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>{children}</tr>
          ),
          th: ({ children }) => (
            <th
              className="text-left px-3 py-2 text-[12px] font-semibold"
              style={{ color: "var(--text-primary)", background: "var(--bg-hover)" }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>
              {children}
            </td>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="underline underline-offset-2"
              style={{ color: "var(--brand-500)" }}
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr className="my-6" style={{ borderColor: "var(--border-subtle)" }} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
