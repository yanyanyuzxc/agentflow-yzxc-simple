import { NextResponse } from "next/server";

const JSON_TYPE = { "Content-Type": "application/json" };

function mergeHeaders(extra?: Headers): Headers {
  const h = new Headers(JSON_TYPE);
  if (extra) extra.forEach((v, k) => h.set(k, v));
  return h;
}

/**
 * 成功响应。
 * @param data      响应数据体
 * @param status    HTTP 状态码（默认 200，创建类接口传 201）
 * @param extra     额外配置（如自定义 headers — 常用于 Set-Cookie）
 */
export function resOk<T>(data: T, status = 200, extra?: { headers?: Headers }) {
  return NextResponse.json({ code: 0, data }, { status, headers: mergeHeaders(extra?.headers) });
}

/**
 * 失败响应。
 * @param code     HTTP 状态码（也是业务错误码）
 * @param message  错误描述（中文）
 * @param details  可选详情（多用于校验失败字段列表）
 * @param extra    额外配置
 */
export function resErr(code: number, message: string, details?: unknown, extra?: { headers?: Headers }) {
  return NextResponse.json({ code, message, details }, { status: code, headers: mergeHeaders(extra?.headers) });
}
