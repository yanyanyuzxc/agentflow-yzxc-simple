import { create, type StateCreator } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { createDevtools } from "./createDevtools";

interface StoreConfig<T> {
  /** Store 名称，用于 devtools 面板显示（通过 ?debug=name 启用） */
  name: string;
  /** persist 配置 — 不传则不做本地持久化 */
  persist?: Pick<PersistOptions<T, Partial<T>>, "name" | "partialize" | "version">;
  /** 是否启用 immer 中间件（默认 false） */
  immer?: boolean;
}

/**
 * Store 工厂 — 统一注入 devtools / persist / immer。
 */
export function createStore<T>(config: StoreConfig<T>) {
  const devtools = createDevtools(config.name);

  return (initializer: StateCreator<T, [["zustand/devtools", never]], []>) => {
    let fn = initializer as any;
    if (config.immer) fn = immer(fn as any);
    if (config.persist) fn = persist(fn as any, config.persist as any);
    fn = devtools(fn);

    return create<T>()(fn);
  };
}
