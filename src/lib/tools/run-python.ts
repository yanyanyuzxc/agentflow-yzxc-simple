import { z } from "zod/v4";
import type { ToolDef } from "./base";
import { runPython } from "@/lib/sandbox/runner";

const RunPythonInput = z.object({
  code: z
    .string()
    .min(1)
    .describe(
      "要执行的 Python 代码。用 print() 输出结果。" +
        "画图时用 plt.savefig('chart.png') 保存，图片会自动返回。" +
        "超时 10 秒，内存 256MB。",
    ),
});
type RunPythonInput = z.infer<typeof RunPythonInput>;

/** Python 沙箱执行警告（注入到工具返回中，提醒 LLM） */
const WARNING = [
  "CRITICAL - read this:",
  "- The sandbox has NO internet access — don't try HTTP requests",
  "- Result MUST be PRINTED with print() — last expression is NOT auto-displayed",
  "- Figures: use plt.savefig('name.png'), images are auto-collected",
  "- Timeout: 10 seconds",
].join("\n");

export const runPythonTool: ToolDef<RunPythonInput> = {
  name: "run_python",
  description:
    "在隔离沙箱中执行 Python 代码。用于数据分析、数值计算、图表生成、验证推理。" +
    "支持 numpy, pandas, matplotlib, scipy。无网络访问。" +
    "画图必须 plt.savefig('xxx.png')，不要用 plt.show()。",
  schema: RunPythonInput,

  async call({ code }) {
    // 预处理：确保常见导入可用
    const preamble = [
      "import matplotlib; matplotlib.use('Agg')",
      "import numpy as np",
      "import pandas as pd",
      "import json, math, statistics",
      "",
    ].join("\n");

    const fullCode = preamble + "\n" + code;

    try {
      const result = await runPython(fullCode, 10000);

      const parts: string[] = [WARNING];

      if (result.stdout) {
        if (result.stdout.length > 3000) {
          parts.push(`STDOUT (${result.stdout.length} chars, truncated):\n${result.stdout.slice(0, 3000)}\n...`);
        } else {
          parts.push(`STDOUT:\n${result.stdout}`);
        }
      }

      if (result.stderr) {
        parts.push(`STDERR:\n${result.stderr.slice(0, 1000)}`);
      }

      if (result.images.length > 0) {
        parts.push(
          `Generated ${result.images.length} image(s).` +
            "Tell the user these are available (base64 data URIs).",
        );
        // 只返回第一张图片的 data URI（避免 token 爆炸）
        parts.push(`[image: ${result.images[0].slice(0, 100)}...]`);
      }

      if (result.exitCode !== 0) {
        parts.push(`Exit code: ${result.exitCode} (non-zero indicates error)`);
      }

      if (!result.stdout && result.images.length === 0 && result.exitCode === 0) {
        parts.push("(no output — did you forget print()?)");
      }

      return parts.join("\n");
    } catch (e) {
      return `Python execution failed: ${(e as Error).message}. Check code syntax and timeout.`;
    }
  },
};
