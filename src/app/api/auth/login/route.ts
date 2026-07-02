import { getUserByEmail } from "@/lib/db";
import { JwtService, PasswordService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { LoginInput, parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";
import { checkRate, RateLimits } from "@/lib/rate-limit";
import { logger } from "@/lib/log";

const jwt = new JwtService();
const password = new PasswordService();

function setRefreshCookie(headers: Headers, token: string) {
  headers.set(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Path=/api/auth; Max-Age=${REFRESH_TTL_SECONDS}; SameSite=Strict`,
  );
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRate(`auth:${ip}`, RateLimits.auth)) {
      return Response.json({ code: 429, message: "请求太频繁，请稍后再试" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const body = await parseBody(req, LoginInput);

    const user = await getUserByEmail(body.email);
    if (!user) {
      return resErr(401, "邮箱或密码错误");
    }

    const valid = await password.verify(body.password, user.password_hash);
    if (!valid) {
      return resErr(401, "邮箱或密码错误");
    }

    const [accessToken, refreshToken] = await Promise.all([
      jwt.signAccess(user.id),
      jwt.signRefresh(user.id),
    ]);

    const headers = new Headers();
    setRefreshCookie(headers, refreshToken);

    const { password_hash: _, ...safeUser } = user;
    return resOk({ user: safeUser, token: accessToken }, 200, { headers });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[auth] login failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}
