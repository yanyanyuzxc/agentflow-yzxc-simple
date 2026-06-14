import { SkeletonListItem } from "@/components/ui/Skeleton";

/** 文档列表骨架 — 模拟真实列表项布局 */
export function DocSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="px-2 py-1 space-y-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} avatarSize={36} lines={2} />
      ))}
    </div>
  );
}
