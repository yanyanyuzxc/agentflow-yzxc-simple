import { describe, it, expect } from "bun:test";
import { checkRate, RateLimits } from "@/lib/rate-limit";

describe("RateLimiter", () => {
  it("允许第一次请求", () => {
    expect(checkRate("test-user-1", { rpm: 10, label: "test" })).toBe(true);
  });

  it("超过限制后拒绝请求", () => {
    const key = "test-user-2";
    // 消耗所有 token
    for (let i = 0; i < 5; i++) {
      checkRate(key, { rpm: 5, label: "test" });
    }
    // 第 6 次应该被拒绝
    expect(checkRate(key, { rpm: 5, label: "test" })).toBe(false);
  });

  it("不同 key 独立计数", () => {
    const a = "user-a";
    const b = "user-b";
    for (let i = 0; i < 4; i++) checkRate(a, { rpm: 4, label: "test" });
    // a 耗尽，b 应该还能通过
    expect(checkRate(a, { rpm: 4, label: "test" })).toBe(false);
    expect(checkRate(b, { rpm: 4, label: "test" })).toBe(true);
  });

  it("预设限流配置正确", () => {
    expect(RateLimits.api.rpm).toBe(60);
    expect(RateLimits.agent.rpm).toBe(10);
  });
});
