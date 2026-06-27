"use client";

import type { StreamingAgentStep } from "@/types/agent";
import { ensureRegistered, getRenderer } from "./toolRenderers";
import DefaultResult from "./toolRenderers/DefaultResult";

// 模块加载时注册所有渲染器
ensureRegistered();

interface ObservationCardProps {
  step: StreamingAgentStep;
  onViewResults?: (step: StreamingAgentStep) => void;
}

/**
 * ObservationCard — 工具结果展示的入口。
 *
 * 按 step.name 查找注册的渲染器，找到则渲染，否则用 DefaultResult 兜底。
 * 新增工具类型的渲染器：在 toolRenderers/index.ts 注册一行即可，无需改此文件。
 */
export function ObservationCard({ step, onViewResults }: ObservationCardProps) {
  const name = step.name || "";
  const Renderer = getRenderer(name) ?? DefaultResult;

  return <Renderer step={step} onViewSearchResults={onViewResults} />;
}
