import type { User } from "@/types/models";
import { createStore } from "./middleware/createStore";

interface UserState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface UserActions {
  setAuth: (token: string, user: User) => void;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export type UserStore = UserState & UserActions;

export const useUserStore = createStore<UserStore>({
  name: "user",
  persist: {
    name: "chat-user",
    partialize: (s) => ({ token: s.token, user: s.user, isAuthenticated: s.isAuthenticated }),
  },
})((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: (token, user) => set({ token, user, isAuthenticated: true }, false, "setAuth"),
  setToken: (token) => set({ token, isAuthenticated: true }, false, "setToken"),
  setUser: (user) => set({ user }, false, "setUser"),
  logout: () => set({ user: null, token: null, isAuthenticated: false }, false, "logout"),
}));

export const getUserStore = (): UserStore => useUserStore.getState();
