import { z } from "zod/v4";
import type { ToolDef } from "./base";

/** 获取当前北京时间（无入参，纯函数） */
export const getTimeTool: ToolDef = {
  name: "get_time",
  description: "获取当前北京时间",
  schema: z.object({}),

  async call() {
    return new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });
  },
};
