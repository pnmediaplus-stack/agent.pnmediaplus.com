"use client";

import { useState, useEffect } from "react";
import { useThemeStore, type BackgroundType } from "@/store/useThemeStore";
import { useTheme } from "next-themes";
import { Settings, X, Moon, Sun, Monitor, Image as ImageIcon, PaintBucket } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

export function ThemeSettingsModal() {
  const { t } = useI18n("shared");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const { bgType, bgColor, bgImageUrl, setBgType, setBgColor, setBgImageUrl, resetTheme } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
        aria-label="Theme settings"
      >
        <Settings className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cài đặt giao diện</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Theme Mode Toggle */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Chế độ giao diện</label>
                <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                      theme === "light" 
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Sun className="h-4 w-4" /> Sáng
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                      theme === "dark" 
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Moon className="h-4 w-4" /> Tối
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
                      theme === "system" 
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" 
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Monitor className="h-4 w-4" /> Hệ thống
                  </button>
                </div>
              </div>

              {/* Background Setting */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hình nền & Màu sắc</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setBgType("default")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                      bgType === "default" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <Monitor className="h-5 w-5" /> Mặc định
                  </button>
                  <button
                    onClick={() => setBgType("color")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                      bgType === "color" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <PaintBucket className="h-5 w-5" /> Màu sắc
                  </button>
                  <button
                    onClick={() => setBgType("image")}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium transition-all ${
                      bgType === "image" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <ImageIcon className="h-5 w-5" /> Hình ảnh
                  </button>
                </div>
                
                {/* Specific configs */}
                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-200 dark:border-slate-800">
                  {bgType === "default" && (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center">Sử dụng màu nền mặc định của hệ thống.</p>
                  )}
                  {bgType === "color" && (
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={bgColor} 
                        onChange={(e) => setBgColor(e.target.value)} 
                        className="h-10 w-16 cursor-pointer rounded bg-transparent p-0 border-0 outline-none"
                      />
                      <div className="flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                        Chọn một màu đồng nhất cho hình nền.
                      </div>
                    </div>
                  )}
                  {bgType === "image" && (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Nhập URL hình ảnh..." 
                        value={bgImageUrl} 
                        onChange={(e) => setBgImageUrl(e.target.value)} 
                        className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                      <p className="text-xs text-slate-500">Dán link ảnh từ web (Ví dụ: Unsplash) để làm hình nền.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-between">
              <button 
                onClick={resetTheme}
                className="text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Khôi phục gốc
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-cyan-500 transition-all hover:shadow-md hover:shadow-cyan-500/20 hover:-translate-y-0.5"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
