import { getUserById, updateUser, updatePassword } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { resOk, resErr } from "@/lib/resp";
import { logger } from "@/lib/log";
import { z } from "zod/v4";
import { PasswordService } from "@/lib/auth";

const UpdateProfileInput = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  avatar: z.string().nullable().optional(),
});

const ChangePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "新密码至少 6 位"),
});

export async function GET(req: Request) {
  try {
    const userId = requireAuth(req);
    const user = await getUserById(userId);
    if (!user) return resErr(404, "用户不存在");
    return resOk(user);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[auth] me failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const parsed = UpdateProfileInput.safeParse(body);
    if (!parsed.success) return resErr(400, parsed.error.issues[0].message);

    const updated = await updateUser(userId, parsed.data);
    if (!updated) return resErr(404, "用户不存在");
    return resOk(updated);
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[auth] update profile failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}

export async function PUT(req: Request) {
  try {
    const userId = requireAuth(req);
    const body = await req.json();
    const parsed = ChangePasswordInput.safeParse(body);
    if (!parsed.success) return resErr(400, parsed.error.issues[0].message);

    const pw = new PasswordService();
    const user = await getUserById(userId);
    if (!user) return resErr(404, "用户不存在");

    // verify current password — need full user with hash
    const { getUserByEmail } = await import("@/lib/db");
    const full = await getUserByEmail(user.email);
    if (!full) return resErr(404, "用户不存在");

    const valid = await pw.verify(parsed.data.currentPassword, (full as any).password_hash);
    if (!valid) return resErr(400, "当前密码错误");

    const newHash = await pw.hash(parsed.data.newPassword);
    await updatePassword(userId, newHash);
    return resOk({ ok: true });
  } catch (error) {
    if (error instanceof Response) throw error;
    logger.error("[auth] change password failed", { error: (error as Error).message });
    return resErr(500, "服务器内部错误");
  }
}
