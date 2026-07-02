import { useState, useCallback } from "react";
import { useUserStore } from "@/store/user";
import { authHeaders } from "@/services/client";

export function useUserSettings() {
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "保存失败" }));
        throw new Error(err.error || "保存失败");
      }
      const updated = await res.json();
      setUser(updated.data);
      setMessage({ type: "success", text: "保存成功" });
    } catch (e) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }, [name, setUser]);

  const changePassword = useCallback(async () => {
    if (!currentPassword || !newPassword) {
      setPwMessage({ type: "error", text: "请填写所有密码字段" });
      return;
    }
    setChangingPw(true);
    setPwMessage(null);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: await authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "修改失败" }));
        throw new Error(err.error || "修改失败");
      }
      setPwMessage({ type: "success", text: "密码修改成功" });
      setCurrentPassword("");
      setNewPassword("");
    } catch (e) {
      setPwMessage({ type: "error", text: (e as Error).message });
    } finally {
      setChangingPw(false);
    }
  }, [currentPassword, newPassword]);

  return {
    user,
    name, setName,
    saving, message, saveProfile,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    changingPw, pwMessage, changePassword,
  };
}
