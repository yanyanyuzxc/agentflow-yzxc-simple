import { createStore } from "./middleware/createStore";

interface UIState {
  showLeftPanel: boolean;
  showRightPanel: boolean;
  zenMode: boolean;
  theme: "light" | "dark" | "system";
  dismissedBannerIds: string[];
}

interface UIActions {
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleZenMode: () => void;
  setTheme: (t: UIState["theme"]) => void;
  dismissBanner: (id: string) => void;
}

export type UIStore = UIState & UIActions;

export const useUIStore = createStore<UIStore>({
  name: "ui",
  persist: { name: "chat-ui" },
})((set) => ({
  showLeftPanel: true,
  showRightPanel: true,
  zenMode: false,
  theme: "system" as const,
  dismissedBannerIds: [],

  toggleLeftPanel: () => set((s) => ({ showLeftPanel: !s.showLeftPanel }), false, "toggleLeftPanel"),
  toggleRightPanel: () => set((s) => ({ showRightPanel: !s.showRightPanel }), false, "toggleRightPanel"),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode }), false, "toggleZenMode"),
  setTheme: (theme) => set({ theme }, false, "setTheme"),
  dismissBanner: (id) =>
    set((s) => ({ dismissedBannerIds: [...s.dismissedBannerIds, id] }), false, "dismissBanner"),
}));

export const getUIStore = (): UIStore => useUIStore.getState();
