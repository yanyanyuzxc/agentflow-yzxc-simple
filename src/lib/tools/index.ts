import type { StructuredTool } from "@langchain/core/tools";
import { buildTool, type ToolDef } from "./base";
import { getTimeTool } from "./get-time";
import { createSearchDocsTool } from "./search-docs";
import { createSaveMemoryTool } from "./save-memory";
import { webSearchTool } from "./web-search";
import { runPythonTool } from "./run-python";

// ==================== 导出 ====================

export { buildTool } from "./base";
export type { ToolDef } from "./base";
export { getTimeTool } from "./get-time";
export { createSearchDocsTool } from "./search-docs";
export { createSaveMemoryTool } from "./save-memory";
export { webSearchTool } from "./web-search";
export { runPythonTool } from "./run-python";

// ==================== ToolRegistry ====================

/** 工具工厂：可以是静态 ToolDef 或动态工厂函数 */
type ToolSource = ToolDef<any> | ((userId: number) => ToolDef<any>);

/**
 * ToolRegistry — 工具注册表。
 *
 * 管理所有工具的生命周期：注册 → 构建 → 注入 Agent。
 * 不关心 Agent 内部细节，只负责产出 LangChain StructuredTool 数组。
 *
 * @example
 * const registry = ToolRegistry.default()
 *   .register(myCustomTool)
 *   .register((uid) => createScopedTool(uid));
 *
 * const tools = registry.build(userId);
 */
export class ToolRegistry {
  private sources: ToolSource[] = [];

  /** 注册一个工具（静态 ToolDef 或动态工厂） */
  register(source: ToolSource): this {
    this.sources.push(source);
    return this;
  }

  /** 为指定用户构建 LangChain 工具列表 */
  build(userId: number): StructuredTool[] {
    return this.sources.map((src) => {
      const def = typeof src === "function" ? src(userId) : src;
      return buildTool(def);
    });
  }

  // ==================== 默认实例 ====================

  private static _default: ToolRegistry | null = null;

  /** 默认注册表（内置 get_time + search_docs） */
  static default(): ToolRegistry {
    if (!ToolRegistry._default) {
      ToolRegistry._default = new ToolRegistry()
        .register(getTimeTool)
        .register(webSearchTool)
        .register(runPythonTool)
        .register((uid) => createSearchDocsTool(uid))
        .register((uid) => createSaveMemoryTool(uid));
    }
    return ToolRegistry._default;
  }

  /** 重置默认实例（测试用） */
  static resetDefault(): void {
    ToolRegistry._default = null;
  }
}
