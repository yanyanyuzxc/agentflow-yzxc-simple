"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <span className="text-2xl">⚠</span>
        </div>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          页面加载出错
        </p>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          {error.message || "未知错误，请刷新重试"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
}
