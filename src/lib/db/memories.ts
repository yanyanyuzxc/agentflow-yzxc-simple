import { pool } from "./pool";
import { initDB } from "./pool";

export interface StoredMemory {
  id: number;
  user_id: number;
  name: string;
  content: string;
  type: "preference" | "identity" | "project" | "fact";
  created_at: string;
  similarity?: number;
}

function formatVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** 保存或更新记忆（同名覆盖），可选 embedding */
export async function saveMemory(
  userId: number,
  name: string,
  content: string,
  type: string = "fact",
  embedding?: number[],
): Promise<StoredMemory> {
  await initDB();
  const embStr = embedding ? formatVector(embedding) : null;
  const result = await pool.query(
    `INSERT INTO memories (user_id, name, content, type, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)
     ON CONFLICT (user_id, name)
     DO UPDATE SET content = $3, type = $4, embedding = COALESCE($5::vector, memories.embedding), created_at = NOW()
     RETURNING id, user_id, name, content, type, created_at`,
    [userId, name, content, type, embStr],
  );
  return result.rows[0];
}

/** 删除指定记忆 */
export async function deleteMemory(
  userId: number,
  name: string,
): Promise<boolean> {
  await initDB();
  const result = await pool.query(
    "DELETE FROM memories WHERE user_id = $1 AND name = $2",
    [userId, name],
  );
  return (result.rowCount ?? 0) > 0;
}

/** 列出用户所有记忆 */
export async function listMemories(userId: number): Promise<StoredMemory[]> {
  await initDB();
  const result = await pool.query(
    "SELECT id, user_id, name, content, type, created_at FROM memories WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  return result.rows;
}

/** 关键词模糊搜索 */
export async function searchMemories(userId: number, query: string): Promise<StoredMemory[]> {
  await initDB();
  const result = await pool.query(
    `SELECT id, user_id, name, content, type, created_at
     FROM memories
     WHERE user_id = $1
       AND (name ILIKE '%' || $2 || '%' OR content ILIKE '%' || $2 || '%')
     ORDER BY created_at DESC`,
    [userId, query],
  );
  return result.rows;
}

/** 语义搜索：用向量相似度召回相关记忆 */
export async function searchMemoriesSemantic(
  userId: number,
  queryEmbedding: number[],
  limit: number = 5,
  threshold: number = 0.5,
): Promise<StoredMemory[]> {
  await initDB();
  const embStr = formatVector(queryEmbedding);
  const result = await pool.query(
    `SELECT id, user_id, name, content, type, created_at,
            1 - (embedding <=> $1::vector) AS similarity
     FROM memories
     WHERE user_id = $2
       AND embedding IS NOT NULL
       AND 1 - (embedding <=> $1::vector) > $3
     ORDER BY embedding <=> $1::vector
     LIMIT $4`,
    [embStr, userId, threshold, limit],
  );
  return result.rows;
}

/** 混合搜索：语义 + 关键词，结果去重排序 */
export async function searchMemoriesHybrid(
  userId: number,
  queryEmbedding: number[],
  queryText: string,
  limit: number = 5,
): Promise<StoredMemory[]> {
  await initDB();

  // 并行跑语义和关键词
  const [semantic, keyword] = await Promise.all([
    searchMemoriesSemantic(userId, queryEmbedding, limit * 2, 0.3).catch(() => [] as StoredMemory[]),
    searchMemories(userId, queryText).catch(() => [] as StoredMemory[]),
  ]);

  // 用 id 去重，语义结果优先
  const seen = new Set<number>();
  const merged: StoredMemory[] = [];

  for (const m of semantic) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }
  for (const m of keyword) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push({ ...m, similarity: 0.3 });
    }
  }

  return merged.slice(0, limit);
}
