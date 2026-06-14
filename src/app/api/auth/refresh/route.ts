import { cookies } from "next/headers";
import { getUserById } from "@/lib/db";
import { JwtService, REFRESH_TTL_SECONDS } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";

const jwt = new JwtService();

export async function POST() {
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
}
