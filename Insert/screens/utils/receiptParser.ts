export type LearnedPantryItem = {
  name: string;
  type?: string;
  unit?: string;
  defaultQuantity?: number;
  location?: string;
  brand?: string;
};

export type ReceiptItemCandidate = {
  id: string;
  rawLine: string;
  name: string;
  quantity: number;
  unit: string;
  confidence: number;
  needsReview: boolean;
  reasons: string[];
  matchedLearnedKey?: string;
};

const META_PATTERNS: RegExp[] = [
  /subtotal|total|tax|hst|gst|pst|vat|change|cash|visa|mastercard|debit|credit|auth|approval/i,
  /discount|coupon|save\s+\$|promo|loyalty|points|member/i,
  /store|address|phone|receipt|transaction|operator|register|lane|invoice/i,
  /thank\s+you|visit\s+again|welcome/i,
  /date|time|items\s+\d+|balance|payment/i,
  /^\s*\d{4,}\s*$/,
];

const UNIT_REGEX = /(kg|g|lb|lbs|oz|ml|l|pcs|pc|pack|can|bottle|dozen|ct)\b/i;

const cleanName = (value: string): string => {
  return value
    .replace(/\s{2,}/g, " ")
    .replace(/[\*#]/g, "")
    .replace(/\b(organic|fresh|large|small|medium)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export const normalizeReceiptItemName = (value: string): string => {
  return cleanName(value).toLowerCase();
};

const extractQuantityAndUnit = (line: string): { quantity: number; unit: string } => {
  const qtyUnit = line.match(/(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|oz|ml|l|pcs|pc|pack|can|bottle|ct)\b/i);
  if (qtyUnit) {
    return {
      quantity: Number(qtyUnit[1]),
      unit: qtyUnit[2].toLowerCase() === "pc" ? "pcs" : qtyUnit[2].toLowerCase(),
    };
  }

  const xPattern = line.match(/(\d+)\s*[x×]\s*/i);
  if (xPattern) {
    return { quantity: Number(xPattern[1]), unit: "pcs" };
  }

  return { quantity: 1, unit: "pcs" };
};

const removeTrailingPrice = (line: string): string => {
  return line.replace(/\$?\s*\d+(?:[\.,]\d{2})\s*$/g, "").trim();
};

const looksLikeMeta = (line: string): boolean => {
  if (line.length < 2) return true;
  if (/^\s*[-_=]{2,}\s*$/.test(line)) return true;
  return META_PATTERNS.some((pattern) => pattern.test(line));
};

const scoreLine = (line: string): { confidence: number; reasons: string[] } => {
  let score = 0.55;
  const reasons: string[] = [];

  if (line.length < 3) {
    score -= 0.3;
    reasons.push("Very short line");
  }

  if (/[a-zA-Z]{3,}/.test(line)) {
    score += 0.15;
  } else {
    score -= 0.2;
    reasons.push("No clear item text");
  }

  if (/\d{8,}/.test(line)) {
    score -= 0.2;
    reasons.push("Contains long numeric code");
  }

  if (UNIT_REGEX.test(line)) {
    score += 0.08;
  }

  if (/\$?\s*\d+(?:[\.,]\d{2})\s*$/.test(line)) {
    score += 0.07;
  }

  if (/discount|coupon|save/i.test(line)) {
    score -= 0.35;
    reasons.push("Looks like discount line");
  }

  if (looksLikeMeta(line)) {
    score -= 0.45;
    reasons.push("Looks like receipt metadata");
  }

  return { confidence: Math.max(0, Math.min(0.99, score)), reasons };
};

export const parseReceiptText = (
  rawText: string,
  learnedItems: Record<string, LearnedPantryItem> = {}
): ReceiptItemCandidate[] => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const candidates: ReceiptItemCandidate[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const { confidence, reasons } = scoreLine(rawLine);
    if (confidence < 0.35) continue;

    const noPrice = removeTrailingPrice(rawLine);
    const normalized = normalizeReceiptItemName(noPrice);
    if (!normalized) continue;

    const learned = learnedItems[normalized];
    const qtyUnit = extractQuantityAndUnit(rawLine);

    let adjustedConfidence = confidence;
    if (learned) {
      adjustedConfidence = Math.min(0.99, adjustedConfidence + 0.18);
      reasons.push("Matched previous purchase pattern");
    }

    const name = cleanName(
      noPrice
        .replace(/(\d+(?:\.\d+)?)\s*(kg|g|lb|lbs|oz|ml|l|pcs|pc|pack|can|bottle|ct)\b/gi, "")
        .replace(/\b\d+\s*[x×]\b/gi, "")
        .trim()
    );

    if (!name || name.length < 2) continue;

    candidates.push({
      id: `${i}-${normalized}`,
      rawLine,
      name: learned?.name || name,
      quantity: learned?.defaultQuantity && Number.isFinite(learned.defaultQuantity)
        ? learned.defaultQuantity
        : qtyUnit.quantity,
      unit: learned?.unit || qtyUnit.unit,
      confidence: adjustedConfidence,
      needsReview: adjustedConfidence < 0.7,
      reasons,
      matchedLearnedKey: learned ? normalized : undefined,
    });
  }

  const deduped = new Map<string, ReceiptItemCandidate>();
  for (const candidate of candidates) {
    const key = normalizeReceiptItemName(candidate.name);
    const existing = deduped.get(key);
    if (!existing || existing.confidence < candidate.confidence) {
      deduped.set(key, candidate);
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.confidence - a.confidence);
};
