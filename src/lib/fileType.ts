/** 文件类型 → 视觉样式映射 */
export interface FileTypeStyle {
  bg: string;
  color: string;
  icon: string;
}

export const FILE_TYPE_STYLES: Record<string, FileTypeStyle> = {
  txt: { bg: "#dbeafe", color: "#1d4ed8", icon: "📝" },
  md: { bg: "#dcfce7", color: "#15803d", icon: "📝" },
  markdown: { bg: "#dcfce7", color: "#15803d", icon: "📝" },
  pdf: { bg: "#fee2e2", color: "#b91c1c", icon: "📕" },
  docx: { bg: "#dbeafe", color: "#1d4ed8", icon: "📘" },
};

export const DEFAULT_FILE_STYLE: FileTypeStyle = {
  bg: "var(--bg-hover)",
  color: "var(--text-secondary)",
  icon: "📄",
};

export function getFileTypeStyle(fileType: string | undefined | null): FileTypeStyle {
  return FILE_TYPE_STYLES[fileType ?? ""] ?? DEFAULT_FILE_STYLE;
}

// ==================== 上传相关 ====================

export const UPLOAD_ACCEPT_TYPES = ".txt,.md,.markdown,.pdf,.docx";

export const UPLOAD_MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const SUPPORTED_FILE_EXTS = [".txt", ".md", ".markdown", ".pdf", ".docx"] as const;

export function isExtSupported(filename: string): boolean {
  const ext = "." + filename.split(".").pop()?.toLowerCase();
  return SUPPORTED_FILE_EXTS.includes(ext as typeof SUPPORTED_FILE_EXTS[number]);
}

export type UploadUiState = "idle" | "uploading" | "success" | "error";
