import { describe, it, expect } from "bun:test";
import { webSearchTool } from "@/lib/tools/web-search";

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
