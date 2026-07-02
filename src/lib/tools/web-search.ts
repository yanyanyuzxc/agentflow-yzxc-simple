import { z } from "zod/v4";
import { getEnv } from "@/lib/env";
import type { ToolDef } from "./base";

const WebSearchInput = z.object({
  query: z.string().min(2).describe("搜索关键词"),
  search_depth: z
    .enum(["basic", "advanced"])
    .optional()
    .describe("basic=快速搜索（简单事实）, advanced=深度搜索（更长摘要，稍慢但更全）。默认 advanced"),
  max_results: z
    .number().int().min(3).max(10)
    .optional()
    .describe("返回结果数，默认 8。简单问题用 3-5，深度研究用 8-10"),
});
type WebSearchInput = z.infer<typeof WebSearchInput>;

interface SearchHit {
  title: string;
  url: string;
  content: string;
  score?: number;
}

// ==================== Tavily（优先） ====================

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function searchTavily(
  query: string,
  maxResults = 5,
  searchDepth: "basic" | "advanced" = "advanced",
): Promise<SearchHit[]> {
  const apiKey = getEnv().TAVILY_API_KEY!;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: searchDepth,
        include_answer: searchDepth === "advanced",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Tavily returned ${response.status}`);
    }

    const data = await response.json();
    const results: TavilyResult[] = data.results ?? [];
    return results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    }));
  } finally {
    clearTimeout(timer);
  }
}

// ==================== Bing（兜底） ====================

export function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&ensp;/g, " ")
    .replace(/&#0*183;/g, "·")
    .replace(/&#0*8206;/g, "")
    .replace(/&\w+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseBingResults(html: string, maxResults: number): SearchHit[] {
  const results: SearchHit[] = [];
  const algoRegex = /<li class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
  let match;

  while ((match = algoRegex.exec(html)) !== null && results.length < maxResults) {
    const block = match[1];
    const titleMatch = /<h2[^>]*><a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a><\/h2>/i.exec(block);
    if (!titleMatch) continue;

    const title = cleanHtml(titleMatch[2]);
    if (!title) continue;

    // 多种结构兼容：cn.bing.com 用嵌套 div.b_caption > p.b_lineclamp2，
    // www.bing.com 用平铺 p.b_lineclamp2 或 div.b_caption
    let content = "";
    const pLineMatch = /<p[^>]*class="b_lineclamp[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(block);
    if (pLineMatch) {
      content = cleanHtml(pLineMatch[1]);
    } else {
      const capMatch = /<(?:p|div)[^>]*class="b_caption[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div)>/i.exec(block);
      if (capMatch) content = cleanHtml(capMatch[1]);
    }
    // 最后兜底：任意 <p>
    if (!content) {
      const anyP = /<p[^>]*>([\s\S]*?)<\/p>/i.exec(block);
      if (anyP) content = cleanHtml(anyP[1]);
    }

    results.push({ title, url: titleMatch[1], content });
  }

  return results;
}


async function searchBing(
  query: string,
  maxResults = 5,
): Promise<SearchHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `https://cn.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-hans&count=${maxResults}&FORM=HDRSC1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Bing returned ${response.status}`);
    const html = await response.text();
    return parseBingResults(html, maxResults);
  } finally {
    clearTimeout(timer);
  }
}

// ==================== 搜索调度（Tavily 优先，Bing 兜底） ====================

/**
 * 执行搜索：Tavily 优先，超时才降级到 Bing。
 *
 * 策略：
 * - 有 Tavily key → 先调 Tavily（3 秒超时），结果不够才补 Bing
 * - 无 Tavily key → 直接用 Bing
 * - Bing 结果质量较差，只做兜底不做主力
 */
async function doSearch(
  query: string,
  maxResults: number,
  searchDepth: "basic" | "advanced",
  tavilyTimeoutMs = 10000,
): Promise<SearchHit[]> {
  const results: SearchHit[] = [];
  const seen = new Set<string>();

  const addHits = (hits: SearchHit[]) => {
    for (const h of hits) {
      const key = h.url.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push(h);
      }
    }
  };

  const hasTavily = !!getEnv().TAVILY_API_KEY;

  if (hasTavily) {
    // Tavily 优先：3 秒超时
    const tavilyHits = await Promise.race([
      searchTavily(query, maxResults, searchDepth),
      new Promise<SearchHit[]>((resolve) =>
        setTimeout(() => resolve([]), tavilyTimeoutMs),
      ),
    ]).catch(() => []);

    addHits(tavilyHits);

    // Tavily 结果不够 → Bing 兜底
    if (results.length < 3) {
      const bingHits = await searchBing(query, maxResults).catch(() => []);
      addHits(bingHits);
    }
  } else {
    // 无 Tavily → 纯 Bing
    const bingHits = await searchBing(query, maxResults).catch(() => []);
    addHits(bingHits);
  }

  // 按内容长度排序：有内容的优先
  results.sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));

  return results.slice(0, Math.max(maxResults, results.length));
}

export const webSearchTool: ToolDef<WebSearchInput> = {
  name: "web_search",
  description:
    "搜索互联网获取实时信息。当知识库找不到答案或需要最新资料时使用。" +
    "简单事实用 basic 深度 + 3-5 条结果，复杂研究用 advanced 深度 + 8-10 条结果。" +
    "advanced 返回更长摘要。默认 advanced + 8 条结果。",
  schema: WebSearchInput,

  async call({ query, search_depth, max_results }) {
    const startTime = performance.now();
    const depth = search_depth ?? "advanced";
    const limit = max_results ?? 8;

    try {
      const hits = await doSearch(query, limit, depth);
      const durationSeconds = (performance.now() - startTime) / 1000;

      if (hits.length === 0) {
        return `Web search for "${query}" returned no results. Try different keywords or broaden the search.`;
      }

      const results = hits
        .map(
          (h, i) => {
            const scoreStr = h.score !== undefined ? ` (相关度 ${h.score.toFixed(2)})` : "";
            return `[${i + 1}]${scoreStr} ${h.title}\nURL: ${h.url}\n内容: ${h.content}`;
          },
        )
        .join("\n\n");

      return [
        `Web search results for query: "${query}"`,
        `Results: ${hits.length} | Duration: ${durationSeconds.toFixed(1)}s`,
        "",
        results,
        "",
        "CRITICAL REQUIREMENT - You MUST follow this:",
        "- After answering the user's question, you MUST include a \"Sources:\" section at the end of your response",
        "- In the Sources section, list all relevant URLs from the search results as markdown hyperlinks: [Title](URL)",
        "- This is MANDATORY - never skip including sources in your response",
      ].join("\n");
    } catch (e) {
      return `Web search failed: ${(e as Error).message}. Try different keywords or use search_docs for knowledge base search.`;
    }
  },
};
