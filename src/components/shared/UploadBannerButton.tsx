"use client";

import React, { useRef, useState, useCallback } from "react";
import { Pen, Loader2, X, Image as ImageIcon, UploadCloud } from "lucide-react";
import { useBanner } from "@/hooks/useBanner";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/cropImage";

interface UploadBannerButtonProps {
  settingKey: string;
  className?: string;
  children?: React.ReactNode;
}

export function UploadBannerButton({ settingKey, className, children }: UploadBannerButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Cropper states
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [opacity, setOpacity] = useState(100);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useBanner(settingKey);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn. Vui lòng chọn ảnh < 5MB");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedImage) throw new Error("Không thể cắt ảnh");

      const formData = new FormData();
      // Generate a dummy filename with jpg extension
      formData.append("file", croppedImage, "banner.jpg");
      formData.append("setting_key", settingKey);
      formData.append("opacity", opacity.toString());

      const res = await fetch("/api/settings/banner", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Tải ảnh lên thất bại");
      }

      toast.success("Cập nhật ảnh bìa thành công!");
      mutate();
      closeModal();
    } catch (err: any) {
      toast.error(err.message || "Đã có lỗi xảy ra khi tải ảnh");
    } finally {
      setIsUploading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <>
      <div className={className} onClick={() => setIsModalOpen(true)}>
        {children ? children : (
          <button 
            type="button"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/30 text-slate-900 dark:text-white transition-all shadow-sm"
            title="Đổi ảnh bìa"
          >
            <Pen className="w-4 h-4" />
          </button>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-white dark:bg-slate-900/80 backdrop-blur-sm"
            onClick={closeModal}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cập nhật ảnh bìa</h3>
              <button 
                onClick={closeModal}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              {!imageSrc ? (
                <div className="flex flex-col items-center justify-center">
                  <div 
                    className="w-full aspect-[6/1] rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="p-4 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 mb-4 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nhấn để chọn ảnh từ máy tính</p>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG, WEBP (Tối đa 5MB)</p>
                  </div>
                  
                  <div className="mt-8 w-full bg-indigo-50/50 dark:bg-indigo-500/5 rounded-xl p-5 border border-indigo-100 dark:border-indigo-500/10">
                    <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4" />
                      Yêu cầu hình ảnh chuyên nghiệp
                    </h4>
                    <ul className="text-sm text-indigo-800/80 dark:text-indigo-200/70 space-y-2 list-disc pl-5 marker:text-indigo-300">
                      <li>Tỷ lệ khung hình chuẩn là <strong>6:1</strong> (Panorama cực rộng).</li>
                      <li>Kích thước khuyến nghị: <strong>1920x320 pixels</strong>.</li>
                      <li>Phần bên trái sẽ có một lớp mờ nhẹ để đảm bảo chữ vẫn có thể đọc được, hãy chọn ảnh có chi tiết chính nằm ở bên phải hoặc trung tâm.</li>
                      <li>Bạn có thể di chuyển và phóng to/thu nhỏ ảnh sau khi tải lên để lấy được góc hình ưng ý nhất.</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-[60vh] min-h-[450px]">
                  <div className="relative flex-1 bg-black rounded-xl overflow-hidden">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={6 / 1}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                      objectFit="horizontal-cover"
                    />
                  </div>
                  <div className="mt-6 flex flex-col gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                        Phóng to / Thu nhỏ
                      </label>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 block">
                        Độ mờ (Opacity)
                      </label>
                      <input
                        type="range"
                        value={opacity}
                        min={10}
                        max={100}
                        step={5}
                        onChange={(e) => setOpacity(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              {imageSrc && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2 text-sm font-bold text-slate-900 dark:text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isUploading ? "Đang xử lý..." : "Áp dụng Banner"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
