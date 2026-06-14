/**
 * 简单的结构化日志 + AsyncLocalStorage 传递 requestId。
 * 每次请求生成一个 traceId，所有下游日志自动带上。
 */

import { AsyncLocalStorage } from "async_hooks";

interface TraceContext {
  traceId: string;
  method: string;
  path: string;
}

const ctx = new AsyncLocalStorage<TraceContext>();

export function getTrace(): TraceContext | undefined {
  return ctx.getStore();
}

export function getTraceId(): string {
  return ctx.getStore()?.traceId ?? "-";
}

/** 包装一个请求处理函数，注入 trace 上下文 */
export function withTrace<T>(
  method: string,
  path: string,
  fn: () => Promise<T>,
): Promise<T> {
  const traceId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return ctx.run({ traceId, method, path }, fn);
}

type LogLevel = "info" | "warn" | "error";

function log(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
  const t = ctx.getStore();
  const entry = {
    ts: new Date().toISOString(),
    level,
    traceId: t?.traceId ?? "-",
    method: t?.method ?? "-",
    path: t?.path ?? "-",
    msg,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>) {
    log("info", msg, meta);
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    log("warn", msg, meta);
  },
  error(msg: string, meta?: Record<string, unknown>) {
    log("error", msg, meta);
  },
  /** 计时工具：返回 stop 函数，调用后记录耗时 */
  time(label: string) {
    const start = performance.now();
    return (extra?: Record<string, unknown>) => {
      log("info", label, { durationMs: Math.round(performance.now() - start), ...extra });
    };
  },
};
