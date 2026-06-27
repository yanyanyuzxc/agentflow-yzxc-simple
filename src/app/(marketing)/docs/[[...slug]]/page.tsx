import { notFound } from "next/navigation";
import type { Metadata } from "next";
import DOCS from "@/content/docs";
import { MarkdownContent } from "./MarkdownContent";

interface Props {
  params: Promise<{ slug?: string[] }>;
}

export async function generateStaticParams() {
  return DOCS.map((doc) => ({
    slug: doc.slug === "index" ? [] : [doc.slug],
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pageSlug = slug?.join("/") || "index";
  const doc = DOCS.find((d) => d.slug === pageSlug);
  if (!doc) return { title: "文档未找到" };
  return { title: `${doc.title} — 文档` };
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params;
  const pageSlug = slug?.join("/") || "index";
  const doc = DOCS.find((d) => d.slug === pageSlug);

  if (!doc) notFound();

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1
        className="text-2xl font-bold tracking-tight mb-2"
        style={{ color: "var(--text-primary)" }}
      >
        {doc.title}
      </h1>
      <p className="text-xs mb-8" style={{ color: "var(--text-tertiary)" }}>
        {doc.section}
      </p>

      <MarkdownContent content={doc.content} />
    </div>
  );
}
