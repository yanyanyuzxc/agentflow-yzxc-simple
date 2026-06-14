"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = "" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={[
          "relative w-full max-w-md mx-4 rounded-2xl shadow-lg",
          "bg-white border border-gray-200",
          "animate-[message-in_0.2s_cubic-bezier(0.16,1,0.3,1)]",
          className,
        ].join(" ")}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-2">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
        )}
        <div className="px-6 pb-5 pt-1">{children}</div>
      </div>
    </div>
  );
}
