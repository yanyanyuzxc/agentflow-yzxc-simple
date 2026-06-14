import { z } from "zod/v4";
import { searchHybrid, searchMemoriesHybrid } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding-cache";
import { RagPipeline } from "@/lib/rag";
import { buildTool, type ToolDef } from "./base";

/** search_docs 入参 */
const SearchDocsInput = z.object({
  query: z.string().describe("搜索关键词"),
});

type SearchDocsInput = z.infer<typeof SearchDocsInput>;

/** search_docs 工具工厂 — 需要 userId 做数据隔离 */
export function createSearchDocsTool(userId: number, embeddingModel = "BAAI/bge-m3"): ToolDef<SearchDocsInput> {
  const rag = new RagPipeline();

  return {
    name: "search_docs",
    description: "搜索知识库中的文档资料，同时查找相关的用户记忆。当你需要查找已存储的信息或了解用户偏好时使用",
    schema: SearchDocsInput,

    async call({ query }) {
      const parts: string[] = [];

      // —— 记忆搜索（语义 + 关键词混合）——
      try {
        const memEmbedding = await getEmbedding(query, embeddingModel);
        if (memEmbedding.length > 0) {
          const matched = await searchMemoriesHybrid(userId, memEmbedding, query, 5);
          if (matched.length > 0) {
            parts.push(
              "【用户记忆】",
              ...matched.map((m) => `[来源: 用户${m.type === 'preference' ? '偏好' : m.type === 'identity' ? '身份' : m.type === 'project' ? '项目' : '事实'}] ${m.content}${m.similarity ? ` (相关度 ${m.similarity.toFixed(2)})` : ""}`),
              "",
            );
          }
        }
      } catch {
        // 记忆搜索失败不影响主流程
      }

      // —— 文档搜索 ——
      const embedding = await getEmbedding(query, embeddingModel);
      if (!embedding || embedding.length === 0) {
        return parts.length > 0
          ? parts.join("\n")
          : "搜索失败：无法生成查询向量";
      }

      const candidates = await searchHybrid(userId, embedding, query, 10, 0.3, "hybrid");
      if (candidates.length > 0) {
        const texts = candidates.map((r) => r.text);
        const reranked = await rag.rerank(query, texts, { topN: 3 });
        const selected = reranked.map((r) => candidates[r.index]);
        const budgeted = rag.fitBudget(selected, 3000, (c) => c.estimated_tokens);

        parts.push(
          "【知识库文档】",
          ...budgeted.map((r) => `[来源: 知识库] [相关度 ${(r.similarity ?? 0).toFixed(2)}] ${r.text}`),
        );
      }

      return parts.length > 0
        ? parts.join("\n")
        : "没有找到相关资料";
    },
  };
}
