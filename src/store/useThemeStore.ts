import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BackgroundType = "default" | "color" | "gradient" | "image";

interface ThemeState {
  bgType: BackgroundType;
  bgColor: string;
  bgGradient: string;
  bgImageUrl: string;
  bgImageOpacity: number;
  setBgType: (type: BackgroundType) => void;
  setBgColor: (color: string) => void;
  setBgGradient: (gradient: string) => void;
  setBgImageUrl: (url: string) => void;
  setBgImageOpacity: (opacity: number) => void;
  resetTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      bgType: "default",
      bgColor: "#0f172a",
      bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      bgImageUrl: "",
      bgImageOpacity: 100,
      setBgType: (type) => set({ bgType: type }),
      setBgColor: (color) => set({ bgColor: color }),
      setBgGradient: (gradient) => set({ bgGradient: gradient }),
      setBgImageUrl: (url) => set({ bgImageUrl: url }),
      setBgImageOpacity: (opacity) => set({ bgImageOpacity: opacity }),
      resetTheme: () => set({ bgType: "default", bgColor: "#0f172a", bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", bgImageUrl: "", bgImageOpacity: 100 }),
    }),
    {
      name: "theme-storage",
    }
  )
);
