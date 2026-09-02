"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { TenantIntegrationsView } from "@/components/phase070/TenantIntegrationsView";
import { useI18n } from "@/lib/i18n/useI18n";

export default function TenantIntegrationsPage() {
  const { t } = useI18n("phase070");

  return (
    <PageFrame bannerKey="page_banner"
      title={t("phase070.page.title") ?? "Cấu hình Tích hợp & Két khóa BYOK"}
      purpose={t("phase070.page.purpose") ?? "Không gian quản lý kết nối Fanpage, API Key mô hình AI (OpenAI, Gemini, Anthropic) với cơ chế bảo mật Write-Only SSOT an toàn tuyệt đối."}
      statusLabel={t("phase070.page.statusLabel") ?? "Trạng thái Vault"}
      statusValue="SECURE"
      statusDisplayValue={t("phase070.page.statusValue") ?? "BẢO MẬT KÉP - Két khóa SSOT đang hoạt động"}
      allowedActions={[
        t("phase070.page.allowed.viewProviders") ?? "Xem danh mục nhà cung cấp AI & Kênh",
        t("phase070.page.allowed.viewStatus") ?? "Kiểm tra trạng thái kết nối Fanpage",
        t("phase070.page.allowed.submitWriteOnly") ?? "Nhập API Key mã hóa Write-Only an toàn"
      ]}
      forbiddenActions={[
        t("phase070.page.forbidden.readSecret") ?? "Đọc thô API Key bí mật",
        t("phase070.page.forbidden.n8nSecret") ?? "Lộ khóa bí mật sang workflow n8n",
        t("phase070.page.forbidden.publicRead") ?? "Hiển thị secret qua giao diện công khai"
      ]}
      contentClassName="grid gap-7"
    >
      <TenantIntegrationsView />
    </PageFrame>
  );
}
