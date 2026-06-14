"use client";

import { CircleAlert } from "lucide-react";

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  message = "加载失败",
  onRetry,
  className = "",
}: ErrorDisplayProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-10 px-4 text-center ${className}`}>
      <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <CircleAlert className="w-5 h-5 text-red-400" />
      </div>
      <p className="text-sm font-medium text-red-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors"
        >
          重新加载
        </button>
      )}
    </div>
  );
}
