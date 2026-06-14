import { tool } from "@langchain/core/tools";
import type { StructuredTool } from "@langchain/core/tools";
import type { ZodSchema } from "zod/v4";

/**
 * 工具定义 — 统一的工具工厂接口。
 *
 * 每个工具提供 name / description / schema / call，
 * 由 ToolRegistry 统一注册和生命周期管理。
 */
export interface ToolDef<TInput = Record<string, unknown>> {
  /** 工具名（LLM 用此名调用） */
  name: string;
  /** 工具描述（LLM 据此决定何时调用） */
  description: string;
  /** Zod 入参校验 */
  schema: ZodSchema<TInput>;
  /** 核心逻辑，返回字符串（LangChain 要求） */
  call: (input: TInput) => Promise<string>;
}

/**
 * 将 ToolDef 包装为 LangChain StructuredTool。
 * 统一错误处理：所有异常都转为字符串，不抛给 Agent。
 */
export function buildTool<TInput>(def: ToolDef<TInput>): StructuredTool {
  return tool(
    async (input) => {
      try {
        return await def.call(input as TInput);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `[${def.name}] 执行失败: ${msg}`;
      }
    },
    {
      name: def.name,
      description: def.description,
      schema: def.schema as any,
    },
  );
}
