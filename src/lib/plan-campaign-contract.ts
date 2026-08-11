import type { DepartmentPackRecord, DepartmentRegistryRecord } from "@/lib/department-governance-loader";

export type CampaignPlanRequestContract = {
  campaign_brief: string;
  campaign_goal: string;
  campaign_duration_days: number | null;
  paid_media_allowed: boolean | null;
  target_terms: string[];
  required_terms: string[];
  validation_hints: string[];
  department_pack_key: string;
  department_pack_label: string;
  department_pack_contract: DepartmentPackRecord;
  source_department_id: string;
  source_department_name: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripPlanCommandPrefix(body: string) {
  return compactWhitespace(
    body
      .replace(/^\/plan_campaign\b/i, "")
      .replace(/\bdepartment[_\s-]?id\s*:\s*[^\s]+/gi, "")
      .replace(/\bdepartment[_\s-]?name\s*:\s*[^,;|]+/gi, "")
  );
}

function parseDurationDays(brief: string) {
  const normalized = normalizeText(brief);
  const match = normalized.match(/\b(\d{1,3})\s*(ngay|days?|day)\b/i);
  if (!match) return null;
  const days = Number.parseInt(match[1], 10);
  return Number.isFinite(days) && days > 0 ? days : null;
}

function parsePaidMediaConstraint(brief: string) {
  const normalized = normalizeText(brief);
  if (/\b(no[-\s]?ads|organic only|khong\s+su\s+dung\s+quang\s+cao|khong\s+chay\s+ads|khong\s+ads|khong\s+dung\s+quang\s+cao|khong\s+su\s+dung\s+paid\s+media)\b/i.test(normalized)) {
    return false;
  }

  if (/\bpaid\s+ads?\b|\bquang\s+cao\s+tra\s+phi\b|\bpaid\s+media\b/i.test(normalized)) {
    return true;
  }

  return null;
}

function parseTargetTerms(brief: string) {
  const normalized = normalizeText(brief);
  const focusMatch =
    normalized.match(/\b(?:tang|increase|grow|boost|improve|drive|raise|attract)\s+(.+?)(?:[.;|]|\b(?:khong|no|without|de)\b|$)/i)?.[1] ??
    normalized.match(/\b(?:muc\s+tieu|goal|objective)\s*[:=]\s*(.+?)(?:[.;|]|$)/i)?.[1] ??
    "";

  const chunk = compactWhitespace(focusMatch || normalized);
  const stopTerms = new Set([
    "and",
    "va",
    "voi",
    "cho",
    "for",
    "de",
    "to",
    "trong",
    "the",
    "via",
    "using",
    "ung",
    "dung",
    "khong",
    "no",
    "ads",
    "organic",
    "only"
  ]);

  const candidateTerms = chunk
    .split(/(?:,|\/|\+|&|\band\b|\bva\b|\bvoi\b|\bcho\b|\bfor\b|\btrong\b|\bde\b|\bto\b)/i)
    .map((item) => item.replace(/[^a-z0-9\s_-]/gi, " ").trim())
    .filter(Boolean)
    .map((item) => compactWhitespace(item))
    .filter((item) => item.length >= 2);

  const unique = new Set<string>();
  for (const term of candidateTerms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (stopTerms.has(normalizedTerm)) continue;
    unique.add(term);
  }

  return Array.from(unique);
}



function buildValidationHints(input: {
  brief: string;
  durationDays: number | null;
  paidMediaAllowed: boolean | null;
  targetTerms: string[];
  pack: DepartmentPackRecord;
}) {
  const hints = [
    "campaign_brief is SSOT",
    `qa_expectation: ${input.pack.qa_expectation}`
  ];

  if (input.durationDays !== null) {
    hints.push(`duration_days must equal ${input.durationDays}`);
  }

  if (input.paidMediaAllowed === false) {
    hints.push("paid_media_allowed must remain false");
  }

  if (input.paidMediaAllowed === true) {
    hints.push("paid_media_allowed is explicitly allowed by request");
  }

  if (input.targetTerms.length > 0) {
    hints.push(`required_terms must be reflected from request: ${input.targetTerms.join(", ")}`);
  }

  return hints;
}

export function buildCampaignPlanRequestContract(input: {
  body: string;
  departmentRecord: DepartmentRegistryRecord;
  departmentPack: DepartmentPackRecord;
}) {
  const campaignBrief = input.body;
  const campaignGoal = stripPlanCommandPrefix(input.body);
  const campaignDurationDays = parseDurationDays(input.body);
  const paidMediaAllowed = parsePaidMediaConstraint(input.body);
  const targetTerms = parseTargetTerms(input.body);
  const requiredTerms = [...targetTerms];
  const validationHints = buildValidationHints({
    brief: campaignBrief,
    durationDays: campaignDurationDays,
    paidMediaAllowed,
    targetTerms,
    pack: input.departmentPack
  });

  if (!input.departmentRecord.department_pack_key) {
    throw new Error("MISSING_DEPARTMENT_PACK_KEY_SSOT");
  }

  return {
    campaign_brief: campaignBrief,
    campaign_goal: campaignGoal || campaignBrief,
    campaign_duration_days: campaignDurationDays,
    paid_media_allowed: paidMediaAllowed,
    target_terms: targetTerms,
    required_terms: requiredTerms,
    validation_hints: validationHints,
    department_pack_key: input.departmentRecord.department_pack_key,
    department_pack_label: input.departmentRecord.department_pack,
    department_pack_contract: input.departmentPack,
    source_department_id: input.departmentRecord.department_id,
    source_department_name: input.departmentRecord.department_name
  };
}

