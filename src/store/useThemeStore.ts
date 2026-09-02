import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BackgroundType = "default" | "color" | "image";

interface ThemeState {
  bgType: BackgroundType;
  bgColor: string;
  bgImageUrl: string;
  setBgType: (type: BackgroundType) => void;
  setBgColor: (color: string) => void;
  setBgImageUrl: (url: string) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      bgType: "default",
      bgColor: "#0f172a",
      bgImageUrl: "",
      setBgType: (type) => set({ bgType: type }),
      setBgColor: (color) => set({ bgColor: color }),
      setBgImageUrl: (url) => set({ bgImageUrl: url }),
      resetTheme: () => set({ bgType: "default", bgColor: "#0f172a", bgImageUrl: "" }),
    }),
    {
      name: "theme-storage",
    }
  )
);
