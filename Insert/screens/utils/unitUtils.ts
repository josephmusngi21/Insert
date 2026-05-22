export type PreferredWeightUnit = "g" | "lb";
export type UnitDisplayMode = "converted" | "as_is";

const LB_TO_G = 453.59237;
const OZ_TO_G = 28.349523125;
const CUP_TO_G = 240;
const TBSP_TO_G = 15;
const TSP_TO_G = 5;

function toNumber(value: number | string): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAnyToGrams(quantity: number, unit: string): number | null {
  const u = unit.toLowerCase().trim();
  if (u === "g" || u === "gram" || u === "grams") return quantity;
  if (u === "kg" || u === "kilogram" || u === "kilograms") return quantity * 1000;
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return quantity * LB_TO_G;
  if (u === "oz" || u === "ounce" || u === "ounces") return quantity * OZ_TO_G;
  if (u === "mg" || u === "milligram" || u === "milligrams") return quantity / 1000;

  // Approximate volume-to-mass conversions for pantry display.
  // This assumes water-like density so users can normalize mixed units.
  if (u === "ml" || u === "milliliter" || u === "milliliters") return quantity;
  if (u === "l" || u === "liter" || u === "liters") return quantity * 1000;
  if (u === "cup" || u === "cups") return quantity * CUP_TO_G;
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return quantity * TBSP_TO_G;
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return quantity * TSP_TO_G;
  return null;
}

export function formatQuantityForPreference(
  quantity: number | string,
  unit: string,
  preferredWeightUnit: PreferredWeightUnit,
  displayMode: UnitDisplayMode = "converted"
): { quantityText: string; unitText: string; quantityValue: number } {
  const parsed = toNumber(quantity);
  if (parsed === null || !unit) {
    return { quantityText: String(quantity), unitText: unit || "", quantityValue: parsed ?? 0 };
  }

  if (displayMode === "as_is") {
    return {
      quantityText: Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(2))),
      unitText: unit,
      quantityValue: parsed,
    };
  }

  const grams = normalizeAnyToGrams(parsed, unit);
  if (grams === null) {
    return {
      quantityText: Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(2))),
      unitText: unit,
      quantityValue: parsed,
    };
  }

  if (preferredWeightUnit === "lb") {
    const pounds = grams / LB_TO_G;
    const rounded = pounds >= 10 ? Number(pounds.toFixed(1)) : Number(pounds.toFixed(2));
    return { quantityText: String(rounded), unitText: "lb", quantityValue: rounded };
  }

  const roundedGrams = grams >= 100 ? Math.round(grams) : Number(grams.toFixed(1));
  return { quantityText: String(roundedGrams), unitText: "g", quantityValue: roundedGrams };
}
