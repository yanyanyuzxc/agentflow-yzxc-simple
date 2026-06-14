import { chunkText } from '@/lib/rag'
import { EmbeddingInput, parseBody } from '@/lib/schemas'
import { getOpenAI } from '@/lib/llm'
import { resOk, resErr } from '@/lib/resp'

export async function POST(request: Request) {
  try {
    const openai = getOpenAI();
    const body = await parseBody(request, EmbeddingInput);

    const chunks = chunkText(body.text, { chunkSize: body.chunkSize, overlap: body.overlap })
    if (chunks.length === 1) {
      const embedding = await openai.embeddings.create({
        model: 'BAAI/bge-m3',
        input: chunks[0].text,
        encoding_format: 'float',
      })

      return resOk({
        embedding: embedding.data[0].embedding,
        dimensions: embedding.data[0].embedding.length,
        model: embedding.model,
        totalChunks: 1,
      })
    }

    const inputs = chunks.map((c) => c.text)
    const result = await openai.embeddings.create({
      model: 'BAAI/bge-m3',
      input: inputs,
      encoding_format: 'float',
    })

    return resOk({
      model: result.model,
      dimensions: result.data[0].embedding.length,
      totalChunks: chunks.length,
      chunks: chunks.map((chunk, i) => ({
        index: chunk.index,
        text: chunk.text,
        estimatedTokens: chunk.estimatedTokens,
        embedding: result.data[i].embedding,
      })),
    })
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('生成 embedding 失败:', error)
    return resErr(500, '生成向量失败，请检查 API 密钥和网络连接')
  }
}
