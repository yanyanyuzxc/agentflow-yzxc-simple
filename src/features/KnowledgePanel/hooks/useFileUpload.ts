import { useState, useCallback } from "react";
import { documentService } from "@/services/documentService";
import { UPLOAD_MAX_SIZE, isExtSupported, type UploadUiState } from "@/lib/fileType";

export function useFileUpload(onComplete: () => void) {
  const [uploadState, setUploadState] = useState<UploadUiState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ title: string; totalChunks: number } | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!isExtSupported(file.name)) {
      setErrorMsg("不支持的文件格式，仅支持 .txt / .md / .pdf");
      setUploadState("error");
      return;
    }
    if (file.size > UPLOAD_MAX_SIZE) {
      setErrorMsg("文件超过 5MB 限制");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setErrorMsg("");

    try {
      const res = await documentService.upload(file);
      setResult({ title: res.title, totalChunks: res.totalChunks });
      setUploadState("success");
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "上传失败");
      setUploadState("error");
    }
  }, [onComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return { uploadState, errorMsg, dragOver, setDragOver, result, handleFile, handleDrop, handleChange };
}
