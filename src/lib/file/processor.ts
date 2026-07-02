import { readFile } from "fs/promises";
import { extname } from "path";
import { decode as iconvDecode } from "iconv-lite";

// ==================== 类型 ====================

export type SupportedFileType = "txt" | "md" | "pdf" | "docx";

const SUPPORTED_TYPES: Record<string, SupportedFileType> = {
  ".txt": "txt",
  ".md": "md",
  ".markdown": "md",
  ".pdf": "pdf",
  ".docx": "docx",
};

// ==================== 文本解码 ====================

function decodeText(buf: Buffer): string {
  const utf8 = buf.toString("utf-8");
  if (!utf8.includes("�")) return utf8;
  return iconvDecode(buf, "gbk");
}

// ==================== FileProcessor ====================

/**
 * FileProcessor — 文件类型检测 + 内容解析。
 *
 * 统一管理支持的文件格式，消除 fileParser / fileType 中的重复检测逻辑。
 *
 * @example
 * const fp = new FileProcessor();
 * const type = fp.getType("doc.pdf");      // "pdf"
 * const ok = fp.isSupported("doc.pdf");    // true
 * const content = await fp.parse("/uploads/doc.pdf", "pdf");
 */
export class FileProcessor {
  /** 获取精确文件类型（后端用） */
  getType(filename: string): SupportedFileType | null {
    const ext = extname(filename).toLowerCase();
    return SUPPORTED_TYPES[ext] ?? null;
  }

  /** 检查扩展名是否受支持（前端 + 后端通用） */
  isSupported(filename: string): boolean {
    return this.getType(filename) !== null;
  }

  /** 支持的上传 accept 字符串 */
  get acceptTypes(): string {
    return ".txt,.md,.markdown,.pdf,.docx";
  }

  /** 支持的扩展名列表 */
  get supportedExtensions(): readonly string[] {
    return Object.keys(SUPPORTED_TYPES);
  }

  /**
   * 解析文件内容为纯文本。
   * - txt/md → 自动检测 UTF-8/GBK 编码
   * - pdf → pdf-parse 提取文本
   */
  async parse(filePath: string, type: SupportedFileType): Promise<string> {
    switch (type) {
      case "txt":
      case "md": {
        const buf = await readFile(filePath);
        return decodeText(buf);
      }
      case "pdf": {
        const buf = await readFile(filePath);
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ data: buf });
        const result = await parser.getText();
        return result.text;
      }
      case "docx": {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
    }
  }
}
