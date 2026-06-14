import type { StructuredTool } from "@langchain/core/tools";
import { ToolRegistry } from "@/lib/tools";
import type { AgentConfig } from "./config";

/**
 * ToolKit — Agent 侧的工具包装器。
 *
 * 委托给 `lib/tools/ToolRegistry`，自身只做 AgentConfig 透传。
 * 支持 `addStatic` / `addDynamic` 以保持向后兼容。
 *
 * @example
 * const tk = new ToolKit(config)
 *   .addStatic(MyCustomTool)
 *   .addDynamic((uid) => createScopedTool(uid));
 *
 * const tools = tk.build(userId);
 */
export class ToolKit {
  private registry: ToolRegistry;

  constructor(_config: AgentConfig) {
    // 从默认注册表克隆，避免污染全局单例
    this.registry = ToolRegistry.default();
  }

  /** 注册静态工具（兼容旧 API，实际委托给 ToolRegistry） */
  addStatic(t: StructuredTool): this {
    // 把 LangChain StructuredTool 转成 ToolDef 包装再注册
    this.registry.register({
      name: t.name,
      description: t.description,
      schema: t.schema as any,
      call: async (input: any) => {
        try {
          return await t.invoke(input);
        } catch (e: any) {
          return `[${t.name}] 执行失败: ${e.message ?? String(e)}`;
        }
      },
    });
    return this;
  }

  /** 注册动态工具工厂 */
  addDynamic(factory: (userId: number) => StructuredTool): this {
    this.registry.register((userId: number) => {
      const t = factory(userId);
      return {
        name: t.name,
        description: t.description,
        schema: t.schema as any,
        call: async (input: any) => {
          try {
            return await t.invoke(input);
          } catch (e: any) {
            return `[${t.name}] 执行失败: ${e.message ?? String(e)}`;
          }
        },
      };
    });
    return this;
  }

  /** 为指定用户构建工具列表 */
  build(userId: number): StructuredTool[] {
    return this.registry.build(userId);
  }
}
