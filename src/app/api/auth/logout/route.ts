import { resOk } from "@/lib/resp";

export async function POST() {
  const headers = new Headers();
  headers.set(
    "Set-Cookie",
    "refresh_token=; HttpOnly; Path=/api/auth; Max-Age=0; SameSite=Strict",
  );
  return resOk(null, 200, { headers });
}
