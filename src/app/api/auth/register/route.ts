import { createUser, getUserByEmail } from "@/lib/db";
import { JwtService, PasswordService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { RegisterInput, parseBody } from "@/lib/schemas";
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
}
