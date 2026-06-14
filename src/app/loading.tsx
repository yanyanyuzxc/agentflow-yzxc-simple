export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-[3px] border-purple-400/30 border-t-purple-500 animate-spin" />
        <span className="text-sm" style={{ color: "var(--text-tertiary)" }}>加载中</span>
      </div>
    </div>
  );
}
