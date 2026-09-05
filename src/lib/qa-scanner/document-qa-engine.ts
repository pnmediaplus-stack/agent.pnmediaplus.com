import crypto from 'crypto';

export const CANONICAL_NAMESPACE_DEPARTMENT_MAP: Record<string, string> = {
  marketing: 'dept-marketing',
  cskh: 'dept-cskh',
};

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB (Enforced strictly)
export const MAX_TOKEN_ESTIMATE = 50_000;

export interface QAViolation {
  id: string;
  category: 'P0_HARD_BLOCK' | 'DOMAIN_MISMATCH' | 'SECURITY_HEURISTIC';
  rule: string;
  snippet: string;
  reason: string;
  line_number?: number;
}

export interface QAWarning {
  id: string;
  rule: string;
  snippet: string;
  suggestion: string;
  line_number?: number;
}

export interface DocumentQAReport {
  rule_version: string;
  inspected_at: string;
  inspector: string;
  content_sha256: string;
  extracted_tokens_count: number;
  namespace: string;
  department_id: string;
  verdict: 'HARD_BLOCKED' | 'REVIEW_RECOMMENDED';
  p0_violations: QAViolation[];
  p1_warnings: QAWarning[];
  domain_classification: 'AGENCY_STANDARD' | 'OUT_OF_SCOPE_DOMAIN';
  security_scan: 'CLEAN' | 'ADVERSARIAL_HEURISTIC_FLAGGED';
}

export function normalizeDiacritics(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

interface HeuristicRule {
  id: string;
  category: 'P0_HARD_BLOCK' | 'DOMAIN_MISMATCH' | 'SECURITY_HEURISTIC';
  rule: string;
  regexNormalized: RegExp;
  reason: string;
}

const HEURISTIC_RULES: HeuristicRule[] = [
  // 1. P0-01: False quantitative promises without audited proof (KO-01 Gate 02)
  {
    id: 'VIO-P0-01',
    category: 'P0_HARD_BLOCK',
    rule: 'KO-01_GATE_02_CLAIM_VS_EVIDENCE',
    regexNormalized: /(cam\s*ket.*(\d+%\s*doanh\s*thu|\d+%\s*chi\s*phi|tang\s*truong\s*\d+%|hoan\s*tien\s*\d+%))/i,
    reason: 'Quantitative revenue/growth guarantee is prohibited without independent audited proof (KO-01 Gate 02).',
  },
  // 2. P0-02A: Product truth overstep - Billing / Invoices (KO-06 Product Truth)
  {
    id: 'VIO-P0-02A',
    category: 'P0_HARD_BLOCK',
    rule: 'KO-06_PRODUCT_TRUTH_BILLING',
    regexNormalized: /(xuat\s*hoa\s*don\s*do|hoa\s*don\s*vat\s*dien\s*tu|phan\s*mem\s*ke\s*toan\s*thue)/i,
    reason: 'Billing and tax invoice management is OUT_OF_SCOPE for PN Agency CRM (KO-06).',
  },
  // 3. P0-02B: Product truth overstep - HRM / Payroll (KO-06 Product Truth)
  {
    id: 'VIO-P0-02B',
    category: 'P0_HARD_BLOCK',
    rule: 'KO-06_PRODUCT_TRUTH_HRM',
    regexNormalized: /(tinh\s*luong\s*nhan\s*su|cham\s*cong\s*tu\s*dong|payroll\s*management)/i,
    reason: 'HRM and payroll management is DEFERRED and out of current core workflow (KO-06).',
  },
  // 4. P0-02C: Product truth overstep - AI Ads Automation (KO-06 Product Truth)
  {
    id: 'VIO-P0-02C',
    category: 'P0_HARD_BLOCK',
    rule: 'KO-06_PRODUCT_TRUTH_AI_ADS',
    regexNormalized: /(tu\s*dong\s*chay\s*ads|ai\s*tu\s*len\s*camp\s*facebook|ai\s*ads\s*launcher)/i,
    reason: 'AI Ads execution automation is DEFERRED. The CRM is an internal operations workflow tool (KO-06).',
  },
  // 5. P0-03: Commercial authority breach - Unauthorized price cut / discounts (KO-01 Gate 04)
  {
    id: 'VIO-P0-03',
    category: 'P0_HARD_BLOCK',
    rule: 'KO-01_GATE_04_COMMERCIAL_AUTHORITY',
    regexNormalized: /(giam\s*gia\s*50%|flash\s*sale\s*giam|tang\s*mien\s*phi\s*setup|mien\s*phi\s*thue\s*bao\s*vinh\s*vien)/i,
    reason: 'Unauthorized discount or setup fee waiver is strictly prohibited without Founder lock (KO-01 Gate 04).',
  },
  // 6. Domain Mismatch (Category B)
  {
    id: 'DOM-01',
    category: 'DOMAIN_MISMATCH',
    rule: 'KO-01_GATE_05_OUT_OF_SCOPE_INDUSTRY',
    regexNormalized: /(chuoi\s*nha\s*hang\s*f&b|quan\s*an\s*nha\s*hang|ban\s*le\s*quan\s*ao\s*shopee|kinh\s*doanh\s*bat\s*dong\s*san\s*nghi\s*duong)/i,
    reason: 'Document targets an industry outside the approved Agency/Creative scope (KO-01 Gate 05).',
  },
  // 7. Adversarial Heuristic Pattern (Category C)
  {
    id: 'SEC-01',
    category: 'SECURITY_HEURISTIC',
    rule: 'SECURITY_ADVERSARIAL_INJECTION_PATTERN',
    regexNormalized: /(ignore\s+previous\s+instructions|system\s+prompt\s+override|<\/system>|jailbreak|developer\s+mode\s+enabled)/i,
    reason: 'Text matches known heuristic prompt override or jailbreak pattern.',
  },
];

/**
 * Server-side Document QA Policy Linter & Heuristic Scanner (v1.0.0_LOCKED)
 * Strict Zero-Tolerance: No naive prohibition bypass that attackers could exploit.
 */
export function runDocumentQA(
  rawText: string,
  namespace: string
): DocumentQAReport {
  const normNamespace = (namespace || '').trim().toLowerCase();
  const departmentId = CANONICAL_NAMESPACE_DEPARTMENT_MAP[normNamespace];

  if (!departmentId) {
    throw new Error(`FAIL_CLOSED_INVALID_NAMESPACE: Namespace '${namespace}' is not recognized in canonical allowlist.`);
  }

  // 1. Real SHA-256 computation over extracted UTF-8 text
  const contentSha256 = crypto
    .createHash('sha256')
    .update(rawText || '', 'utf8')
    .digest('hex');

  // 2. Token count estimation
  const tokenEstimate = Math.ceil((rawText || '').length / 4);

  const p0Violations: QAViolation[] = [];
  const p1Warnings: QAWarning[] = [];
  let domainClassification: 'AGENCY_STANDARD' | 'OUT_OF_SCOPE_DOMAIN' = 'AGENCY_STANDARD';
  let securityScan: 'CLEAN' | 'ADVERSARIAL_HEURISTIC_FLAGGED' = 'CLEAN';

  // Check token ceiling
  if (tokenEstimate > MAX_TOKEN_ESTIMATE) {
    p0Violations.push({
      id: 'VIO-P0-LIMIT',
      category: 'P0_HARD_BLOCK',
      rule: 'FILE_HYGIENE_TOKEN_CEILING',
      snippet: `Estimated ${tokenEstimate} tokens exceeds limit of ${MAX_TOKEN_ESTIMATE}`,
      reason: 'Document exceeds maximum allowable token ceiling.',
    });
  }

  // Split into lines for line-level provenance
  const lines = (rawText || '').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const normalizedLine = normalizeDiacritics(rawLine);

    // Check if line is an explicit boundary prohibition/denial statement or test case input scenario
    // (e.g. "CẤM NGHIẶT: Cấm tự nhận PN Agency CRM có chức năng Kế toán, HRM, hoặc AI tự động chạy Ads", or test case input_scenario)
    const isBoundaryDenial = /^\s*(-|\*|\d+\.)?\s*(\*\*.*(cam|trap|gioi\s*han|boundary).*\*\*:?\s*)?(cam\s+(tu\s*nhan|hua|tuyen\s*bo|quang\s*cao)|khong\s+(co|ho\s*tro|tich\s*hop|cung\s*cap)|tuyet\s*doi\s*khong\s*tu\s*nhan|luu\s*y:\s*he\s*thong\s*khong|input_scenario:)/i.test(normalizedLine);

    for (const rule of HEURISTIC_RULES) {
      if (rule.regexNormalized.test(normalizedLine)) {
        const snippet = rawLine.trim().slice(0, 150);

        // Capability exclusions (P0-02A/B/C) on lines that explicitly deny/prohibit the capability are valid boundaries, not violations.
        // Quantitative revenue guarantees (P0-01) and unauthorized discounts (P0-03) are NEVER exempt.
        const isExemptBoundaryStatement =
          isBoundaryDenial && (rule.id === 'VIO-P0-02A' || rule.id === 'VIO-P0-02B' || rule.id === 'VIO-P0-02C');

        if (isExemptBoundaryStatement) {
          continue;
        }

        if (rule.category === 'P0_HARD_BLOCK') {
          p0Violations.push({
            id: rule.id,
            category: 'P0_HARD_BLOCK',
            rule: rule.rule,
            snippet,
            reason: rule.reason,
            line_number: i + 1,
          });
        } else if (rule.category === 'DOMAIN_MISMATCH') {
          domainClassification = 'OUT_OF_SCOPE_DOMAIN';
          p1Warnings.push({
            id: rule.id,
            rule: rule.rule,
            snippet,
            suggestion: 'Ensure this document is routed to bespoke consulting, not core Agency CRM knowledge.',
            line_number: i + 1,
          });
        } else if (rule.category === 'SECURITY_HEURISTIC') {
          securityScan = 'ADVERSARIAL_HEURISTIC_FLAGGED';
          p0Violations.push({
            id: rule.id,
            category: 'P0_HARD_BLOCK',
            rule: rule.rule,
            snippet,
            reason: rule.reason,
            line_number: i + 1,
          });
        }
      }
    }
  }

  const verdict: 'HARD_BLOCKED' | 'REVIEW_RECOMMENDED' =
    p0Violations.length > 0 ? 'HARD_BLOCKED' : 'REVIEW_RECOMMENDED';

  return {
    rule_version: 'v1.0.0_LOCKED',
    inspected_at: new Date().toISOString(),
    inspector: 'SERVER_DOCUMENT_QA_GATEKEEPER',
    content_sha256: contentSha256,
    extracted_tokens_count: tokenEstimate,
    namespace: normNamespace,
    department_id: departmentId,
    verdict,
    p0_violations: p0Violations,
    p1_warnings: p1Warnings,
    domain_classification: domainClassification,
    security_scan: securityScan,
  };
}
