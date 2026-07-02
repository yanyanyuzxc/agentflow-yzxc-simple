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

export async function updateUser(
  id: number,
  fields: { name?: string; email?: string; avatar?: string | null },
): Promise<StoredUser | null> {
  await initDB();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (fields.name !== undefined) { sets.push(`name = $${i++}`); vals.push(fields.name); }
  if (fields.email !== undefined) { sets.push(`email = $${i++}`); vals.push(fields.email); }
  if (fields.avatar !== undefined) { sets.push(`avatar = $${i++}`); vals.push(fields.avatar); }
  if (sets.length === 0) return getUserById(id);
  vals.push(id);
  const result = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING id, name, email, avatar, created_at`,
    vals,
  );
  return result.rows[0] ?? null;
}

export async function updatePassword(
  id: number,
  newHash: string,
): Promise<boolean> {
  await initDB();
  const result = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE id = $2",
    [newHash, id],
  );
  return (result.rowCount ?? 0) > 0;
}
