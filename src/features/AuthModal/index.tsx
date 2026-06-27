"use client";

import { LogIn } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useAuthModal } from "./hooks/useAuthModal";
import { LoginForm } from "./components/LoginForm";
import { RegisterForm } from "./components/RegisterForm";
import { AUTH_TABS } from "./config";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const {
    mode,
    setMode,
    loading,
    error,
    setError,
    handleLogin,
    handleRegister,
  } = useAuthModal(onClose);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <LogIn className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
          AI Agent 工作台
        </div>
      }
    >
      {/* Tabs */}
      <div
        className="flex p-0.5 rounded-lg gap-0.5 mb-4"
        style={{ background: "var(--bg-hover)" }}
      >
        {AUTH_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMode(tab.key); setError(null); }}
            className="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
            style={
              mode === tab.key
                ? {
                    background: "var(--bg-panel)",
                    color: "var(--brand-600)",
                    boxShadow: "var(--shadow-sm)",
                  }
                : { color: "var(--text-tertiary)" }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>


      {error && (
        <div className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-200">
          {error}
        </div>
      )}
      
      {
        /* 登录表单 */
      }
      {/* Forms */}
      {mode === "login" ? (
        <LoginForm onSubmit={handleLogin} loading={loading} />
      ) : (
        <RegisterForm onSubmit={handleRegister} loading={loading} />
      )}
    </Modal>
  );
}
