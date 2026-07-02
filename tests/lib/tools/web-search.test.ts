import { describe, it, expect } from "bun:test";
import { webSearchTool, parseBingResults, cleanHtml } from "@/lib/tools/web-search";
import { readFileSync } from "fs";
import { join } from "path";

const FIXTURE_PATH = join(import.meta.dir, "__fixtures__", "bing-search.html");

describe("webSearchTool", () => {
  it("schema 定义正确", () => {
    expect(webSearchTool.name).toBe("web_search");
    expect(webSearchTool.description).toContain("搜索");
    expect(webSearchTool.schema).toBeDefined();
  });

  it("search_depth 参数可省略", () => {
    const result = webSearchTool.schema.safeParse({
      query: "test query",
    });
    expect(result.success).toBe(true);
  });

  it("max_results 限制在 3-10 之间", () => {
    const tooFew = webSearchTool.schema.safeParse({
      query: "test",
      max_results: 1,
    });
    expect(tooFew.success).toBe(false);

    const tooMany = webSearchTool.schema.safeParse({
      query: "test",
      max_results: 15,
    });
    expect(tooMany.success).toBe(false);

    const valid = webSearchTool.schema.safeParse({
      query: "test",
      max_results: 5,
    });
    expect(valid.success).toBe(true);
  });

  it("query 至少 2 个字符", () => {
    const result = webSearchTool.schema.safeParse({ query: "a" });
    expect(result.success).toBe(false);
  });
});

describe("parseBingResults", () => {
  const html = readFileSync(FIXTURE_PATH, "utf-8");

  it("从真实 Bing HTML 中提取至少 5 条结果", () => {
    const results = parseBingResults(html, 10);
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("每条结果有 title 和 url", () => {
    const results = parseBingResults(html, 10);
    for (const r of results) {
      expect(r.title).toBeTruthy();
      expect(r.url).toMatch(/^https?:\/\//);
    }
  });

  it("大多数结果有 content（摘要有内容）", () => {
    const results = parseBingResults(html, 10);
    const withContent = results.filter((r) => r.content.length > 20);
    expect(withContent.length).toBeGreaterThanOrEqual(3);
  });

  it("maxResults 参数限制返回数量", () => {
    const results = parseBingResults(html, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("搜索结果去重（URL 不重复）", () => {
    const results = parseBingResults(html, 10);
    const urls = results.map((r) => r.url.toLowerCase());
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("cleanHtml", () => {
  it("去除 HTML 标签", () => {
    expect(cleanHtml("<p>Hello <b>World</b></p>")).toBe("Hello World");
  });

  it("解码 HTML 实体", () => {
    expect(cleanHtml("A &amp; B &lt; C &gt; D")).toBe("A & B < C > D");
  });

  it("压缩多余空白", () => {
    expect(cleanHtml("Hello   \n  World")).toBe("Hello World");
  });
});
