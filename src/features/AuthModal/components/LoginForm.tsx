"use client";

import { useState, type FormEvent } from "react";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { LoginInput } from "@/lib/schemas";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  loading: boolean;
}

export function LoginForm({ onSubmit, loading }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = LoginInput.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof errors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    onSubmit(email, password);
  };

  const inputClass = (hasError: boolean) =>
    `w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#1a1a22] transition-all
    focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900
    placeholder:text-gray-300 dark:placeholder:text-gray-600
    ${hasError ? "border-red-400 focus:border-red-500" : "border-gray-300 dark:border-gray-700 focus:border-blue-500"}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 邮箱 */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          邮箱
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            type="email"
            required
            autoFocus
            placeholder="name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
            className={inputClass(!!errors.email)}
          />
        </div>
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>

      {/* 密码 */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
          密码
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
          <input
            type={showPw ? "text" : "password"}
            required
            placeholder="至少 6 位"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); }}
            className={inputClass(!!errors.password)}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPw ? (
              <EyeOff className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            ) : (
              <Eye className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            )}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>

      {/* 提交 */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm font-semibold text-white rounded-xl
          bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            登录中...
          </>
        ) : (
          <>
            <LogIn className="w-4 h-4" />
            登录
          </>
        )}
      </button>
    </form>
  );
}
