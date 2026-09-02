import type { ReactNode } from "react";
import { PageHeader } from "@/components/shared/PageHeader";

type PageFrameProps = {
  title: string;
  purpose: string;
  statusLabel: string;
  statusValue: string;
  statusDisplayValue?: string;
  allowedActions: string[];
  forbiddenActions?: string[];
  bannerKey?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PageFrame({
  title,
  purpose,
  statusLabel,
  statusValue,
  statusDisplayValue,
  allowedActions,
  forbiddenActions,
  bannerKey,
  children,
  className,
  contentClassName
}: PageFrameProps) {
  return (
    <div className={className ?? "space-y-6"}>
      <PageHeader
        title={title}
        purpose={purpose}
        statusLabel={statusLabel}
        statusValue={statusValue}
        statusDisplayValue={statusDisplayValue}
        allowedActions={allowedActions}
        forbiddenActions={forbiddenActions}
        bannerKey={bannerKey}
      />
      <div className={contentClassName ?? "grid gap-6"}>{children}</div>
    </div>
  );
}
