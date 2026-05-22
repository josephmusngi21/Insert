/**
 * Recipe Import Utility
 * Fetches a recipe URL and extracts recipe data using JSON-LD structured data
 * (schema.org Recipe markup used by AllRecipes, FoodNetwork, SimplyRecipes, etc.)
 */

export type ParsedIngredient = {
  name: string;
  quantity: string;
  unit: string;
};

export type ParsedRecipe = {
  name: string;
  description: string;
  servings: string;
  cookTime: string;
  difficulty: string;
  ingredients: ParsedIngredient[];
  instructions: string[];
};

// Known units and their normalized forms matching the app's COOKING_UNITS
const UNIT_NORMALIZE: Record<string, string> = {
  cups: "cup",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "tea spoon": "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  "table spoon": "tbsp",
  mL: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  liter: "L",
  liters: "L",
  litre: "L",
  litres: "L",
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  ounce: "oz",
  ounces: "oz",
  pound: "lb",
  pounds: "lb",
  lbs: "lb",
};

const ALL_UNITS = [
  "cup", "cups", "tsp", "teaspoon", "teaspoons",
  "tbsp", "tablespoon", "tablespoons",
  "ml", "mL", "milliliter", "milliliters",
  "l", "L", "liter", "liters", "litre", "litres",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "clove", "cloves",
  "pinch", "pinches",
  "dash", "dashes",
  "piece", "pieces",
  "slice", "slices",
  "can", "cans",
  "bunch", "bunches",
  "handful", "handfuls",
  "sprig", "sprigs",
  "stalk", "stalks",
  "head", "heads",
  "sheet", "sheets",
  "stick", "sticks",
  "package", "pkg",
  "pkt",
];

// Unicode fractions → decimal string
const FRACTION_MAP: Record<string, string> = {
  "½": "0.5",
  "⅓": "0.33",
  "⅔": "0.67",
  "¼": "0.25",
  "¾": "0.75",
  "⅛": "0.125",
  "⅜": "0.375",
  "⅝": "0.625",
  "⅞": "0.875",
};

function normalizeFractions(str: string): string {
  let result = str;
  for (const [frac, val] of Object.entries(FRACTION_MAP)) {
    result = result.split(frac).join(val);
  }
  return result;
}

function evaluateFraction(str: string): string {
  // Handle "1/2", "3/4" etc.
  const match = str.match(/^(\d+)\/(\d+)$/);
  if (match) {
    const val = parseInt(match[1]) / parseInt(match[2]);
    return val.toFixed(2).replace(/\.?0+$/, "");
  }
  // Handle "1 1/2" (mixed number)
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const val = parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
    return val.toFixed(2).replace(/\.?0+$/, "");
  }
  return str;
}

export function parseIngredient(raw: string): ParsedIngredient {
  // Strip HTML tags and decode basic entities
  let str = raw
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize unicode fractions
  str = normalizeFractions(str);

  // Match leading quantity: handles "1", "1.5", "1/2", "1 1/2"
  const quantityRegex = /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)/;
  const qMatch = str.match(quantityRegex);

  if (!qMatch) {
    // No quantity found — use "1" as default, entire string is name
    return { name: str.replace(/,.*$/, "").trim(), quantity: "1", unit: "piece" };
  }

  const rawQty = qMatch[1].trim();
  const quantity = evaluateFraction(rawQty);
  const rest = str.slice(qMatch[0].length).trim();

  // Check if the first word is a known unit
  const words = rest.split(/\s+/);
  const firstWordLower = words[0]?.toLowerCase() ?? "";

  if (ALL_UNITS.map(u => u.toLowerCase()).includes(firstWordLower)) {
    const unit = UNIT_NORMALIZE[words[0]] ?? UNIT_NORMALIZE[firstWordLower] ?? firstWordLower;
    // Remove trailing parentheticals like "(optional)", "(about X)"
    const name = words
      .slice(1)
      .join(" ")
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/,.*$/, "")
      .trim();
    return { name, quantity, unit };
  }

  // No recognizable unit — treat everything as name
  const name = rest
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/,.*$/, "")
    .trim();
  return { name, quantity, unit: "piece" };
}

// Parse ISO 8601 duration to minutes string: "PT1H30M" → "90"
function parseDuration(iso: string): string {
  if (!iso) return "";
  const hours = parseInt(iso.match(/(\d+)H/)?.[1] ?? "0");
  const minutes = parseInt(iso.match(/(\d+)M/)?.[1] ?? "0");
  const total = hours * 60 + minutes;
  return total > 0 ? total.toString() : "";
}

// Parse servings from various formats: 4, "4 servings", ["4 servings"]
function parseServings(raw: unknown): string {
  if (!raw) return "";
  const str = Array.isArray(raw) ? String(raw[0]) : String(raw);
  const match = str.match(/\d+/);
  return match ? match[0] : "";
}

// Strip HTML tags and normalize whitespace from a string
function cleanText(str: string): string {
  return str
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract instructions as an array of plain text strings
function extractInstructions(raw: unknown): string[] {
  if (!raw) return [];

  // Single non-array object — wrap and recurse
  if (!Array.isArray(raw) && typeof raw === "object") {
    return extractInstructions([raw]);
  }

  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map(cleanText)
      .filter(Boolean);
  }

  if (Array.isArray(raw)) {
    const results: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        const cleaned = cleanText(item);
        if (cleaned) results.push(cleaned);
      } else if (item && typeof item === "object") {
        const type = (item as any)["@type"];
        const typeStr = Array.isArray(type) ? type[0] : type;
        if (typeStr === "HowToSection") {
          // Section contains nested steps
          const nested = (item as any).itemListElement ?? [];
          for (const step of nested) {
            if (typeof step === "string") {
              const cleaned = cleanText(step);
              if (cleaned) results.push(cleaned);
            } else if (step && typeof step === "object") {
              const text = (step as any).text ?? (step as any).description ?? (step as any).name ?? "";
              if (text) results.push(cleanText(String(text)));
            }
          }
        } else {
          // HowToStep or other — try text, description, name in order
          const text = (item as any).text ?? (item as any).description ?? (item as any).name ?? "";
          if (text) results.push(cleanText(String(text)));
        }
      }
    }
    return results.filter(Boolean);
  }

  return [];
}

// Find Recipe node from any JSON-LD shape (single object, array, or @graph)
function findRecipeNode(json: unknown): Record<string, unknown> | null {
  const all = findAllRecipeNodes(json);
  return all.length > 0 ? all[0] : null;
}

// Collect ALL recipe nodes from any JSON-LD shape
function findAllRecipeNodes(json: unknown): Record<string, unknown>[] {
  if (!json || typeof json !== "object") return [];

  const isRecipe = (obj: any) => {
    const type = obj["@type"];
    if (typeof type === "string") return type === "Recipe";
    if (Array.isArray(type)) return type.includes("Recipe");
    return false;
  };

  if (Array.isArray(json)) {
    const results: Record<string, unknown>[] = [];
    for (const item of json) {
      results.push(...findAllRecipeNodes(item));
    }
    return results;
  }

  const obj = json as Record<string, unknown>;
  const results: Record<string, unknown>[] = [];

  if (isRecipe(obj)) results.push(obj);

  // Check @graph array
  if (Array.isArray(obj["@graph"])) {
    for (const item of obj["@graph"] as unknown[]) {
      results.push(...findAllRecipeNodes(item));
    }
  }

  return results;
}

// Build a ParsedRecipe from a raw schema.org Recipe node
function buildParsedRecipe(recipeNode: Record<string, unknown>): ParsedRecipe {
  const name = String(recipeNode.name ?? "").trim();
  const description = String(recipeNode.description ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const rawIngredients = recipeNode.recipeIngredient;
  const ingredients: ParsedIngredient[] =
    Array.isArray(rawIngredients) && rawIngredients.length > 0
      ? rawIngredients.map(i => parseIngredient(String(i)))
      : [{ name: "", quantity: "1", unit: "piece" }];

  const rawInstructions = recipeNode.recipeInstructions;
  const instructions = extractInstructions(rawInstructions);

  const cookTime =
    parseDuration(String(recipeNode.totalTime ?? "")) ||
    parseDuration(String(recipeNode.cookTime ?? "")) ||
    parseDuration(String(recipeNode.prepTime ?? ""));

  return {
    name,
    description: description.slice(0, 500),
    servings: parseServings(recipeNode.recipeYield),
    cookTime,
    difficulty: "easy",
    ingredients,
    instructions: instructions.length > 0 ? instructions : [""],
  };
}

// Shared fetch + HTML parse logic
async function fetchAndParseHtml(url: string): Promise<Record<string, unknown>[]> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    throw new Error("Please enter a URL starting with https://");
  }

  let response: Response;
  try {
    response = await fetch(trimmed, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch {
    throw new Error("Could not reach that URL. Check your internet connection and try again.");
  }

  if (!response.ok) {
    throw new Error(`Page returned an error (HTTP ${response.status}). Make sure the URL is correct.`);
  }

  const html = await response.text();
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  const allNodes: Record<string, unknown>[] = [];

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      allNodes.push(...findAllRecipeNodes(parsed));
    } catch {
      // Malformed JSON-LD — skip
    }
  }

  return allNodes;
}

export async function parseAllRecipesFromUrl(url: string): Promise<ParsedRecipe[]> {
  const nodes = await fetchAndParseHtml(url);
  if (nodes.length === 0) {
    throw new Error(
      "No recipe data found on this page.\n\nThis works best with major recipe sites like AllRecipes, Food Network, Simply Recipes, Serious Eats, Epicurious, and most food blogs."
    );
  }
  return nodes.map(buildParsedRecipe);
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const all = await parseAllRecipesFromUrl(url);
  return all[0];
}
