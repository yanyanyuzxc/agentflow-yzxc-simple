import { apiClient } from "./client";
import { ENDPOINTS } from "./endpoints";
import { getUserStore } from "@/store/user";
import type { User } from "@/types/models";

interface AuthResponse {
  user: User;
  token: string;
}

const store = () => getUserStore();

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>(ENDPOINTS.auth.login, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    store().setAuth(data.token, data.user);
    return data;
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>(ENDPOINTS.auth.register, {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    store().setAuth(data.token, data.user);
    return data;
  },

  async refresh(): Promise<AuthResponse> {
    const data = await apiClient<AuthResponse>(ENDPOINTS.auth.refresh, {
      method: "POST",
    });
    store().setAuth(data.token, data.user);
    return data;
  },

  async me(): Promise<User> {
    return apiClient<User>(ENDPOINTS.auth.me);
  },

  async logout(): Promise<void> {
    await fetch(ENDPOINTS.auth.logout, { method: "POST" }).catch(() => {});
    store().logout();
  },
};
