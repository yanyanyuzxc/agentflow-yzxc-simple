import { cookies } from "next/headers";
import { getUserById } from "@/lib/db";
import { JwtService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { checkRate, RateLimits } from "@/lib/rate-limit";
import { logger } from "@/lib/log";

const jwt = new JwtService();

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRate(`auth:${ip}`, RateLimits.auth)) {
      return Response.json({ code: 429, message: "请求太频繁，请稍后再试" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("refresh_token")?.value;
    if (!token) {
      return resErr(401, "未登录");
    }

    const payload = await jwt.verifyRefresh(token);
    if (!payload) {
      return resErr(401, "登录已过期，请重新登录");
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return resErr(401, "用户不存在");
    }

    const [newAccess, newRefresh] = await Promise.all([
      jwt.signAccess(user.id),
      jwt.signRefresh(user.id),
    ]);

    const headers = new Headers();
    headers.set(
      "Set-Cookie",
      `refresh_token=${newRefresh}; HttpOnly; Path=/api/auth; Max-Age=${REFRESH_TTL_SECONDS}; SameSite=Strict`,
    );

    return resOk({ user, token: newAccess }, 200, { headers });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[auth] refresh failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}
