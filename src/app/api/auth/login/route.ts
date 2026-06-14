import { getUserByEmail } from "@/lib/db";
import { JwtService, PasswordService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { LoginInput, parseBody } from "@/lib/schemas";
import { resOk, resErr } from "@/lib/resp";

const jwt = new JwtService();
const password = new PasswordService();

function setRefreshCookie(headers: Headers, token: string) {
  headers.set(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Path=/api/auth; Max-Age=${REFRESH_TTL_SECONDS}; SameSite=Strict`,
  );
}

export async function POST(req: Request) {
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
}
