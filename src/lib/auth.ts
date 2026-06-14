import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import { resErr } from "@/lib/resp";

// ==================== 常量 ====================

const ACCESS_TTL = "15min";
export const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 天，直接导出常量

function getAccessSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_ACCESS_SECRET);
}

function getRefreshSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_REFRESH_SECRET);
}

// ==================== JwtService ====================

/**
 * JwtService — JWT 令牌签发与校验。
 *
 * 缓存 Encoded Secret，避免每次调用重新编码。
 * 可注入 secret 用于测试。
 */
export class JwtService {
  private accessSecret: Uint8Array;
  private refreshSecret: Uint8Array;

  constructor(secrets?: { access?: Uint8Array; refresh?: Uint8Array }) {
    this.accessSecret = secrets?.access ?? getAccessSecret();
    this.refreshSecret = secrets?.refresh ?? getRefreshSecret();
  }

  /** 签发 Access Token（15min） */
  async signAccess(userId: number): Promise<string> {
    return new SignJWT({ sub: String(userId) })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TTL)
      .sign(this.accessSecret);
  }

  /** 签发 Refresh Token（7d） */
  async signRefresh(userId: number): Promise<string> {
    return new SignJWT({ sub: String(userId) })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
      .sign(this.refreshSecret);
  }

  /** 校验 Access Token，返回 userId 或 null */
  async verifyAccess(token: string): Promise<{ userId: number } | null> {
    try {
      const { payload } = await jwtVerify(token, this.accessSecret);
      const sub = payload.sub;
      if (!sub) return null;
      return { userId: Number(sub) };
    } catch {
      return null;
    }
  }

  /** 校验 Refresh Token，返回 userId 或 null */
  async verifyRefresh(token: string): Promise<{ userId: number } | null> {
    try {
      const { payload } = await jwtVerify(token, this.refreshSecret);
      const sub = payload.sub;
      if (!sub) return null;
      return { userId: Number(sub) };
    } catch {
      return null;
    }
  }
}

// ==================== PasswordService ====================

const ENC = new TextEncoder();

/**
 * PasswordService — PBKDF2 密码哈希与校验。
 *
 * 100,000 次迭代 SHA-256，Edge Runtime 兼容（仅依赖 Web Crypto）。
 */
export class PasswordService {
  /** 生成 "salt:hash" 格式的密码哈希 */
  async hash(password: string): Promise<string> {
    const salt = this.randomSalt();
    const key = await crypto.subtle.importKey(
      "raw", ENC.encode(password), "PBKDF2", false, ["deriveBits"],
    );
    const hash = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: ENC.encode(salt), iterations: 100_000, hash: "SHA-256" },
      key, 256,
    );
    const hashHex = this.toHex(new Uint8Array(hash));
    return `${salt}:${hashHex}`;
  }

  /** 校验密码是否匹配 "salt:hash" */
  async verify(password: string, stored: string): Promise<boolean> {
    const [salt, expectedHash] = stored.split(":");
    if (!salt || !expectedHash) return false;

    const key = await crypto.subtle.importKey(
      "raw", ENC.encode(password), "PBKDF2", false, ["deriveBits"],
    );
    const hash = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: ENC.encode(salt), iterations: 100_000, hash: "SHA-256" },
      key, 256,
    );
    return this.toHex(new Uint8Array(hash)) === expectedHash;
  }

  private randomSalt(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return this.toHex(bytes);
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// ==================== Request Helpers ====================

/** 从 request headers 提取 x-user-id（middleware 注入） */
export function getAuthUserId(req: Request): number | null {
  const uid = req.headers.get("x-user-id");
  return uid ? Number(uid) : null;
}

/** 需要登录时返回 401 */
export function requireAuth(req: Request): number {
  const uid = getAuthUserId(req);
  if (!uid) {
    throw resErr(401, "未登录");
  }
  return uid;
}

// ==================== 向后兼容：函数式 API ====================

const defaultJwt = new JwtService();
const defaultPassword = new PasswordService();

/** @deprecated 请使用 new JwtService().signAccess() */
export const signAccessToken = (userId: number) => defaultJwt.signAccess(userId);

/** @deprecated 请使用 new JwtService().signRefresh() */
export const signRefreshToken = (userId: number) => defaultJwt.signRefresh(userId);

/** @deprecated 请使用 new JwtService().verifyAccess() */
export const verifyAccessToken = (token: string) => defaultJwt.verifyAccess(token);

/** @deprecated 请使用 new JwtService().verifyRefresh() */
export const verifyRefreshToken = (token: string) => defaultJwt.verifyRefresh(token);

/** @deprecated 请使用 REFRESH_TTL_SECONDS 常量 */
export const refreshTokenMaxAge = () => REFRESH_TTL_SECONDS;

/** @deprecated 请使用 new PasswordService().hash() */
export const hashPassword = (password: string) => defaultPassword.hash(password);

/** @deprecated 请使用 new PasswordService().verify() */
export const verifyPassword = (password: string, stored: string) => defaultPassword.verify(password, stored);
