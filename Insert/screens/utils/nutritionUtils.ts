type IngredientInput = {
  name: string;
  quantity?: string | number;
  unit?: string;
};

export type RecipeMacroSummary = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servings: number;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  coverage: {
    matchedIngredients: number;
    totalIngredients: number;
    ratio: number;
  };
  source: "fallback" | "usda" | "mixed" | "none";
};

type MacroProfile = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type FoodReference = {
  aliases: string[];
  gramsPerUnit?: number;
  gramsPerCup?: number;
  gramsPerTablespoon?: number;
  gramsPerTeaspoon?: number;
  per100g: MacroProfile;
};

export type FoodQuickSuggestion = {
  name: string;
  defaultUnit: string;
  keywords: string[];
};

const ZERO_MACROS: MacroProfile = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

const GENERIC_UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  oz: 28.35,
  ounce: 28.35,
  ounces: 28.35,
  lb: 453.59,
  pound: 453.59,
  pounds: 453.59,
  tsp: 4.93,
  teaspoon: 4.93,
  teaspoons: 4.93,
  tbsp: 14.79,
  tablespoon: 14.79,
  tablespoons: 14.79,
  cup: 240,
  cups: 240,
};

const FOOD_LIBRARY: FoodReference[] = [
  {
    aliases: ["egg", "eggs"],
    gramsPerUnit: 50,
    per100g: { calories: 143, protein: 12.6, carbs: 0.7, fat: 9.5, fiber: 0 },
  },
  {
    aliases: ["chicken breast", "chicken", "boneless skinless chicken breast"],
    gramsPerUnit: 174,
    gramsPerCup: 140,
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0 },
  },
  {
    aliases: ["salmon", "salmon fillet"],
    gramsPerUnit: 154,
    per100g: { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0 },
  },
  {
    aliases: ["ground beef", "beef", "lean ground beef"],
    gramsPerCup: 220,
    per100g: { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0 },
  },
  {
    aliases: ["rice", "white rice", "cooked rice"],
    gramsPerCup: 158,
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
  },
  {
    aliases: ["brown rice"],
    gramsPerCup: 195,
    per100g: { calories: 123, protein: 2.7, carbs: 25.6, fat: 1, fiber: 1.6 },
  },
  {
    aliases: ["pasta", "spaghetti", "cooked pasta"],
    gramsPerCup: 140,
    per100g: { calories: 157, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8 },
  },
  {
    aliases: ["oats", "rolled oats"],
    gramsPerCup: 81,
    per100g: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6 },
  },
  {
    aliases: ["bread", "whole wheat bread", "white bread"],
    gramsPerUnit: 28,
    per100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
  },
  {
    aliases: ["tortilla", "flour tortilla"],
    gramsPerUnit: 49,
    per100g: { calories: 310, protein: 8.2, carbs: 51.1, fat: 7.8, fiber: 3.2 },
  },
  {
    aliases: ["milk", "whole milk", "2% milk"],
    gramsPerCup: 244,
    per100g: { calories: 50, protein: 3.4, carbs: 4.8, fat: 1.9, fiber: 0 },
  },
  {
    aliases: ["greek yogurt", "yogurt", "plain yogurt"],
    gramsPerCup: 245,
    per100g: { calories: 97, protein: 9, carbs: 3.9, fat: 5, fiber: 0 },
  },
  {
    aliases: ["cheddar cheese", "mozzarella", "parmesan", "cheese"],
    gramsPerCup: 113,
    gramsPerTablespoon: 7,
    per100g: { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0 },
  },
  {
    aliases: ["butter"],
    gramsPerTablespoon: 14.2,
    gramsPerTeaspoon: 4.7,
    per100g: { calories: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0 },
  },
  {
    aliases: ["olive oil", "oil", "vegetable oil"],
    gramsPerTablespoon: 13.5,
    gramsPerTeaspoon: 4.5,
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 },
  },
  {
    aliases: ["flour", "all-purpose flour"],
    gramsPerCup: 120,
    gramsPerTablespoon: 8,
    per100g: { calories: 364, protein: 10.3, carbs: 76.3, fat: 1, fiber: 2.7 },
  },
  {
    aliases: ["sugar", "white sugar", "brown sugar"],
    gramsPerCup: 200,
    gramsPerTablespoon: 12.5,
    gramsPerTeaspoon: 4.2,
    per100g: { calories: 387, protein: 0, carbs: 100, fat: 0, fiber: 0 },
  },
  {
    aliases: ["black beans", "beans", "cooked beans"],
    gramsPerCup: 172,
    per100g: { calories: 132, protein: 8.9, carbs: 23.7, fat: 0.5, fiber: 8.7 },
  },
  {
    aliases: ["chickpeas", "garbanzo beans"],
    gramsPerCup: 164,
    per100g: { calories: 164, protein: 8.9, carbs: 27.4, fat: 2.6, fiber: 7.6 },
  },
  {
    aliases: ["lentils", "cooked lentils"],
    gramsPerCup: 198,
    per100g: { calories: 116, protein: 9, carbs: 20.1, fat: 0.4, fiber: 7.9 },
  },
  {
    aliases: ["potato", "potatoes"],
    gramsPerUnit: 173,
    gramsPerCup: 150,
    per100g: { calories: 77, protein: 2, carbs: 17.5, fat: 0.1, fiber: 2.2 },
  },
  {
    aliases: ["sweet potato", "sweet potatoes"],
    gramsPerUnit: 130,
    per100g: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1, fiber: 3 },
  },
  {
    aliases: ["broccoli"],
    gramsPerCup: 91,
    per100g: { calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6 },
  },
  {
    aliases: ["spinach"],
    gramsPerCup: 30,
    per100g: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2 },
  },
  {
    aliases: ["onion", "yellow onion", "red onion"],
    gramsPerUnit: 110,
    gramsPerCup: 160,
    per100g: { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7 },
  },
  {
    aliases: ["garlic"],
    gramsPerUnit: 3,
    gramsPerTeaspoon: 2.8,
    per100g: { calories: 149, protein: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1 },
  },
  {
    aliases: ["tomato", "tomatoes"],
    gramsPerUnit: 123,
    gramsPerCup: 180,
    per100g: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2 },
  },
  {
    aliases: ["bell pepper", "red bell pepper", "green bell pepper"],
    gramsPerUnit: 119,
    gramsPerCup: 149,
    per100g: { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1 },
  },
  {
    aliases: ["carrot", "carrots"],
    gramsPerUnit: 61,
    gramsPerCup: 128,
    per100g: { calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8 },
  },
  {
    aliases: ["avocado"],
    gramsPerUnit: 150,
    gramsPerCup: 150,
    per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7, fiber: 6.7 },
  },
  {
    aliases: ["banana"],
    gramsPerUnit: 118,
    per100g: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6 },
  },
  {
    aliases: ["apple", "apples"],
    gramsPerUnit: 182,
    per100g: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4 },
  },
];

const usdaCache = new Map<string, MacroProfile | null>();

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const round1 = (value: number) => Math.round(value * 10) / 10;

const parseAmount = (value?: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const text = String(value).trim().toLowerCase();
  if (!text) return 0;

  const fractionMatch = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = Number(fractionMatch[1]);
    const numerator = Number(fractionMatch[2]);
    const denominator = Number(fractionMatch[3]);
    return denominator ? whole + numerator / denominator : whole;
  }

  const simpleFractionMatch = text.match(/^(\d+)\/(\d+)$/);
  if (simpleFractionMatch) {
    const numerator = Number(simpleFractionMatch[1]);
    const denominator = Number(simpleFractionMatch[2]);
    return denominator ? numerator / denominator : 0;
  }

  const numericMatch = text.match(/-?\d*\.?\d+/);
  return numericMatch ? Number(numericMatch[0]) : 0;
};

const normalizeUnit = (unit?: string) => normalizeText(unit || "");

const findFoodReference = (ingredientName: string) => {
  const normalized = normalizeText(ingredientName);
  if (!normalized) return null;

  return FOOD_LIBRARY.find((entry) =>
    entry.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias);
      return normalized === normalizedAlias || normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
    })
  ) || null;
};

const getDefaultUnitForReference = (foodReference: FoodReference): string => {
  if (foodReference.gramsPerUnit) return "pcs";
  if (foodReference.gramsPerCup) return "cup";
  if (foodReference.gramsPerTablespoon) return "tbsp";
  if (foodReference.gramsPerTeaspoon) return "tsp";
  return "g";
};

export const getNutritionFoodSuggestions = (query: string, limit = 8): FoodQuickSuggestion[] => {
  const normalizedQuery = normalizeText(query);
  const baseSuggestions = FOOD_LIBRARY.map((foodReference) => ({
    name: foodReference.aliases[0],
    defaultUnit: getDefaultUnitForReference(foodReference),
    keywords: foodReference.aliases,
  }));

  if (!normalizedQuery) {
    return baseSuggestions.slice(0, limit);
  }

  return baseSuggestions
    .filter((suggestion) =>
      suggestion.keywords.some((keyword) => {
        const normalizedKeyword = normalizeText(keyword);
        return normalizedKeyword.includes(normalizedQuery) || normalizedQuery.includes(normalizedKeyword);
      })
    )
    .slice(0, limit);
};

const gramsForIngredient = (ingredient: IngredientInput, foodReference: FoodReference | null) => {
  const amount = parseAmount(ingredient.quantity);
  if (amount <= 0) return 0;

  const unit = normalizeUnit(ingredient.unit);
  if (!unit) {
    return foodReference?.gramsPerUnit ? amount * foodReference.gramsPerUnit : 0;
  }

  if (unit in GENERIC_UNIT_TO_GRAMS && ["g", "gram", "grams", "kg", "ml", "l", "oz", "ounce", "ounces", "lb", "pound", "pounds"].includes(unit)) {
    return amount * GENERIC_UNIT_TO_GRAMS[unit];
  }

  if ((unit === "cup" || unit === "cups") && foodReference?.gramsPerCup) {
    return amount * foodReference.gramsPerCup;
  }

  if ((unit === "tbsp" || unit === "tablespoon" || unit === "tablespoons") && foodReference?.gramsPerTablespoon) {
    return amount * foodReference.gramsPerTablespoon;
  }

  if ((unit === "tsp" || unit === "teaspoon" || unit === "teaspoons") && foodReference?.gramsPerTeaspoon) {
    return amount * foodReference.gramsPerTeaspoon;
  }

  if (["pcs", "pc", "piece", "pieces", "unit", "units", "clove", "cloves", "slice", "slices"].includes(unit) && foodReference?.gramsPerUnit) {
    return amount * foodReference.gramsPerUnit;
  }

  if (unit in GENERIC_UNIT_TO_GRAMS) {
    return amount * GENERIC_UNIT_TO_GRAMS[unit];
  }

  return foodReference?.gramsPerUnit ? amount * foodReference.gramsPerUnit : 0;
};

const scaleMacros = (macros: MacroProfile, grams: number): MacroProfile => {
  const ratio = grams / 100;
  return {
    calories: macros.calories * ratio,
    protein: macros.protein * ratio,
    carbs: macros.carbs * ratio,
    fat: macros.fat * ratio,
    fiber: macros.fiber * ratio,
  };
};

const addMacros = (left: MacroProfile, right: MacroProfile): MacroProfile => ({
  calories: left.calories + right.calories,
  protein: left.protein + right.protein,
  carbs: left.carbs + right.carbs,
  fat: left.fat + right.fat,
  fiber: left.fiber + right.fiber,
});

const extractUsdaMacros = (foodNutrients: Array<{ nutrientName?: string; value?: number }>): MacroProfile => {
  const findValue = (needle: string) => {
    const match = foodNutrients.find((nutrient) => normalizeText(nutrient.nutrientName || "") === needle);
    return typeof match?.value === "number" ? match.value : 0;
  };

  return {
    calories: findValue("energy"),
    protein: findValue("protein"),
    carbs: findValue("carbohydrate by difference"),
    fat: findValue("total lipid fat"),
    fiber: findValue("fiber total dietary"),
  };
};

const fetchUsdaMacros = async (ingredientName: string): Promise<MacroProfile | null> => {
  const apiKey = process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) return null;

  const cacheKey = normalizeText(ingredientName);
  if (!cacheKey) return null;
  if (usdaCache.has(cacheKey)) return usdaCache.get(cacheKey) || null;

  try {
    const response = await fetch("https://api.nal.usda.gov/fdc/v1/foods/search?api_key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ingredientName,
        pageSize: 1,
        dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"],
      }),
    });

    if (!response.ok) {
      usdaCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();
    const firstFood = Array.isArray(data?.foods) ? data.foods[0] : null;
    const macros = firstFood?.foodNutrients ? extractUsdaMacros(firstFood.foodNutrients) : null;
    usdaCache.set(cacheKey, macros || null);
    return macros || null;
  } catch {
    usdaCache.set(cacheKey, null);
    return null;
  }
};

export const estimateRecipeMacros = async (ingredients: IngredientInput[], servingsInput?: string | number): Promise<RecipeMacroSummary> => {
  let totalMacros = { ...ZERO_MACROS };
  let matchedIngredients = 0;
  let usedFallback = false;
  let usedUsda = false;

  for (const ingredient of ingredients) {
    const name = String(ingredient.name || "").trim();
    if (!name) continue;

    const foodReference = findFoodReference(name);
    const grams = gramsForIngredient(ingredient, foodReference);
    if (grams <= 0) continue;

    let macrosPer100g: MacroProfile | null = null;

    const usdaMacros = await fetchUsdaMacros(name);
    if (usdaMacros) {
      macrosPer100g = usdaMacros;
      usedUsda = true;
    } else if (foodReference) {
      macrosPer100g = foodReference.per100g;
      usedFallback = true;
    }

    if (!macrosPer100g) continue;

    matchedIngredients += 1;
    totalMacros = addMacros(totalMacros, scaleMacros(macrosPer100g, grams));
  }

  const servingsParsed = Math.max(parseAmount(servingsInput) || 1, 1);
  const totalIngredients = ingredients.filter((ingredient) => String(ingredient.name || "").trim().length > 0).length;

  const source: RecipeMacroSummary["source"] = usedUsda && usedFallback
    ? "mixed"
    : usedUsda
      ? "usda"
      : usedFallback
        ? "fallback"
        : "none";

  return {
    calories: round1(totalMacros.calories),
    protein: round1(totalMacros.protein),
    carbs: round1(totalMacros.carbs),
    fat: round1(totalMacros.fat),
    fiber: round1(totalMacros.fiber),
    servings: servingsParsed,
    perServing: {
      calories: round1(totalMacros.calories / servingsParsed),
      protein: round1(totalMacros.protein / servingsParsed),
      carbs: round1(totalMacros.carbs / servingsParsed),
      fat: round1(totalMacros.fat / servingsParsed),
      fiber: round1(totalMacros.fiber / servingsParsed),
    },
    coverage: {
      matchedIngredients,
      totalIngredients,
      ratio: totalIngredients > 0 ? round1(matchedIngredients / totalIngredients) : 0,
    },
    source,
  };
};