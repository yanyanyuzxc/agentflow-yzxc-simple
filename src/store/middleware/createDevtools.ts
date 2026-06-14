import type { StateCreator } from "zustand";
import { devtools as zustandDevtools } from "zustand/middleware";

/**
 * 创建 devtools 中间件工厂。
 * 仅在 URL 包含 ?debug=<name> 时启用，避免生产环境开销。
 */
export function createDevtools(name: string) {
  let enabled = false;

  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    enabled = url.searchParams.get("debug")?.includes(name) ?? false;
  }

  return function <T>(initializer: StateCreator<T, [["zustand/devtools", never]], []>) {
    if (!enabled) return initializer;
    return zustandDevtools(initializer, { name: `chat_${name}` }) as StateCreator<T, [], []>;
  };
}
