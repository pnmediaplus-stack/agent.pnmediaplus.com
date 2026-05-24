import { shared } from "@/lib/i18n/vi_modules/shared";
import { layout } from "@/lib/i18n/vi_modules/layout";
import { dashboard } from "@/lib/i18n/vi_modules/dashboard";
import { chat } from "@/lib/i18n/vi_modules/chat";
import { departments } from "@/lib/i18n/vi_modules/departments";
import { agents } from "@/lib/i18n/vi_modules/agents";
import { tasks } from "@/lib/i18n/vi_modules/tasks";
import { artifacts } from "@/lib/i18n/vi_modules/artifacts";
import { workflows } from "@/lib/i18n/vi_modules/workflows";
import { qa } from "@/lib/i18n/vi_modules/qa";
import { gates } from "@/lib/i18n/vi_modules/gates";
import { approvals } from "@/lib/i18n/vi_modules/approvals";
import { audit } from "@/lib/i18n/vi_modules/audit";
import { media } from "@/lib/i18n/vi_modules/media";
import { n8n } from "@/lib/i18n/vi_modules/n8n";
import { phase3 } from "@/lib/i18n/vi_modules/phase3";
import { phase4 } from "@/lib/i18n/vi_modules/phase4";
import { phase066 } from "@/lib/i18n/vi_modules/phase066";
import { phase067 } from "@/lib/i18n/vi_modules/phase067";
import { phase068 } from "@/lib/i18n/vi_modules/phase068";
import { phase070 } from "@/lib/i18n/vi_modules/phase070";
import { marketing } from "@/lib/i18n/vi_modules/marketing";
import { operations } from "@/lib/i18n/vi_modules/operations";
import { customer } from "@/lib/i18n/vi_modules/customer";
import { businessTruth } from "@/lib/i18n/vi_modules/businessTruth";
import { coreGovernance } from "@/lib/i18n/vi_modules/coreGovernance";
import { departmentGovernance } from "@/lib/i18n/vi_modules/departmentGovernance";
import { portalAuth } from "@/lib/i18n/vi_modules/portalAuth";

export const vi = {
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
  ...phase4,
  ...phase066,
  ...phase067,
  ...phase068,
  ...phase070,
  ...marketing,
  ...operations,
  ...customer,
  ...businessTruth,
  ...coreGovernance,
  ...departmentGovernance,
  ...portalAuth
} as const;
