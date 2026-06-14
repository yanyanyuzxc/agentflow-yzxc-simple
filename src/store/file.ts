import type { FileItem, FileStatus } from "@/types/models";
import { createStore } from "./middleware/createStore";

interface FileState {
  files: FileItem[];
  uploading: boolean;
  uploadProgress: number;
}

interface FileActions {
  setFiles: (files: FileItem[]) => void;
  addFile: (file: FileItem) => void;
  removeFile: (id: number) => void;
  updateFileStatus: (id: number, status: FileStatus, error?: string) => void;
  setUploading: (v: boolean) => void;
  setUploadProgress: (p: number) => void;
  reset: () => void;
}

export type FileStore = FileState & FileActions;

const initial: FileState = {
  files: [],
  uploading: false,
  uploadProgress: 0,
};

export const useFileStore = createStore<FileStore>({
  name: "file",
  // 不 persist：上传状态是瞬态的
})((set) => ({
  ...initial,

  setFiles: (files) => set({ files }, false, "setFiles"),
  addFile: (file) => set((s) => ({ files: [...s.files, file] }), false, "addFile"),
  removeFile: (id) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== id) }), false, "removeFile"),
  updateFileStatus: (id, status, error) =>
    set(
      (s) => ({ files: s.files.map((f) => (f.id === id ? { ...f, status, error } : f)) }),
      false,
      "updateFileStatus",
    ),
  setUploading: (v) => set({ uploading: v }, false, "setUploading"),
  setUploadProgress: (p) => set({ uploadProgress: p }, false, "setUploadProgress"),
  reset: () => set({ ...initial }, false, "reset"),
}));

export const getFileStore = (): FileStore => useFileStore.getState();
