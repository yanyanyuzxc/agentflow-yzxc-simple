import { pool, initDB } from "@/lib/db";
import { getOpenAI } from "@/lib/llm";

// ==================== SHA256 (Web Crypto) ====================

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ==================== LRU Cache ====================

class LRUCache<T> {
  private map = new Map<string, T>();

  constructor(private maxSize: number = 1000) {}

  get(key: string): T | undefined {
    return this.map.get(key);
  }

  set(key: string, value: T): void {
    // 满了就挤掉最早插入的 (Map 维护插入顺序)
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  get size(): number {
    return this.map.size;
  }
}

// ==================== 两级缓存 ====================

const lru = new LRUCache<number[]>(1000);

function parseVector(raw: unknown): number[] {
  // pgvector 返回格式如 "[0.1,0.2,0.3]"
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as number[];
    } catch {
      return [];
    }
  }
  return [];
}

function formatVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/** 单条 embedding，两级缓存 → API fallback */
export async function getEmbedding(text: string, model = "BAAI/bge-m3"): Promise<number[]> {
  const hash = await sha256(text);

  // L1: 内存 LRU
  const cached = lru.get(hash);
  if (cached) return cached;

  // L2: PostgreSQL
  try {
    await initDB();
    const dbResult = await pool.query(
      "SELECT embedding FROM embedding_cache WHERE text_hash = $1",
      [hash],
    );
    if (dbResult.rows.length > 0) {
      const emb = parseVector(dbResult.rows[0].embedding);
      if (emb.length > 0) {
        lru.set(hash, emb);
        return emb;
      }
    }
  } catch {
    // DB 不可用时降级，直接调 API
  }

  // L3: API
  const openai = getOpenAI();
  const result = await openai.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });
  const embedding = result.data[0].embedding;

  // 写入两级缓存
  lru.set(hash, embedding);
  try {
    await pool.query(
      "INSERT INTO embedding_cache (text_hash, text, embedding) VALUES ($1, $2, $3::vector) ON CONFLICT (text_hash) DO NOTHING",
      [hash, text, formatVector(embedding)],
    );
  } catch {
    // DB 写入失败不影响主流程
  }

  return embedding;
}

/** 批量获取 embedding，hit 的走缓存，miss 的批量调 API */
export async function getEmbeddings(
  texts: string[],
  model = "BAAI/bge-m3",
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const hashes = await Promise.all(texts.map(sha256));
  const result: (number[] | null)[] = new Array(texts.length).fill(null);
  const missIndices: number[] = [];
  const missTexts: string[] = [];
  const missHashes: string[] = [];

  // 先查 LRU
  for (let i = 0; i < texts.length; i++) {
    const emb = lru.get(hashes[i]);
    if (emb) {
      result[i] = emb;
    } else {
      missIndices.push(i);
      missTexts.push(texts[i]);
      missHashes.push(hashes[i]);
    }
  }

  // 再查 DB
  if (missIndices.length > 0) {
    try {
      await initDB();
      const dbResult = await pool.query(
        "SELECT text_hash, embedding FROM embedding_cache WHERE text_hash = ANY($1::text[])",
        [missHashes],
      );
      const dbMap = new Map<string, number[]>();
      for (const row of dbResult.rows) {
        const emb = parseVector(row.embedding);
        if (emb.length > 0) dbMap.set(row.text_hash, emb);
      }

      // 填充 DB 命中项
      const stillMiss: number[] = [];
      const stillMissTexts: string[] = [];
      const stillMissHashes: string[] = [];
      for (let i = 0; i < missIndices.length; i++) {
        const emb = dbMap.get(missHashes[i]);
        if (emb) {
          result[missIndices[i]] = emb;
          lru.set(missHashes[i], emb);
        } else {
          stillMiss.push(missIndices[i]);
          stillMissTexts.push(missTexts[i]);
          stillMissHashes.push(missHashes[i]);
        }
      }
      missIndices.length = 0;
      missTexts.length = 0;
      missHashes.length = 0;
      missIndices.push(...stillMiss);
      missTexts.push(...stillMissTexts);
      missHashes.push(...stillMissHashes);
    } catch {
      // DB 不可用，全部走 API
    }
  }

  // API 兜底
  if (missIndices.length > 0) {
    const openai = getOpenAI();
    const apiResult = await openai.embeddings.create({
      model,
      input: missTexts,
      encoding_format: "float",
    });

    for (let i = 0; i < missIndices.length; i++) {
      const emb = apiResult.data[i].embedding;
      result[missIndices[i]] = emb;
      lru.set(missHashes[i], emb);

      // 异步写入 DB（不阻塞返回）
      pool
        .query(
          "INSERT INTO embedding_cache (text_hash, text, embedding) VALUES ($1, $2, $3::vector) ON CONFLICT (text_hash) DO NOTHING",
          [missHashes[i], missTexts[i], formatVector(emb)],
        )
        .catch(() => {});
    }
  }

  return result as number[][];
}
