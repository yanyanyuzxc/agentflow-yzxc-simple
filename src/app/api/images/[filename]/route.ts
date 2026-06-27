import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

const IMAGES_DIR = join(process.cwd(), "uploads", "images");

const MIME_MAP: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  return MIME_MAP[`.${ext}`] || "application/octet-stream";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // 防目录穿越
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const filePath = join(IMAGES_DIR, filename);
    const buffer = await readFile(filePath);
    const mimeType = getMimeType(filename);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not Found", { status: 404 });
  }
}
