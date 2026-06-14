import { pool } from "./pool";
import { initDB } from "./pool";

export interface StoredUser {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  created_at: string;
}

export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
): Promise<StoredUser> {
  await initDB();
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, avatar, created_at`,
    [name, email, passwordHash],
  );
  return result.rows[0];
}

export async function getUserByEmail(
  email: string,
): Promise<(StoredUser & { password_hash: string }) | null> {
  await initDB();
  const result = await pool.query(
    "SELECT id, name, email, avatar, created_at, password_hash FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0] ?? null;
}

export async function getUserById(id: number): Promise<StoredUser | null> {
  await initDB();
  const result = await pool.query(
    "SELECT id, name, email, avatar, created_at FROM users WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}
