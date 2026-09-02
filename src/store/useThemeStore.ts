import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BackgroundType = "default" | "color" | "gradient" | "image";

interface ThemeState {
  bgType: BackgroundType;
  bgColor: string;
  bgGradient: string;
  customGrad1: string;
  customGrad2: string;
  customGradAngle: number;
  bgImageUrl: string;
  bgImageOpacity: number;
  textColor: string;
  
  sidebarBgType: BackgroundType;
  sidebarBgColor: string;
  sidebarBgGradient: string;
  sidebarCustomGrad1: string;
  sidebarCustomGrad2: string;
  sidebarCustomGradAngle: number;
  sidebarBgImageUrl: string;
  sidebarBgImageOpacity: number;
  sidebarTextColor: string;

  setBgType: (type: BackgroundType) => void;
  setBgColor: (color: string) => void;
  setBgGradient: (gradient: string) => void;
  setCustomGrad1: (color: string) => void;
  setCustomGrad2: (color: string) => void;
  setCustomGradAngle: (angle: number) => void;
  setBgImageUrl: (url: string) => void;
  setBgImageOpacity: (opacity: number) => void;
  setTextColor: (color: string) => void;

  setSidebarBgType: (type: BackgroundType) => void;
  setSidebarBgColor: (color: string) => void;
  setSidebarBgGradient: (gradient: string) => void;
  setSidebarCustomGrad1: (color: string) => void;
  setSidebarCustomGrad2: (color: string) => void;
  setSidebarCustomGradAngle: (angle: number) => void;
  setSidebarBgImageUrl: (url: string) => void;
  setSidebarBgImageOpacity: (opacity: number) => void;
  setSidebarTextColor: (color: string) => void;
  
  resetTheme: () => void;
}

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isValidHexColor(color: string): boolean {
  if (!color) return true;
  return HEX_COLOR_REGEX.test(color.trim());
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      bgType: "default",
      bgColor: "#0f172a",
      bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      customGrad1: "#667eea",
      customGrad2: "#764ba2",
      customGradAngle: 135,
      bgImageUrl: "",
      bgImageOpacity: 100,
      textColor: "",

      sidebarBgType: "default",
      sidebarBgColor: "#0f172a",
      sidebarBgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      sidebarCustomGrad1: "#667eea",
      sidebarCustomGrad2: "#764ba2",
      sidebarCustomGradAngle: 135,
      sidebarBgImageUrl: "",
      sidebarBgImageOpacity: 100,
      sidebarTextColor: "",

      setBgType: (type) => set({ bgType: type }),
      setBgColor: (color) => set({ bgColor: color }),
      setBgGradient: (gradient) => set({ bgGradient: gradient }),
      setCustomGrad1: (color) => set({ customGrad1: color }),
      setCustomGrad2: (color) => set({ customGrad2: color }),
      setCustomGradAngle: (angle) => set({ customGradAngle: angle }),
      setBgImageUrl: (url) => set({ bgImageUrl: url }),
      setBgImageOpacity: (opacity) => set({ bgImageOpacity: opacity }),
      setTextColor: (color) => {
        const trimmed = (color || "").trim();
        if (!trimmed || HEX_COLOR_REGEX.test(trimmed)) {
          set({ textColor: trimmed });
        }
      },

      setSidebarBgType: (type) => set({ sidebarBgType: type }),
      setSidebarBgColor: (color) => set({ sidebarBgColor: color }),
      setSidebarBgGradient: (gradient) => set({ sidebarBgGradient: gradient }),
      setSidebarCustomGrad1: (color) => set({ sidebarCustomGrad1: color }),
      setSidebarCustomGrad2: (color) => set({ sidebarCustomGrad2: color }),
      setSidebarCustomGradAngle: (angle) => set({ sidebarCustomGradAngle: angle }),
      setSidebarBgImageUrl: (url) => set({ sidebarBgImageUrl: url }),
      setSidebarBgImageOpacity: (opacity) => set({ sidebarBgImageOpacity: opacity }),
      setSidebarTextColor: (color) => {
        const trimmed = (color || "").trim();
        if (!trimmed || HEX_COLOR_REGEX.test(trimmed)) {
          set({ sidebarTextColor: trimmed });
        }
      },

      resetTheme: () => set({ 
        bgType: "default", 
        bgColor: "#0f172a", 
        bgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
        customGrad1: "#667eea",
        customGrad2: "#764ba2",
        customGradAngle: 135,
        bgImageUrl: "", 
        bgImageOpacity: 100,
        textColor: "",
        sidebarBgType: "default", 
        sidebarBgColor: "#0f172a", 
        sidebarBgGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
        sidebarCustomGrad1: "#667eea",
        sidebarCustomGrad2: "#764ba2",
        sidebarCustomGradAngle: 135,
        sidebarBgImageUrl: "", 
        sidebarBgImageOpacity: 100,
        sidebarTextColor: ""
      }),
    }),
    {
      name: "theme-storage",
    }
  )
);
