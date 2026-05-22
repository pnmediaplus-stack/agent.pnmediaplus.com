import { shared } from "@/lib/i18n/en_modules/shared";
import { layout } from "@/lib/i18n/en_modules/layout";
import { dashboard } from "@/lib/i18n/en_modules/dashboard";
import { chat } from "@/lib/i18n/en_modules/chat";
import { departments } from "@/lib/i18n/en_modules/departments";
import { agents } from "@/lib/i18n/en_modules/agents";
import { tasks } from "@/lib/i18n/en_modules/tasks";
import { artifacts } from "@/lib/i18n/en_modules/artifacts";
import { workflows } from "@/lib/i18n/en_modules/workflows";
import { qa } from "@/lib/i18n/en_modules/qa";
import { gates } from "@/lib/i18n/en_modules/gates";
import { approvals } from "@/lib/i18n/en_modules/approvals";
import { audit } from "@/lib/i18n/en_modules/audit";
import { media } from "@/lib/i18n/en_modules/media";
import { n8n } from "@/lib/i18n/en_modules/n8n";
import { phase3 } from "@/lib/i18n/en_modules/phase3";
import { phase4 } from "@/lib/i18n/en_modules/phase4";

export const en = {
  ...shared,
  ...layout,
  ...dashboard,
  ...chat,
  ...departments,
  ...agents,
  ...tasks,
  ...artifacts,
  ...workflows,
  ...qa,
  ...gates,
  ...approvals,
  ...audit,
  ...media,
  ...n8n,
  ...phase3,
  ...phase4
} as const;
