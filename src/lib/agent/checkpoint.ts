import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { pool } from "@/lib/db/pool";
import { logger } from "@/lib/log";

/**
 * CheckpointManager — PostgresSaver 生命周期管理。
 *
 * 单实例懒加载 + 失败降级。reset() 用于测试/重连场景。
 */
export class CheckpointManager {
  private instance: PostgresSaver | null = null;
  private initPromise: Promise<PostgresSaver | null> | null = null;

  constructor(private dbUrl: string) {}

  /** 获取 checkpointer 实例（懒初始化，失败返回 null 并降级为无记忆模式） */
  async get(): Promise<PostgresSaver | null> {
    if (this.instance) return this.instance;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.init();
    return this.initPromise;
  }

  private async init(): Promise<PostgresSaver | null> {
    try {
      const cp = await PostgresSaver.fromConnString(this.dbUrl);
      await cp.setup();
      this.instance = cp;
      return cp;
    } catch (e) {
      console.warn(
        "[Agent] checkpointer 初始化失败，降级为无记忆模式:",
        (e as Error).message,
      );
      return null;
    }
  }

  /** 同步获取（可能为 null，不会触发初始化） */
  getSync(): PostgresSaver | null {
    return this.instance;
  }

  /** 清除指定 thread 的所有 checkpoints（时间旅行用） */
  async clearThread(threadId: string): Promise<void> {
    try {
      // 先用 PostgresSaver 的 deleteThread（清 blobs + writes + checkpoints）
      const cp = await this.get();
      if (cp) {
        await cp.deleteThread(threadId);
        return;
      }
    } catch (e) {
      logger.warn("[Agent] PostgresSaver.deleteThread 失败，使用原始 SQL", { error: (e as Error).message });
    }

    // 降级：直接用 app pool 清
    await pool.query("DELETE FROM checkpoint_writes WHERE thread_id = $1", [threadId]);
    await pool.query("DELETE FROM checkpoint_blobs WHERE thread_id = $1", [threadId]);
    await pool.query("DELETE FROM checkpoints WHERE thread_id = $1", [threadId]);
  }

  /** 重置实例（例如数据库重连后） */
  reset(): void {
    this.instance = null;
    this.initPromise = null;
  }
}
