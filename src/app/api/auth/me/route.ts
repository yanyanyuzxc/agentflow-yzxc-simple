import { getUserById } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";

export async function GET(req: Request) {
  const userId = requireAuth(req);
  const user = await getUserById(userId);
  if (!user) {
    return resErr(404, "用户不存在");
  }
  return resOk(user);
}
