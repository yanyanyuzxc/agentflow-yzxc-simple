import { describe, it, expect } from "bun:test";
import type { Message } from "@/types/models";

// buildPairs 是纯函数，直接 copy 过来测试
function buildPairs(messages: Message[]): Map<number, number> {
  const pairs = new Map<number, number>();
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

function msg(role: "user" | "assistant", id: number): Message {
  return {
    id,
    conversation_id: 1,
    role,
    content: `content-${id}`,
    created_at: new Date().toISOString(),
  };
}

describe("buildPairs", () => {
  it("空消息返回空 Map", () => {
    expect(buildPairs([]).size).toBe(0);
  });

  it("单对消息正确配对", () => {
    const msgs = [msg("user", 1), msg("assistant", 2)];
    const pairs = buildPairs(msgs);
    expect(pairs.get(1)).toBe(0); // assistant at idx 1 → user at idx 0
  });

  it("多对消息正确配对", () => {
    const msgs = [
      msg("user", 1), msg("assistant", 2),
      msg("user", 3), msg("assistant", 4),
      msg("user", 5), msg("assistant", 6),
    ];
    const pairs = buildPairs(msgs);
    expect(pairs.get(1)).toBe(0); // A₂ → U₁
    expect(pairs.get(3)).toBe(2); // A₄ → U₃
    expect(pairs.get(5)).toBe(4); // A₆ → U₅
  });

  it("连续 assistant 消息不重复配对同一个 user", () => {
    const msgs = [
      msg("user", 1),
      msg("assistant", 2),
      msg("assistant", 3), // 无配对 user
    ];
    const pairs = buildPairs(msgs);
    expect(pairs.get(1)).toBe(0);
    expect(pairs.has(2)).toBe(false); // 没有 user 可配对
  });

  it("只有 user 消息不产生配对", () => {
    const msgs = [msg("user", 1), msg("user", 2)];
    expect(buildPairs(msgs).size).toBe(0);
  });
});
