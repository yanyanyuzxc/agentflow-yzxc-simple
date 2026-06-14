import type { ReactNode } from "react";
import { File, Upload, Search } from "lucide-react";

export type KnowledgeTab = "documents" | "upload" | "search";

export interface TabItem {
  key: KnowledgeTab;
  label: string;
  icon: ReactNode;
}

export const KNOWLEDGE_TABS: TabItem[] = [
  { key: "documents", label: "文档", icon: <File className="w-3.5 h-3.5" /> },
  { key: "upload", label: "上传", icon: <Upload className="w-3.5 h-3.5" /> },
  { key: "search", label: "搜索", icon: <Search className="w-3.5 h-3.5" /> },
];
