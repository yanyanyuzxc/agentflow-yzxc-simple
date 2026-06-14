import { toast } from "sonner";

export const notify = {
  success(message: string) {
    toast.success(message);
  },
  error(message: string) {
    toast.error(message);
  },
  info(message: string) {
    toast(message);
  },
  /** API 错误统一处理 */
  apiError(err: unknown, fallback = "操作失败") {
    const msg = err instanceof Error ? err.message : fallback;
    toast.error(msg);
  },
};
