import { createStore } from "./middleware/createStore";

interface UIState {
  showLeftPanel: boolean;
  activePage: "chat" | "knowledge" | "settings";
  theme: "light" | "dark" | "system";
  dismissedBannerIds: string[];
}

interface UIActions {
  toggleLeftPanel: () => void;
  setActivePage: (page: UIState["activePage"]) => void;
  setTheme: (t: UIState["theme"]) => void;
  dismissBanner: (id: string) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = createStore<UIStore>({
  name: "ui",
  persist: { name: "chat-ui" },
})((set) => ({
  showLeftPanel: true,
  activePage: "chat" as const,
  theme: "system" as const,
  dismissedBannerIds: [],

  toggleLeftPanel: () => set((s) => ({ showLeftPanel: !s.showLeftPanel }), false, "toggleLeftPanel"),
  setActivePage: (page) => set({ activePage: page }, false, "setActivePage"),
  setTheme: (theme) => set({ theme }, false, "setTheme"),
  dismissBanner: (id) =>
    set((s) => ({ dismissedBannerIds: [...s.dismissedBannerIds, id] }), false, "dismissBanner"),
}));

export const getUIStore = (): UIStore => useUIStore.getState();
