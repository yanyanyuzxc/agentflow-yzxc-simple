import Link from "next/link";
import DOCS from "@/content/docs";

// 按 section 分组
function groupDocs() {
  const sections = new Map<string, typeof DOCS>();
  for (const doc of DOCS) {
    if (!sections.has(doc.section)) sections.set(doc.section, []);
    sections.get(doc.section)!.push(doc);
  }
  return sections;
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const sections = groupDocs();

  return (
    <div className="flex-1 flex">
      {/* Sidebar */}
      <aside
        className="shrink-0 w-56 overflow-y-auto px-4 py-6 hidden md:block"
        style={{ borderRight: "1px solid var(--border-subtle)" }}
      >
        <Link
          href="/docs"
          className="block text-[14px] font-bold tracking-tight mb-5"
          style={{ color: "var(--text-primary)" }}
        >
          文档
        </Link>

        <nav className="space-y-4">
          {Array.from(sections.entries()).map(([section, pages]) => (
            <div key={section}>
              <p
                className="text-[11px] font-semibold mb-1.5 tracking-wide uppercase"
                style={{ color: "var(--text-quaternary)" }}
              >
                {section}
              </p>
              <div className="flex flex-col gap-0.5">
                {pages.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/docs/${doc.slug === "index" ? "" : doc.slug}`}
                    className="text-[13px] px-2 py-1.5 rounded-lg transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
