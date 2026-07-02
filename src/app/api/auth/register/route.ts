import { createUser, getUserByEmail } from "@/lib/db";
import { JwtService, PasswordService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { RegisterInput, parseBody } from "@/lib/schemas";
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

    const body = await parseBody(req, RegisterInput);

    const existing = await getUserByEmail(body.email);
    if (existing) {
      return resErr(409, "该邮箱已注册");
    }

    const passwordHash = await password.hash(body.password);
    const user = await createUser(body.name, body.email, passwordHash);

    const [accessToken, refreshToken] = await Promise.all([
      jwt.signAccess(user.id),
      jwt.signRefresh(user.id),
    ]);

    const headers = new Headers();
    setRefreshCookie(headers, refreshToken);

    return resOk({ user, token: accessToken }, 201, { headers });
  } catch (error) {
    if (error instanceof Response) throw error;
    const msg = (error as Error).message || String(error);
    logger.error("[auth] register failed", { error: msg });
    return resErr(500, `服务器内部错误: ${msg}`);
  }
}
