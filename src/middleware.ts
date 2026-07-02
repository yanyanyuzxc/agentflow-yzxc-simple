import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { getEnv } from "@/lib/env";
import { resErr } from "@/lib/resp";
import { logger } from "@/lib/log";

const ACCESS_SECRET = new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);

async function verifyToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET);
    const sub = payload.sub;
    return sub ? Number(sub) : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;

  // 白名单：auth 接口和图片服务不需要 JWT
  if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/images/")) {
    const res = NextResponse.next();
    logger.info(`[api] ${request.method} ${pathname} ${res.status} ${Date.now() - start}ms`);
    return res;
  }

  // 只拦截 API 路由
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const auth = request.headers.get("Authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    logger.warn(`[api] ${request.method} ${pathname} 401 ${Date.now() - start}ms (未登录)`);
    return resErr(401, "未登录");
  }

  const userId = await verifyToken(token);
  if (!userId) {
    logger.warn(`[api] ${request.method} ${pathname} 401 ${Date.now() - start}ms (token无效)`);
    return resErr(401, "token 无效或已过期");
  }

  const res = NextResponse.next();
  res.headers.set("x-user-id", String(userId));
  logger.info(`[api] ${request.method} ${pathname} ${res.status} ${Date.now() - start}ms uid=${userId}`);
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
