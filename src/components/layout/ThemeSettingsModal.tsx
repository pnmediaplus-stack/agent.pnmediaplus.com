"use client";

import { useState, useEffect } from "react";
import { useThemeStore, type BackgroundType } from "@/store/useThemeStore";
import { useTheme } from "next-themes";
import { Settings, X, Moon, Sun, Monitor, Image as ImageIcon, PaintBucket, Palette } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

export function ThemeSettingsModal({ trigger }: { trigger?: React.ReactNode }) {
  const { t } = useI18n("shared");
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const [targetArea, setTargetArea] = useState<"main" | "sidebar">("main");
  const store = useThemeStore();

  const activeBgType = targetArea === "main" ? store.bgType : store.sidebarBgType;
  const activeBgColor = targetArea === "main" ? store.bgColor : store.sidebarBgColor;
  const activeBgGradient = targetArea === "main" ? store.bgGradient : store.sidebarBgGradient;
  const activeBgImageUrl = targetArea === "main" ? store.bgImageUrl : store.sidebarBgImageUrl;
  const activeBgImageOpacity = targetArea === "main" ? store.bgImageOpacity : store.sidebarBgImageOpacity;
  const activeCustomGrad1 = targetArea === "main" ? store.customGrad1 : store.sidebarCustomGrad1;
  const activeCustomGrad2 = targetArea === "main" ? store.customGrad2 : store.sidebarCustomGrad2;
  const activeCustomGradAngle = targetArea === "main" ? store.customGradAngle : store.sidebarCustomGradAngle;

  const setActiveBgType = targetArea === "main" ? store.setBgType : store.setSidebarBgType;
  const setActiveBgColor = targetArea === "main" ? store.setBgColor : store.setSidebarBgColor;
  const setActiveBgGradient = targetArea === "main" ? store.setBgGradient : store.setSidebarBgGradient;
  const setActiveBgImageUrl = targetArea === "main" ? store.setBgImageUrl : store.setSidebarBgImageUrl;
  const setActiveBgImageOpacity = targetArea === "main" ? store.setBgImageOpacity : store.setSidebarBgImageOpacity;
  const setActiveCustomGrad1 = targetArea === "main" ? store.setCustomGrad1 : store.setSidebarCustomGrad1;
  const setActiveCustomGrad2 = targetArea === "main" ? store.setCustomGrad2 : store.setSidebarCustomGrad2;
  const setActiveCustomGradAngle = targetArea === "main" ? store.setCustomGradAngle : store.setSidebarCustomGradAngle;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="w-full">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          aria-label="Theme settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      )}

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

              
              {/* Target Area Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-4">
                <button
                  onClick={() => setTargetArea("main")}
                  className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${targetArea === "main" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                  Khu vực chính
                </button>
                <button
                  onClick={() => setTargetArea("sidebar")}
                  className={`flex-1 py-1.5 text-[13px] font-semibold rounded-lg transition-all ${targetArea === "sidebar" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
                >
                  Thanh bên
                </button>
              </div>
              {/* Background Setting */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Hình nền & Màu sắc</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => setActiveBgType("default")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${
                      activeBgType === "default" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <Monitor className="h-4 w-4 mb-1" /> Mặc định
                  </button>
                  <button
                    onClick={() => setActiveBgType("color")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${
                      activeBgType === "color" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <PaintBucket className="h-4 w-4 mb-1" /> Màu sắc
                  </button>
                  <button
                    onClick={() => setActiveBgType("gradient")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${
                      activeBgType === "gradient" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <Palette className="h-4 w-4 mb-1" /> Dải màu
                  </button>
                  <button
                    onClick={() => setActiveBgType("image")}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-2 text-[11px] font-medium transition-all ${
                      activeBgType === "image" 
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300" 
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4 mb-1" /> Hình ảnh
                  </button>
                </div>
                
                {/* Specific configs */}
                <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-200 dark:border-slate-800">
                  {activeBgType === "default" && (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 text-center">Sử dụng màu nền mặc định của hệ thống.</p>
                  )}
                  {activeBgType === "color" && (
                    <div className="flex items-center gap-4">
                      <input 
                        type="color" 
                        value={activeBgColor} 
                        onChange={(e) => setActiveBgColor(e.target.value)} 
                        className="h-10 w-16 cursor-pointer rounded bg-transparent p-0 border-0 outline-none"
                      />
                      <div className="flex-1 text-[13px] text-slate-600 dark:text-slate-300">
                        Chọn một màu đồng nhất cho hình nền.
                      </div>
                    </div>
                  )}
                  {activeBgType === "gradient" && (
                    <div className="space-y-3">
                      <div className="text-[13px] text-slate-600 dark:text-slate-300">Chọn dải màu:</div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
                          "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
                          "linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)",
                          "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)",
                          "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                          "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                          "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                        ].map((grad, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveBgGradient(grad)}
                            className="h-10 rounded-lg border-2 border-transparent hover:scale-105 transition-transform"
                            style={{ backgroundImage: grad, borderColor: activeBgGradient === grad ? "#fff" : "transparent", outline: activeBgGradient === grad ? "2px solid #06b6d4" : "none" }}
                          />
                        ))}
                      </div>
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50">
                        <div className="text-[13px] text-slate-600 dark:text-slate-300 mb-2">Hoặc tự phối màu:</div>
                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="flex flex-1 items-center gap-2">
                              <input 
                                type="color" 
                                value={activeCustomGrad1} 
                                onChange={(e) => {
                                  setActiveCustomGrad1(e.target.value);
                                  setActiveBgGradient(`linear-gradient(${activeCustomGradAngle}deg, ${e.target.value} 0%, ${activeCustomGrad2} 100%)`);
                                }} 
                                className="h-8 w-8 cursor-pointer rounded bg-transparent p-0 border-0 outline-none"
                              />
                              <span className="text-[11px] font-mono text-slate-500 uppercase">{activeCustomGrad1}</span>
                            </div>
                            <div className="flex flex-1 items-center gap-2">
                              <input 
                                type="color" 
                                value={activeCustomGrad2} 
                                onChange={(e) => {
                                  setActiveCustomGrad2(e.target.value);
                                  setActiveBgGradient(`linear-gradient(${activeCustomGradAngle}deg, ${activeCustomGrad1} 0%, ${e.target.value} 100%)`);
                                }} 
                                className="h-8 w-8 cursor-pointer rounded bg-transparent p-0 border-0 outline-none"
                              />
                              <span className="text-[11px] font-mono text-slate-500 uppercase">{activeCustomGrad2}</span>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Góc độ (Angle)</label>
                              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{activeCustomGradAngle}°</span>
                            </div>
                            <input 
                              type="range" 
                              min="0" 
                              max="360" 
                              value={activeCustomGradAngle} 
                              onChange={(e) => {
                                setActiveCustomGradAngle(Number(e.target.value));
                                setActiveBgGradient(`linear-gradient(${e.target.value}deg, ${activeCustomGrad1} 0%, ${activeCustomGrad2} 100%)`);
                              }} 
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeBgType === "image" && (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Đường dẫn hình ảnh</label>
                        <input 
                          type="text" 
                          placeholder="Nhập URL hình ảnh..." 
                          value={activeBgImageUrl} 
                          onChange={(e) => setActiveBgImageUrl(e.target.value)} 
                          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Độ hiển thị (Opacity)</label>
                          <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">{activeBgImageOpacity}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={activeBgImageOpacity} 
                          onChange={(e) => setActiveBgImageOpacity(Number(e.target.value))} 
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-cyan-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-between">
              <button 
                onClick={store.resetTheme}
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
