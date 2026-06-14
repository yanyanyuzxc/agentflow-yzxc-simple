import { searchHybrid } from '@/lib/db'
import { rerank, expandQuery } from '@/lib/rag'
import { SearchInput, parseBody } from '@/lib/schemas'
import { getEmbedding } from '@/lib/embedding-cache'
import { resOk, resErr } from '@/lib/resp'

async function searchSingle(
  userId: number,
  query: string,
  limit: number,
  threshold: number,
  mode: string,
) {
  const embedding = await getEmbedding(query, 'BAAI/bge-m3');
  return searchHybrid(userId, embedding, query, limit, threshold, mode as any)
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, SearchInput);

    let queries = [body.query]
    if (body.useExpansion) {
      const expanded = await expandQuery(body.query)
      queries = expanded
    }

    const userId = Number(request.headers.get("x-user-id"));
    if (!userId) return resErr(401, "未登录");
    const limit = body.limit ?? 5;
    const threshold = body.threshold ?? 0.5;
    const mode = body.mode ?? "hybrid";
    const useReranker = body.useReranker ?? false;
    const perQuery = useReranker ? limit * 2 : limit
    const allResults = await Promise.all(
      queries.map((q: string) => searchSingle(userId, q, perQuery, threshold, mode))
    )

    const merged = new Map<number, any>()
    for (const results of allResults) {
      for (const row of results) {
        const existing = merged.get(row.id)
        if (!existing || (row.similarity ?? 0) > (existing.similarity ?? 0)) {
          merged.set(row.id, row)
        }
      }
    }

    let matches = Array.from(merged.values())
      .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
      .slice(0, useReranker ? limit * 4 : limit)

    if (!useReranker || matches.length === 0) {
      return resOk({
        query: body.query,
        total: matches.length,
        expanded: queries.length > 1 ? queries : undefined,
        results: matches,
      })
    }

    const texts = matches.map((m) => m.text)
    const reranked = await rerank(body.query, texts, { topN: limit })
    const results = reranked.map((r) => ({
      ...matches[r.index],
      similarity: r.relevance_score,
    }))

    return resOk({
      query: body.query,
      total: results.length,
      expanded: queries.length > 1 ? queries : undefined,
      reranked: true,
      results,
    })
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('搜索失败:', error)
    return resErr(500, '搜索失败')
  }
}
