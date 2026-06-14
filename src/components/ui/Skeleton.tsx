interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/** 基础骨架块 — 使用自定义 shimmer 动画，亮暗色自动适配 */
export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      style={style}
      className={`skeleton-shimmer rounded ${className}`}
    />
  );
}

export function SkeletonLine({ width = "100%", className = "" }: { width?: string; className?: string }) {
  return <Skeleton className={`h-3.5 ${className}`} style={{ width }} />;
}

export function SkeletonParagraph({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === rows - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 36, className = "" }: { size?: number; className?: string }) {
  return <Skeleton className={`shrink-0 rounded-lg ${className}`} style={{ width: size, height: size }} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={36} />
        <div className="flex-1 space-y-1.5">
          <SkeletonLine width="40%" />
          <SkeletonLine width="25%" />
        </div>
      </div>
      <SkeletonParagraph rows={2} />
    </div>
  );
}

export function SkeletonListItem({
  avatarSize = 36,
  lines = 2,
  className = "",
}: {
  avatarSize?: number;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${className}`}>
      <SkeletonAvatar size={avatarSize} />
      <div className="flex-1 space-y-1.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={i === 0 ? "45%" : "30%"} />
        ))}
      </div>
    </div>
  );
}
