const BASE = "";

export const ENDPOINTS = {
  auth: {
    login: `${BASE}/api/auth/login`,
    register: `${BASE}/api/auth/register`,
    logout: `${BASE}/api/auth/logout`,
    refresh: `${BASE}/api/auth/refresh`,
    me: `${BASE}/api/auth/me`,
  },

  agent: {
    run: `${BASE}/api/agent`,
    resume: (threadId: string) => `${BASE}/api/agent/${threadId}/resume`,
  },

  conversations: {
    list: `${BASE}/api/conversations`,
    detail: (id: number) => `${BASE}/api/conversations/${id}`,
    messages: (id: number) => `${BASE}/api/conversations/${id}/messages`,
    deleteMessages: (id: number) => `${BASE}/api/conversations/${id}/messages`,
    rewind: (id: number) => `${BASE}/api/conversations/${id}/rewind`,
  },

  documents: {
    list: `${BASE}/api/documents`,
    detail: (id: number) => `${BASE}/api/documents/${id}`,
    chunks: (id: number) => `${BASE}/api/documents/${id}/chunks`,
    content: (id: number) => `${BASE}/api/documents/${id}/content`,
  },

  search: `${BASE}/api/search`,
  embeddings: `${BASE}/api/embeddings`,
  upload: `${BASE}/api/upload`,
} as const;
