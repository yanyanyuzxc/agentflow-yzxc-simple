import { z } from "zod/v4";
import { saveMemory } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding-cache";
import type { ToolDef } from "./base";

const SaveMemoryInput = z.object({
  name: z.string().describe("短标识，如 'prefer-class'"),
  content: z.string().describe("一句话事实，如 '用户偏好将代码封装为 class'"),
  type: z.enum(["preference", "identity", "project", "fact"])
    .describe("preference=偏好 | identity=身份 | project=项目约束 | fact=学到的事实"),
});

type SaveMemoryInput = z.infer<typeof SaveMemoryInput>;

/** save_memory 工具工厂 — 需要 userId 做数据隔离 */
export function createSaveMemoryTool(userId: number, embeddingModel = "BAAI/bge-m3"): ToolDef<SaveMemoryInput> {
  return {
    name: "save_memory",
    description:
      "保存一条关于用户或项目的持久事实。只有当用户明确透露了能在后续对话中复用的新信息时才调用。" +
      "不要调用来记录临时问题或一次性任务。",
    schema: SaveMemoryInput,

    async call({ name, content, type }) {
      // 为记忆内容生成 embedding，支持后续语义搜索
      const embedding = await getEmbedding(content, embeddingModel);
      await saveMemory(userId, name, content, type, embedding);
      return `已记住：${content}`;
    },
  };
}
