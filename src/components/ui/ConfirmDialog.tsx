export function ConfirmDialog({
  open,
  title = "确认操作",
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="rounded-xl p-6 shadow-xl max-w-sm mx-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-subtle)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </p>
        {description && (
          <p className="text-xs mt-1.5" style={{ color: "var(--text-tertiary)" }}>
            {description}
          </p>
        )}
        <div className="flex gap-2.5 mt-4 justify-end">
          <button
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
