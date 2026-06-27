import { z } from "zod/v4";
import { getOpenAI } from "@/lib/llm";
import { readFile } from "fs/promises";
import { join } from "path";
import { basename } from "path";
import type { ToolDef } from "./base";

const SeeImageInput = z.object({
  image_url: z.string().min(1).describe("图片URL，来自用户消息中的图片链接"),
  question: z
    .string()
    .optional()
    .describe("关于图片的具体问题（不提供则进行整体描述）"),
});
type SeeImageInput = z.infer<typeof SeeImageInput>;

/** 根据扩展名推测 MIME 类型 */
function detectMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return "image/png";
  }
}

export const seeImageTool: ToolDef<SeeImageInput> = {
  name: "see_image",
  description:
    "理解图片内容。当用户上传了图片（消息中会包含 [用户上传了 N 张图片] 标记和图片URL），" +
    "你需要调用此工具来获取图片的文字描述，然后基于描述回答用户问题。" +
    "支持多张图片时请逐一调用。",
  schema: SeeImageInput,

  async call({ image_url, question }) {
    // 1. 解析图片来源
    let finalUrl: string;

    if (image_url.startsWith("data:")) {
      // 已经是 data URL，直接使用
      finalUrl = image_url;
    } else if (image_url.startsWith("http://") || image_url.startsWith("https://")) {
      // 远程 URL，直接传给 Qwen（硅基流动服务器可访问）
      finalUrl = image_url;
    } else if (image_url.startsWith("/api/images/")) {
      // 本地文件：读磁盘 → base64 data URL
      const filename = basename(image_url);
      // 防目录穿越
      if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
        return "[see_image] 非法的图片路径";
      }
      const filePath = join(process.cwd(), "uploads", "images", filename);
      try {
        const buffer = await readFile(filePath);
        const base64 = buffer.toString("base64");
        const mimeType = detectMimeType(filename);
        finalUrl = `data:${mimeType};base64,${base64}`;
      } catch {
        return `[see_image] 图片文件不存在: ${filename}`;
      }
    } else {
      return `[see_image] 不支持的图片URL格式: ${image_url}`;
    }

    // 2. 调用 Qwen3.5-4B 视觉模型
    const client = getOpenAI();
    const promptText = question || "请详细描述这张图片的内容，包含所有可见的文字、物体、场景和细节。";

    try {
      const response = await client.chat.completions.create({
        model: "Qwen/Qwen3.5-4B",
        messages: [
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: finalUrl } },
              { type: "text", text: promptText },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const description =
        response.choices[0]?.message?.content || "(未能获取图片描述)";

      return `[图片分析结果]\n${description}`;
    } catch (e) {
      return `[see_image] 图片分析失败: ${(e as Error).message}`;
    }
  },
};
