import { z } from "zod/v4";
import type { ToolDef } from "./base";

const CrawlPageInput = z.object({
  url: z.string().url().describe("要抓取的网页 URL"),
  max_chars: z
    .number().int().min(500).max(20000)
    .optional()
    .describe("最大返回字符数，默认 5000。超过截断并标记省略"),
});
type CrawlPageInput = z.infer<typeof CrawlPageInput>;

// ==================== 安全：阻止内网/本地 URL ====================

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
const BLOCKED_PREFIXES = ["10.", "172.16.", "172.17.", "192.168."];

function isBlockedUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(host)) return `Blocked host: ${host}`;
    if (BLOCKED_PREFIXES.some((p) => host.startsWith(p))) return `Blocked private IP: ${host}`;
    return null;
  } catch {
    return "Invalid URL";
  }
}

// ==================== HTML → 可读文本 ====================

/** HTML 实体解码 */
function decodeEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&ensp;": " ",
    "&emsp;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
    "&lsquo;": "'",
    "&rsquo;": "'",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&middot;": "·",
    "&hellip;": "…",
  };
  return text.replace(/&[#\w]+;/g, (m) => entities[m] || m);
}

/**
 * 将 HTML 转换为可读文本。
 * 不依赖任何第三方库，纯正则提取。
 */
function htmlToText(html: string): string {
  let text = html;

  // 1. 移除不可见元素
  text = text
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "");

  // 2. 块级元素替换为换行
  text = text.replace(/<\/?(?:br|hr)[^>]*\/?>/gi, "\n");
  text = text.replace(/<\/(?:p|div|h[1-6]|article|section|li|tr|table|blockquote|pre|figure|figcaption|details|summary|dl|dt|dd|fieldset|form|header|main|aside|address|caption)[^>]*>/gi, "\n");
  text = text.replace(/<\/(?:ol|ul|select)[^>]*>/gi, "\n");

  // 3. 剥离所有剩余标签
  text = text.replace(/<[^>]*>/g, "");

  // 4. 解码 HTML 实体
  text = decodeEntities(text);

  // 5. 清理空白
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t\r]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");

  // 6. 压缩连续空行
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

// ==================== 网页抓取 ====================

async function crawlUrl(url: string, maxChars: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    // 只处理 HTML 和纯文本
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error(`Unsupported content type: ${contentType}. Only HTML/text pages can be crawled.`);
    }

    // 检查内容长度（避免下载超大文件）
    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    if (contentLength > 5_000_000) {
      throw new Error(`Page too large (${(contentLength / 1_000_000).toFixed(1)}MB). Max 5MB.`);
    }

    const raw = await response.text();

    // 根据 Content-Type 处理
    let text: string;
    if (contentType.includes("text/html")) {
      text = htmlToText(raw);
    } else {
      text = raw;
    }

    if (!text.trim()) {
      return "Page fetched successfully but no readable text content was extracted. The page may be a single-page app (SPA) that requires JavaScript to render, or it may contain only images/videos.";
    }

    const truncated = text.length > maxChars;
    const result = text.slice(0, maxChars);

    return [
      `[Crawled page content]`,
      `URL: ${url}`,
      `Extracted: ${text.length.toLocaleString()} chars | Displaying: ${(truncated ? maxChars : text.length).toLocaleString()} chars`,
      truncated ? `⚠️ Content truncated. Use more specific URLs or reduce scope if you need the missing ${(text.length - maxChars).toLocaleString()} chars.` : "",
      "",
      result,
      truncated ? "\n[Content truncated — end of displayed portion]" : "",
    ].filter(Boolean).join("\n");
  } finally {
    clearTimeout(timer);
  }
}

// ==================== 导出 ====================

export const crawlPageTool: ToolDef<CrawlPageInput> = {
  name: "crawl_page",
  description:
    "抓取指定网页并提取可读文本内容。用于深入阅读搜索结果中的网页。" +
    "只支持 HTML/text 页面，不支持 PDF、图片等。单页应用（SPA）可能无法抓取。" +
    "默认返回前 5000 字符，可通过 max_chars 调整（最多 20000）。",
  schema: CrawlPageInput,

  async call({ url, max_chars }) {
    const blocked = isBlockedUrl(url);
    if (blocked) return `crawl_page failed: ${blocked}`;

    const limit = max_chars ?? 5000;

    try {
      return await crawlUrl(url, limit);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("aborted") || msg.includes("AbortError") || msg.includes("timeout")) {
        return `crawl_page timed out after 20s for: ${url}. The server may be slow or unreachable. Try a different URL.`;
      }
      return `crawl_page failed for ${url}: ${msg}. Try another URL or use a cached version.`;
    }
  },
};
