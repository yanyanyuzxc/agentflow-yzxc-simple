export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <p className="text-6xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          404
        </p>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          页面未找到
        </p>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          你访问的页面不存在或已被移除
        </p>
        <a
          href="/"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
