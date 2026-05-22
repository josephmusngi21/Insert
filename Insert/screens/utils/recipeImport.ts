/**
 * Recipe Import Utility
 * Fetches a recipe URL and extracts recipe data using JSON-LD structured data
 * (schema.org Recipe markup used by AllRecipes, FoodNetwork, SimplyRecipes, etc.)
 */

export type ParsedIngredient = {
  name: string;
  quantity: string;
  unit: string;
  sourceText?: string;
};

export type ParsedRecipe = {
  name: string;
  description: string;
  servings: string;
  cookTime: string;
  difficulty: string;
  ingredients: ParsedIngredient[];
  instructions: string[];
  imageUrl?: string;
  imageCandidates?: string[];
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

  // Remove common list/markdown prefixes and noisy suffixes from ingredient lines
  str = str
    .replace(/^\s*[-*•#]+\s+/, "")
    .replace(/\s[#*]+\s*.*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  const sourceText = str;

  const looksLikeSectionHeader = (value: string): boolean => {
    const v = value.trim();
    if (!v) return true;
    if (/^for\b.+:\s*$/i.test(v)) return true;
    if (/^[a-z][a-z\s'&-]{1,50}:\s*$/i.test(v)) return true;
    return false;
  };

  const cleanIngredientName = (value: string): string => {
    return value
      .replace(/\([^)]*$/g, "")
      .replace(/,.*$/, "")
      .replace(/\s+for\s+(sprinkling|frying|serving|garnish(?:ing)?|drizzling|dusting|coating|dipping|topping)\b.*$/i, "")
      .replace(/\s+(to taste|as needed)\b.*$/i, "")
      .replace(/^\s*(quality|good[-\s]?quality|best[-\s]?quality)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  if (looksLikeSectionHeader(str)) {
    return { name: "", quantity: "", unit: "", sourceText };
  }

  // Normalize unicode fractions
  str = normalizeFractions(str);

  // Match leading quantity: handles "1", "1.5", "1/2", "1 1/2"
  const quantityRegex = /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)/;
  const qMatch = str.match(quantityRegex);

  if (!qMatch) {
    // No quantity found — use "1" as default, entire string is name
    const name = cleanIngredientName(str);
    if (!name || looksLikeSectionHeader(name)) return { name: "", quantity: "", unit: "", sourceText };
    return { name, quantity: "1", unit: "piece", sourceText };
  }

  const rawQty = qMatch[1].trim();
  const quantity = evaluateFraction(rawQty);
  const rest = str.slice(qMatch[0].length).trim();

  // Check if the first word is a known unit
  const words = rest.split(/\s+/);
  const firstWordLower = words[0]?.toLowerCase() ?? "";

  if (ALL_UNITS.map(u => u.toLowerCase()).includes(firstWordLower)) {
    const parsedUnit = UNIT_NORMALIZE[words[0]] ?? UNIT_NORMALIZE[firstWordLower] ?? firstWordLower;
    let parsedQuantity = quantity;

    // The parenthetical value often contains normalized metric quantity, e.g. "4 ounces (113g)".
    const unitTail = words
      .slice(1)
      .join(" ");
    const parenMetricMatch = unitTail.match(/\((\d+(?:\.\d+)?)\s*(g|kg|ml|l)\)/i);
    if (parenMetricMatch) {
      parsedQuantity = parenMetricMatch[1];
      parsedUnit = UNIT_NORMALIZE[parenMetricMatch[2].toLowerCase()] ?? parenMetricMatch[2].toLowerCase();
    }

    // Remove parentheticals like "(113g)", "(optional)", "(about X)" from ingredient name.
    const name = cleanIngredientName(unitTail)
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/^\W+/, "")
      .trim();
    if (!name || looksLikeSectionHeader(name)) return { name: "", quantity: "", unit: "", sourceText };
    return { name, quantity: parsedQuantity, unit: parsedUnit, sourceText };
  }

  // No recognizable unit — treat everything as name
  const name = cleanIngredientName(rest)
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim();
  if (!name || looksLikeSectionHeader(name)) return { name: "", quantity: "", unit: "", sourceText };
  return { name, quantity, unit: "piece", sourceText };
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
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/!\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]+\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/^\s*[#>*|`~]+\s*/g, "")
    .replace(/\s*[#>*|`~]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract instructions as an array of plain text strings
function splitInstructionText(raw: string): string[] {
  if (!raw) return [];

  const linePieces = raw
    .replace(/\r/g, "\n")
    .split(/\n+/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  const splitByNumbering = (text: string): string[] => {
    // Example patterns: "1. ... 2. ...", "Step 1: ... Step 2: ...", "1) ..."
    const tokenized = text
      .replace(/(?:^|\s)(?:step\s*)?\d+\s*[).:-]\s+/gi, " ||| ")
      .trim();

    const numberedParts = tokenized
      .split("|||")
      .map((part) => cleanText(part))
      .filter(Boolean);

    if (numberedParts.length > 1) return numberedParts;
    return [text];
  };

  const out: string[] = [];
  for (const line of linePieces.length > 0 ? linePieces : [cleanText(raw)]) {
    for (const maybeNumbered of splitByNumbering(line)) {
      // Fallback split for very long clumped directions without numbering.
      const sentenceParts = maybeNumbered
        .split(/[.!?]\s+(?=[A-Z])/)
        .map((part) => cleanText(part))
        .filter(Boolean);

      if (sentenceParts.length > 1 && maybeNumbered.length >= 120) {
        out.push(...sentenceParts);
      } else {
        out.push(maybeNumbered);
      }
    }
  }

  return [...new Set(out.map((step) => cleanText(step)).filter(Boolean))];
}

function extractInstructions(raw: unknown): string[] {
  if (!raw) return [];

  // Single non-array object — wrap and recurse
  if (!Array.isArray(raw) && typeof raw === "object") {
    return extractInstructions([raw]);
  }

  if (typeof raw === "string") {
    return splitInstructionText(raw);
  }

  if (Array.isArray(raw)) {
    const results: string[] = [];
    for (const item of raw) {
      if (typeof item === "string") {
        results.push(...splitInstructionText(item));
      } else if (item && typeof item === "object") {
        const type = (item as any)["@type"];
        const typeStr = Array.isArray(type) ? type[0] : type;
        if (typeStr === "HowToSection") {
          // Section contains nested steps
          const nested = (item as any).itemListElement ?? [];
          for (const step of nested) {
            if (typeof step === "string") {
              results.push(...splitInstructionText(step));
            } else if (step && typeof step === "object") {
              const text = (step as any).text ?? (step as any).description ?? (step as any).name ?? "";
              if (text) results.push(...splitInstructionText(String(text)));
            }
          }
        } else {
          // HowToStep or other — try text, description, name in order
          const text = (item as any).text ?? (item as any).description ?? (item as any).name ?? "";
          if (text) results.push(...splitInstructionText(String(text)));
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
function extractImageCandidates(raw: unknown): string[] {
  const out: string[] = [];
  const pushUrl = (value: unknown) => {
    if (typeof value !== "string") return;
    const url = value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) return;
    out.push(url);
  };

  const walk = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string") {
      pushUrl(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      pushUrl(obj.url);
      pushUrl(obj.contentUrl);
      pushUrl(obj.thumbnailUrl);
      pushUrl(obj["@id"]);
    }
  };

  walk(raw);

  // Keep order but dedupe.
  return [...new Set(out)];
}

function buildParsedRecipe(recipeNode: Record<string, unknown>, pageImageCandidates: string[] = []): ParsedRecipe {
  const name = cleanText(String(recipeNode.name ?? ""));
  const description = cleanText(String(recipeNode.description ?? ""));

  const rawIngredients = recipeNode.recipeIngredient;
  const ingredients: ParsedIngredient[] =
    Array.isArray(rawIngredients) && rawIngredients.length > 0
      ? rawIngredients
          .map(i => parseIngredient(String(i)))
          .filter((ingredient) => ingredient.name.trim().length > 0)
      : [{ name: "", quantity: "1", unit: "piece" }];

  const rawInstructions = recipeNode.recipeInstructions;
  const instructions = extractInstructions(rawInstructions);

  const cookTime =
    parseDuration(String(recipeNode.totalTime ?? "")) ||
    parseDuration(String(recipeNode.cookTime ?? "")) ||
    parseDuration(String(recipeNode.prepTime ?? ""));

  const recipeImages = extractImageCandidates(recipeNode.image);
  const imageCandidates = [...new Set([...recipeImages, ...pageImageCandidates])].slice(0, 12);

  return {
    name,
    description: description.slice(0, 500),
    servings: parseServings(recipeNode.recipeYield),
    cookTime,
    difficulty: "easy",
    ingredients,
    instructions: instructions.length > 0 ? instructions : [""],
    imageUrl: imageCandidates[0] || "",
    imageCandidates,
  };
}

// Shared fetch + HTML parse logic
type ParsedHtmlPayload = {
  recipeNodes: Record<string, unknown>[];
  pageImageCandidates: string[];
};

async function fetchAndParseHtml(url: string): Promise<ParsedHtmlPayload> {
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
  const imageMetaRegex = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|og:image:url|twitter:image:src)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  const allNodes: Record<string, unknown>[] = [];
  const pageImageCandidates: string[] = [];

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      allNodes.push(...findAllRecipeNodes(parsed));
    } catch {
      // Malformed JSON-LD — skip
    }
  }

  while ((match = imageMetaRegex.exec(html)) !== null) {
    const maybeUrl = (match[1] || "").trim();
    if (/^https?:\/\//i.test(maybeUrl)) pageImageCandidates.push(maybeUrl);
  }

  return {
    recipeNodes: allNodes,
    pageImageCandidates: [...new Set(pageImageCandidates)].slice(0, 12),
  };
}

export async function parseAllRecipesFromUrl(url: string): Promise<ParsedRecipe[]> {
  const { recipeNodes, pageImageCandidates } = await fetchAndParseHtml(url);
  const nodes = recipeNodes;
  if (nodes.length === 0) {
    throw new Error(
      "No recipe data found on this page.\n\nThis works best with major recipe sites like AllRecipes, Food Network, Simply Recipes, Serious Eats, Epicurious, and most food blogs."
    );
  }
  return nodes.map((node) => buildParsedRecipe(node, pageImageCandidates));
}

export async function parseRecipeFromUrl(url: string): Promise<ParsedRecipe> {
  const all = await parseAllRecipesFromUrl(url);
  return all[0];
}
