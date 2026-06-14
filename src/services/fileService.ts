import { apiClient, authHeaders } from "./client";
import { ENDPOINTS } from "./endpoints";
import { getFileStore } from "@/store/file";
import type { FileItem } from "@/types/models";
import type { FileUploadResponse } from "@/types/api";

export const fileService = {
  async list(): Promise<FileItem[]> {
    return apiClient<FileItem[]>(ENDPOINTS.documents.list);
  },

  async upload(file: File): Promise<FileUploadResponse> {
    const store = getFileStore();
    const formData = new FormData();
    formData.append("file", file);

    store.setUploading(true);
    store.setUploadProgress(0);

    try {
      const res = await fetch(ENDPOINTS.upload, {
        method: "POST",
        headers: await authHeaders(),
        body: formData,
      });

      if (!res.ok) throw new Error("上传失败");
      const body = await res.json();
      if (body.code !== 0) throw new Error(body.message ?? "上传失败");
      store.addFile(body.data);
      store.setUploadProgress(100);
      return body.data;
    } finally {
      store.setUploading(false);
    }
  },

  getDownloadUrl(id: number): string {
    return ENDPOINTS.documents.content(id);
  },

  async delete(id: number): Promise<void> {
    await apiClient<void>(ENDPOINTS.documents.detail(id), { method: "DELETE" });
    getFileStore().removeFile(id);
  },
};
