import type { FC } from "react";
import type { StreamingAgentStep } from "@/types/agent";

/** 工具结果渲染器 — 每个工具一个组件，负责自己的标题、结果展示、三种状态 */
export interface ToolResultRendererProps {
  step: StreamingAgentStep;
  /** web_search 回调：打开 SearchDrawer 查看详情 */
  onViewSearchResults?: (step: StreamingAgentStep) => void;
}

export type ToolResultRenderer = FC<ToolResultRendererProps>;

const registry = new Map<string, ToolResultRenderer>();

/** 注册工具渲染器 */
export function registerRenderer(name: string, renderer: ToolResultRenderer): void {
  registry.set(name, renderer);
}

/** 获取工具渲染器，未注册的返回 null */
export function getRenderer(name: string): ToolResultRenderer | null {
  return registry.get(name) ?? null;
}
