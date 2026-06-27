/**
 * 工具结果渲染器注册表。
 *
 * 每个工具注册自己的渲染组件，ObservationCard 只做分发。
 * 新增工具 → 写一个新组件 + 在此注册一行，不改 ObservationCard。
 */
import { registerRenderer } from "./registry";
import WebSearchResult from "./WebSearchResult";
import ImageAnalysisResult from "./ImageAnalysisResult";
import CrawlPageResult from "./CrawlPageResult";
import DefaultResult from "./DefaultResult";

// 确保此模块只注册一次
let registered = false;

export function ensureRegistered(): void {
  if (registered) return;
  registered = true;

  registerRenderer("web_search", WebSearchResult);
  registerRenderer("see_image", ImageAnalysisResult);
  registerRenderer("crawl_page", CrawlPageResult);
}

export { getRenderer } from "./registry";
export { default as DefaultResult } from "./DefaultResult";
