import { useState, useCallback } from "react";
import { authService } from "@/services/authService";
import { notify } from "@/lib/toast";
import type { AuthMode } from "../config";

export function useAuthModal(onSuccess: () => void) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        await authService.login(email, password);
        notify.success("登录成功");
        onSuccess();
      } catch (e) {
        setError(e instanceof Error ? e.message : "登录失败");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  const handleRegister = useCallback(
    async (name: string, email: string, password: string) => {
      setError(null);
      setLoading(true);
      try {
        await authService.register(name, email, password);
        notify.success("注册成功，欢迎！");
        onSuccess();
      } catch (e) {
        setError(e instanceof Error ? e.message : "注册失败");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess],
  );

  return {
    mode,
    setMode,
    loading,
    error,
    setError,
    handleLogin,
    handleRegister,
  };
}
