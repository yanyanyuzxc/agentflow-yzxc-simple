const isBrowser = typeof window !== "undefined";

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiResponse<T> {
  code: number;
  data: T;
  message?: string;
  details?: unknown;
}

async function getToken(): Promise<string | null> {
  if (!isBrowser) return null;
  const { getUserStore } = await import("@/store/user");
  return getUserStore().token;
}

function buildHeaders(token: string | null, extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) headers[k] = v;
    } else {
      Object.assign(headers, extra);
    }
  }

  return headers;
}

export async function apiClient<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const token = await getToken();

  async function doFetch(t: string | null): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...buildHeaders(t, options?.headers),
        },
      });

      // 先按 HTTP 状态码判断 401，避免 res.json() 解析失败
      if (res.status === 401) {
        return { code: 401, data: null as T, message: "未登录" };
      }

      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  let body = await doFetch(token);

  // 401 → 尝试 refresh → 重试一次
  if (body.code === 401 && token) {
    const { authService } = await import("./authService");
    try {
      await authService.refresh();
      const newToken = await getToken();
      if (newToken) {
        body = await doFetch(newToken);
      }
    } catch {
      // refresh 失败，使用明确的消息
      body = { code: 401, data: null as T, message: "登录已过期，请重新登录" };
    }
  }

  if (body.code !== 0) {
    throw new ApiError(body.code!, body.message ?? "请求失败", body.details);
  }

  return body.data as T;
}

/** 构建带 JWT 的请求头（不含 Content-Type），供 fetchEventSource / upload 使用 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
