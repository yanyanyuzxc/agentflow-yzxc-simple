"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theme";
type ThemeMode = "system" | "light" | "dark";

function getStored(): ThemeMode {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) ?? "system";
}

function resolveEffective(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function apply(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  const effective = resolveEffective(mode);
  document.documentElement.classList.toggle("dark", effective === "dark");
}

const LABELS: Record<ThemeMode, string> = {
  system: "跟随系统",
  light: "亮色",
  dark: "暗色",
};

const NEXT: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    setMode(getStored());
  }, []);

  useEffect(() => {
    apply(mode);
  }, [mode]);

  // 监听系统主题变化（仅在 system 模式下生效）
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => { if (mode === "system") apply("system"); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((m) => NEXT[m]);
  }, []);

  return { mode, cycle, label: LABELS[mode] };
}
