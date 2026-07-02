"use client";

import { User, Mail, Lock, Save, Key, ArrowLeft } from "lucide-react";
import { useUserSettings } from "./hooks/useUserSettings";
import { Button } from "@/components/ui/Button";

export function UserSettings({ onBack }: { onBack: () => void }) {
  const {
    user, name, setName, saving, message, saveProfile,
    currentPassword, setCurrentPassword, newPassword, setNewPassword,
    changingPw, pwMessage, changePassword,
  } = useUserSettings();

  if (!user) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>用户设置</h1>
        </div>

        {/* Profile */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm"
              style={{ background: "var(--gradient-brand)" }}
            >
              {user.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{user.name}</h2>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{user.email}</p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                <User className="w-3 h-3 inline mr-1" />
                昵称
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                <Mail className="w-3 h-3 inline mr-1" />
                邮箱
              </span>
              <input
                type="email"
                value={user.email}
                disabled
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm opacity-60 cursor-not-allowed"
                style={{
                  background: "var(--bg-hover)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              />
            </label>
          </div>

          {message && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: message.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: message.type === "success" ? "#065f46" : "#991b1b",
              }}
            >
              {message.text}
            </div>
          )}

          <Button
            onClick={saveProfile}
            disabled={saving || !name.trim()}
            loading={saving}
            className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 text-sm font-medium"
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            保存
          </Button>
        </section>

        {/* Password */}
        <section
          className="rounded-xl p-5 space-y-4"
          style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)" }}
        >
          <h2 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
            <Key className="w-3.5 h-3.5" />
            修改密码
          </h2>

          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>当前密码</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>新密码（至少 6 位）</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
              />
            </label>
          </div>

          {pwMessage && (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{
                background: pwMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                color: pwMessage.type === "success" ? "#065f46" : "#991b1b",
              }}
            >
              {pwMessage.text}
            </div>
          )}

          <Button
            onClick={changePassword}
            disabled={changingPw || !currentPassword || !newPassword}
            loading={changingPw}
            className="w-full rounded-lg text-sm font-medium"
            style={{
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            修改密码
          </Button>
        </section>
      </div>
    </div>
  );
}
