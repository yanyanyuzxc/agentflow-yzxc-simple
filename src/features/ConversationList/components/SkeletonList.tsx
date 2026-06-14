import { SkeletonListItem } from "@/components/ui/Skeleton";

/** 对话列表骨架 — 模拟真实列表项布局 */
export function ConvSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} avatarSize={32} lines={2} />
      ))}
    </div>
  );
}
