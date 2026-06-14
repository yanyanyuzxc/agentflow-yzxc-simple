export type AuthMode = "login" | "register";

export const AUTH_TABS: { key: AuthMode; label: string }[] = [
  { key: "login", label: "登录" },
  { key: "register", label: "注册" },
];
