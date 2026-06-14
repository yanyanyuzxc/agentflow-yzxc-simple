import { pool } from "./pool";
import { initDB } from "./pool";

export interface StoredConversation {
  id: number;
  user_id: number;
  thread_id: string;
  title: string;
  pinned: boolean;
  tags: string[];
  message_count: number;
  created_at: string;
  updated_at: string;
}

export async function createConversation(
  userId: number,
  threadId: string,
  title?: string,
): Promise<StoredConversation> {
  await initDB();
  const result = await pool.query(
    `INSERT INTO conversations (user_id, thread_id, title)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, thread_id, title, pinned, tags, created_at, updated_at`,
    [userId, threadId, title || "新对话"],
  );
  return { ...result.rows[0], message_count: 0 };
}

export async function listConversations(
  userId: number,
): Promise<StoredConversation[]> {
  await initDB();
  const result = await pool.query(
    `SELECT c.*, COUNT(m.id)::int AS message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.updated_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function getConversation(
  userId: number,
  id: number,
): Promise<StoredConversation | null> {
  await initDB();
  const result = await pool.query(
    `SELECT c.*, COUNT(m.id)::int AS message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.id = $1 AND c.user_id = $2
     GROUP BY c.id`,
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function getConversationByThreadId(
  userId: number,
  threadId: string,
): Promise<StoredConversation | null> {
  await initDB();
  const result = await pool.query(
    `SELECT c.*, COUNT(m.id)::int AS message_count
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.thread_id = $1 AND c.user_id = $2
     GROUP BY c.id`,
    [threadId, userId],
  );
  return result.rows[0] ?? null;
}

export async function deleteConversation(
  userId: number,
  id: number,
): Promise<boolean> {
  await initDB();
  const result = await pool.query(
    "DELETE FROM conversations WHERE id = $1 AND user_id = $2",
    [id, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function updateConversation(
  userId: number,
  id: number,
  fields: { title?: string; pinned?: boolean; tags?: string[] },
): Promise<StoredConversation | null> {
  await initDB();
  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (fields.title !== undefined) {
    sets.push(`title = $${i++}`);
    vals.push(fields.title);
  }
  if (fields.pinned !== undefined) {
    sets.push(`pinned = $${i++}`);
    vals.push(fields.pinned);
  }
  if (fields.tags !== undefined) {
    sets.push(`tags = $${i++}`);
    vals.push(fields.tags);
  }
  if (sets.length === 0) return getConversation(userId, id);

  sets.push("updated_at = NOW()");
  vals.push(id);
  vals.push(userId);

  const result = await pool.query(
    `UPDATE conversations SET ${sets.join(", ")} WHERE id = $${i++} AND user_id = $${i}
     RETURNING id, user_id, thread_id, title, pinned, tags, created_at, updated_at`,
    vals,
  );
  if (result.rows.length === 0) return null;

  const conv = result.rows[0];
  const countResult = await pool.query(
    "SELECT COUNT(*)::int FROM messages WHERE conversation_id = $1",
    [id],
  );
  return { ...conv, message_count: countResult.rows[0].count };
}
