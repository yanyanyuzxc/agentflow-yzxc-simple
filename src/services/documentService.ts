import { apiClient, authHeaders } from "./client";
import { ENDPOINTS } from "./endpoints";
import type { Document, Chunk } from "@/types/models";
import type {
  DocumentStoreRequest,
  DocumentStoreResponse,
  SearchRequest,
  SearchResponse,
} from "@/types/api";

export interface UploadResponse {
  documentId: number;
  totalChunks: number;
  title: string;
  fileType: string;
  fileSize: number;
}

export interface DocumentContent {
  id: number;
  title: string;
  fileType: string;
  content: string;
  chunkCount: number;
}

export const documentService = {
  async list(): Promise<Document[]> {
    return apiClient<Document[]>(ENDPOINTS.documents.list);
  },

  async get(id: number): Promise<Chunk[]> {
    return apiClient<Chunk[]>(ENDPOINTS.documents.detail(id));
  },

  async getChunks(id: number): Promise<{ chunks: { index: number; text: string; estimatedTokens: number }[] }> {
    return apiClient(ENDPOINTS.documents.chunks(id));
  },

  async getContent(id: number): Promise<DocumentContent> {
    return apiClient<DocumentContent>(ENDPOINTS.documents.content(id));
  },

  async store(data: DocumentStoreRequest): Promise<DocumentStoreResponse> {
    return apiClient<DocumentStoreResponse>(ENDPOINTS.documents.list, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async upload(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(ENDPOINTS.upload, {
      method: "POST",
      headers: await authHeaders(),
      body: formData,
    });
    const body = await res.json();
    if (body.code !== 0) throw new Error(body.message ?? "上传失败");
    return body.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient<void>(ENDPOINTS.documents.detail(id), { method: "DELETE" });
  },

  async search(data: SearchRequest): Promise<SearchResponse> {
    return apiClient<SearchResponse>(ENDPOINTS.search, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
