import type { Message } from "@/types/models";

/** 查找每个 assistant 消息对应的 user 消息 */
export function buildPairs(messages: Message[]): Map<number, number> {
  const pairs = new Map<number, number>(); // assistant_index → user_index
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "assistant") {
      for (let j = i - 1; j >= 0; j--) {
        if (messages[j].role === "user" && ![...pairs.values()].includes(j)) {
          pairs.set(i, j);
          break;
        }
      }
    }
  }
  return pairs;
}
