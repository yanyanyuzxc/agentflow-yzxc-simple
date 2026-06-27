import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
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
    const file = formData.get("image") as File | null;

    if (!file) return resErr(400, "请选择图片");

    // 校验 MIME 类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return resErr(400, `不支持的图片格式，仅支持 PNG / JPEG / GIF / WebP`);
    }

    // 校验大小
    if (file.size > MAX_FILE_SIZE) {
      return resErr(400, "图片超过 10MB 限制");
    }

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
    console.error("[upload/image] 上传失败:", error);
    return resErr(500, "图片上传失败");
  }
}
