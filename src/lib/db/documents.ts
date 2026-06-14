import { pool } from "./pool";
import { initDB } from "./pool";

export interface StoredDocument {
  id: number;
  title: string;
  source: string;
  file_path: string | null;
  file_type: string;
  file_size: number;
  created_at: string;
  chunk_count?: number;
}

export interface StoredChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  text: string;
  embedding: number[];
  estimated_tokens: number;
  similarity?: number;
}

export async function storeDocument(
  userId: number,
  title: string,
  source: string,
  chunks: { text: string; embedding: number[]; estimatedTokens: number }[],
  options?: { filePath?: string; fileType?: string; fileSize?: number },
): Promise<number> {
  await initDB();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const docResult = await client.query(
      `INSERT INTO documents (user_id, title, source, file_path, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, title, source, options?.filePath ?? null, options?.fileType ?? "txt", options?.fileSize ?? 0],
    );
    const documentId = docResult.rows[0].id;

    // 批量插入（单条 multi-row INSERT，避免 N 次往返）
    if (chunks.length > 0) {
      const values: string[] = [];
      const params: unknown[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const offset = i * 5;
        values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::vector, $${offset + 5})`);
        params.push(documentId, i, c.text, `[${c.embedding.join(",")}]`, c.estimatedTokens);
      }
      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, text, embedding, estimated_tokens) VALUES ${values.join(", ")}`,
        params,
      );
    }
    await client.query("COMMIT");
    return documentId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function searchSimilar(
  userId: number,
  queryEmbedding: number[],
  limit = 5,
  threshold = 0.5,
): Promise<StoredChunk[]> {
  await initDB();
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const result = await pool.query(
    `SELECT
       c.id, c.document_id, c.chunk_index, c.text,
       c.estimated_tokens, d.title,
       1 - (c.embedding <=> $1::vector) AS similarity
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     WHERE d.user_id = $4 AND 1 - (c.embedding <=> $1::vector) > $2
     ORDER BY c.embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, threshold, limit, userId],
  );
  return result.rows;
}

export async function searchHybrid(
  userId: number,
  queryEmbedding: number[],
  queryText: string,
  limit = 5,
  threshold = 0.5,
  mode: "semantic" | "keyword" | "hybrid" = "hybrid",
): Promise<StoredChunk[]> {
  await initDB();
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  if (mode === "semantic") {
    return searchSimilar(userId, queryEmbedding, limit, threshold);
  }

  if (mode === "keyword") {
    const result = await pool.query(
      `SELECT
         c.id, c.document_id, c.chunk_index, c.text,
         c.estimated_tokens, d.title,
         similarity(c.text, $1) AS similarity
       FROM chunks c
       JOIN documents d ON c.document_id = d.id
       WHERE d.user_id = $3 AND c.text ILIKE '%' || $1 || '%'
       ORDER BY similarity DESC
       LIMIT $2`,
      [queryText, limit, userId],
    );
    return result.rows;
  }

  // Hybrid: RRF (Reciprocal Rank Fusion)
  const [semanticResult, keywordResult] = await Promise.all([
    pool.query(
      `SELECT c.id, c.document_id, c.chunk_index, c.text, c.estimated_tokens, d.title,
              1 - (c.embedding <=> $1::vector) AS score
       FROM chunks c JOIN documents d ON c.document_id = d.id
       WHERE d.user_id = $3 AND 1 - (c.embedding <=> $1::vector) > $2
       ORDER BY score DESC`,
      [embeddingStr, threshold, userId],
    ),
    pool.query(
      `SELECT c.id, c.document_id, c.chunk_index, c.text, c.estimated_tokens, d.title,
              similarity(c.text, $1) AS score
       FROM chunks c JOIN documents d ON c.document_id = d.id
       WHERE d.user_id = $2 AND c.text ILIKE '%' || $1 || '%'
       ORDER BY score DESC`,
      [queryText, userId],
    ),
  ]);

  const K = 60;
  const scoreMap = new Map<
    number,
    { row: Record<string, unknown>; rrf: number }
  >();

  semanticResult.rows.forEach((row, i) => {
    scoreMap.set(row.id, { row, rrf: 1 / (K + i) });
  });
  keywordResult.rows.forEach((row, i) => {
    const existing = scoreMap.get(row.id);
    if (existing) {
      existing.rrf += 1 / (K + i);
    } else {
      scoreMap.set(row.id, { row, rrf: 1 / (K + i) });
    }
  });

  const fused = Array.from(scoreMap.values())
    .sort((a, b) => b.rrf - a.rrf)
    .slice(0, limit);

  return fused.map((item) => ({ ...item.row, similarity: item.rrf })) as StoredChunk[];
}

export async function listDocuments(userId: number): Promise<StoredDocument[]> {
  await initDB();
  const result = await pool.query(
    `SELECT d.id, d.title, d.source, d.file_path, d.file_type, d.file_size, d.created_at,
            COUNT(c.id)::int AS chunk_count
     FROM documents d
     LEFT JOIN chunks c ON c.document_id = d.id
     WHERE d.user_id = $1
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function deleteDocument(
  userId: number,
  id: number,
): Promise<{ ok: boolean; filePath?: string }> {
  await initDB();
  const doc = await pool.query(
    "SELECT file_path FROM documents WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  const filePath: string | null = doc.rows[0]?.file_path ?? null;
  const result = await pool.query(
    "DELETE FROM documents WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return { ok: (result.rowCount ?? 0) > 0, filePath: filePath ?? undefined };
}

export async function getDocumentChunks(
  userId: number,
  documentId: number,
): Promise<StoredChunk[]> {
  await initDB();
  const result = await pool.query(
    `SELECT c.id, c.document_id, c.chunk_index, c.text, c.estimated_tokens
     FROM chunks c
     JOIN documents d ON c.document_id = d.id
     WHERE c.document_id = $1 AND d.user_id = $2
     ORDER BY c.chunk_index`,
    [documentId, userId],
  );
  return result.rows;
}
