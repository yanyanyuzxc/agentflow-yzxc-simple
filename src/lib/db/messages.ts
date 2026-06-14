import { pool } from "./pool";
import { initDB } from "./pool";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

export interface StoredMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_calls?: unknown;
  agent_steps?: unknown;
  tokens: number;
  created_at: string;
}

export async function addMessage(
  userId: number,
  msg: {
    conversation_id: number;
    role: string;
    content: string;
    tool_calls?: unknown;
    agent_steps?: unknown;
    tokens?: number;
  },
): Promise<StoredMessage> {
  await initDB();
  // 校验 conversation 归属
  const owner = await pool.query(
    "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
    [msg.conversation_id, userId],
  );
  if (owner.rows.length === 0) throw new Error("会话不存在或无权访问");

  const result = await pool.query(
    `INSERT INTO messages (conversation_id, role, content, tool_calls, agent_steps, tokens)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      msg.conversation_id,
      msg.role,
      msg.content,
      msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
      msg.agent_steps ? JSON.stringify(msg.agent_steps) : null,
      msg.tokens ?? 0,
    ],
  );
  await pool.query(
    "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
    [msg.conversation_id],
  );
  return result.rows[0];
}

export async function getMessages(
  userId: number,
  conversationId: number,
): Promise<StoredMessage[]> {
  await initDB();
  // JOIN 已做数据隔离，不需要额外的所有权查询
  const result = await pool.query(
    "SELECT m.* FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.conversation_id = $1 AND c.user_id = $2 ORDER BY m.created_at ASC",
    [conversationId, userId],
  );
  return result.rows;
}

/** 删除一对消息（human + assistant），中间如有 tool 消息也一并删除 */
export async function deleteMessagePair(
  userId: number,
  conversationId: number,
  messageIds: [number, number],
): Promise<number> {
  await initDB();
  // 校验 conversation 归属
  const owner = await pool.query(
    "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
    [conversationId, userId],
  );
  if (owner.rows.length === 0) throw new Error("会话不存在或无权访问");

  // 按 created_at 排序取这两个消息
  const msgs = await pool.query(
    `SELECT id, role, created_at FROM messages
     WHERE id = ANY($1) AND conversation_id = $2
     ORDER BY created_at ASC`,
    [messageIds, conversationId],
  );
  if (msgs.rows.length !== 2) throw new Error("消息不存在");
  const [a, b] = msgs.rows;
  const roles = [a.role, b.role].sort().join(",");
  if (roles !== "assistant,user")
    throw new Error("必须删除一对 human + assistant 消息");

  // 直接用 ID 删除（不用时间范围，避免 JS Date 毫秒精度 vs PG 微秒精度不匹配）
  const ids = [a.id, b.id];
  const result = await pool.query(
    `DELETE FROM messages
     WHERE id = ANY($1) AND conversation_id = $2`,
    [ids, conversationId],
  );

  await pool.query(
    "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
    [conversationId],
  );

  return result.rowCount ?? 0;
}

/** 回退到指定消息对（删除该对及之后所有消息），返回删除数量 */
export async function rewindToMessage(
  userId: number,
  conversationId: number,
  messageId: number,
): Promise<number> {
  await initDB();
  const owner = await pool.query(
    "SELECT id FROM conversations WHERE id = $1 AND user_id = $2",
    [conversationId, userId],
  );
  if (owner.rows.length === 0) throw new Error("会话不存在或无权访问");

  // 找到目标消息
  const target = await pool.query(
    "SELECT id, created_at FROM messages WHERE id = $1 AND conversation_id = $2",
    [messageId, conversationId],
  );
  if (target.rows.length === 0) throw new Error("消息不存在");

  // 删除该时间点及之后的所有 user/assistant 消息
  const cutoff = target.rows[0].created_at;
  const result = await pool.query(
    `DELETE FROM messages
     WHERE conversation_id = $1
       AND created_at >= $2
       AND role IN ('user', 'assistant')`,
    [conversationId, cutoff],
  );

  await pool.query(
    "UPDATE conversations SET updated_at = NOW() WHERE id = $1",
    [conversationId],
  );

  return result.rowCount ?? 0;
}

/** 将 DB 消息还原为 LangChain BaseMessage 数组（用于重建 Agent 上下文） */
export async function getMessagesAsLangChain(
  userId: number,
  conversationId: number,
): Promise<BaseMessage[]> {
  const stored = await getMessages(userId, conversationId);
  const messages: BaseMessage[] = [];

  for (const m of stored) {
    if (m.role === "user") {
      messages.push(new HumanMessage(m.content));
    } else if (m.role === "assistant") {
      let toolCalls: any[] | undefined;
      if (m.tool_calls) {
        toolCalls =
          typeof m.tool_calls === "string"
            ? JSON.parse(m.tool_calls)
            : m.tool_calls;
      }
      messages.push(
        new AIMessage({
          content: m.content,
          tool_calls: toolCalls,
        }),
      );
    }
  }

  return messages;
}
