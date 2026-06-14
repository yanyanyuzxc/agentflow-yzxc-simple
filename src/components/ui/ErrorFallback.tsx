"use client";

import { Component, type ReactNode } from "react";
import { Button } from "./Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  variant?: "alert" | "silent";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    if (this.props.variant === "silent") {
      return (
        <div className="border border-dashed border-red-300 rounded p-2 text-xs text-red-400">
          渲染错误
        </div>
      );
    }

    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-4">
        <p className="text-sm font-medium text-red-800">发生了错误</p>
        <p className="text-xs text-red-600 mt-1">
          {this.state.error?.message}
        </p>
        <Button
          variant="danger"
          size="sm"
          className="mt-2"
          onClick={this.handleRetry}
        >
          重试
        </Button>
      </div>
    );
  }
}
