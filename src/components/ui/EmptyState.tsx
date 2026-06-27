import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div
          className="mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--gradient-brand-soft)" }}
        >
          <span style={{ color: "var(--brand-500)", opacity: 0.6 }}>{icon}</span>
        </div>
      )}
      <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{title}</p>
      {description && (
        <p className="text-xs mt-1.5 max-w-56 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
