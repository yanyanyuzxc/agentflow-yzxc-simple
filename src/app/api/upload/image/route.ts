import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";
import { ImageUploadInput } from "@/lib/schemas";

const UPLOAD_DIR = join(process.cwd(), "uploads", "images");

function getExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/png": return ".png";
    case "image/jpeg": return ".jpg";
    case "image/gif": return ".gif";
    case "image/webp": return ".webp";
    default: return ".png";
  }
}

export async function POST(request: Request) {
  try {
    const userId = requireAuth(request);
    const formData = await request.formData();
    const parsed = ImageUploadInput.safeParse({ image: formData.get("image") });
    if (!parsed.success) {
      return resErr(400, parsed.error.issues[0].message);
    }
    const file = parsed.data.image;

    // 确保上传目录存在
    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = getExtension(file.type);
    const timestamp = Date.now();
    const shortId = crypto.randomUUID().slice(0, 8);
    const filename = `${timestamp}_${shortId}${ext}`;
    const filePath = join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const url = `/api/images/${filename}`;
    return resOk({ url, name: file.name, size: file.size }, 201);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[upload/image] 上传失败", { error: (error as Error).message });
    return resErr(500, "图片上传失败");
  }
}
