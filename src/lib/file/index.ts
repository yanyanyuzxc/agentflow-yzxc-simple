export { FileProcessor, type SupportedFileType } from "./processor";

// ==================== 向后兼容：函数式 API ====================

import { FileProcessor, type SupportedFileType } from "./processor";

const defaultProcessor = new FileProcessor();

/** @deprecated 请使用 new FileProcessor().getType() */
export const getFileType = (filename: string): SupportedFileType | null =>
  defaultProcessor.getType(filename);

/** @deprecated 请使用 new FileProcessor().isSupported() */
export const isFileTypeSupported = (filename: string): boolean =>
  defaultProcessor.isSupported(filename);

/** @deprecated 请使用 new FileProcessor().parse() */
export const parseFile = (filePath: string, type: SupportedFileType): Promise<string> =>
  defaultProcessor.parse(filePath, type);
