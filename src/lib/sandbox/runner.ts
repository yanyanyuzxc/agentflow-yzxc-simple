import { exec } from "child_process";
import { writeFile, readFile, readdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

interface RunResult {
  stdout: string;
  stderr: string;
  images: string[]; // base64 data URIs
  exitCode: number | null;
}

/** 在受限 Python 进程中执行代码 */
export async function runPython(
  code: string,
  timeoutMs = 10000,
): Promise<RunResult> {
  const id = randomUUID();
  const tmpDir = join(tmpdir(), `py-sandbox-${id}`);

  // 创建临时目录
  await import("fs/promises").then((fs) => fs.mkdir(tmpDir, { recursive: true }));

  const codeFile = join(tmpDir, "code.py");
  await writeFile(codeFile, code, "utf-8");

  return new Promise((resolve) => {
    const child = exec(
      `python -u "${codeFile}"`,
      {
        cwd: tmpDir,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024, // 1MB
        killSignal: "SIGTERM",
      },
      async (error, stdout, stderr) => {
        // 收集图片
        const images: string[] = [];
        try {
          const files = await readdir(tmpDir);
          for (const f of files) {
            if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".svg")) {
              const buf = await readFile(join(tmpDir, f));
              const ext = f.split(".").pop();
              const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : "png"}`;
              images.push(`data:${mime};base64,${buf.toString("base64")}`);
            }
          }
        } catch {
          // 图片读取失败不影响主流程
        }

        // 清理临时目录
        import("fs/promises").then((fs) =>
          fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {}),
        );

        resolve({
          stdout: stdout?.trim() || "",
          stderr: stderr?.trim() || "",
          images,
          exitCode: error ? (error as any).code ?? 1 : 0,
        });
      },
    );

    // 内存限制：2GB（Windows 不支持 ulimit，仅在超时时 kill）
    // 超时处理在 exec options 中
  });
}
