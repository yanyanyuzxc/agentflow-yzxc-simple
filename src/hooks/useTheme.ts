"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "theme";

function getStored(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return (localStorage.getItem(STORAGE_KEY) as "light" | "dark") ?? "light";
}

function apply(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(getStored());
  }, []);

  useEffect(() => {
    apply(theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggle };
}
