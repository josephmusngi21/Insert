/**
 * Ingredient Utilities
 * Handles ingredient normalization and matching between recipes and pantry items
 */

// Define ingredient categories with base names and their variants
export const INGREDIENT_VARIANTS: Record<string, string[]> = {
  // Dairy
  milk: ["milk", "whole milk", "2% milk", "skim milk", "raw milk", "fresh milk"],
  "evaporated milk": ["evaporated milk", "condensed milk"],
  "condensed milk": ["condensed milk", "sweetened condensed milk"],
  butter: ["butter", "unsalted butter", "salted butter"],
  cheese: ["cheese", "cheddar cheese", "mozzarella cheese", "parmesan cheese", "swiss cheese"],
  yogurt: ["yogurt", "greek yogurt", "plain yogurt"],
  cream: ["cream", "heavy cream", "sour cream", "whipped cream"],
  eggs: ["eggs", "egg"],

  // Proteins
  chicken: ["chicken", "chicken breast", "chicken thigh", "ground chicken"],
  beef: ["beef", "ground beef", "beef steak"],
  pork: ["pork", "ground pork", "pork chops"],
  salmon: ["salmon", "fresh salmon"],
  tuna: ["tuna", "canned tuna"],

  // Pantry Staples
  flour: ["flour", "all-purpose flour", "whole wheat flour", "bread flour"],
  sugar: ["sugar", "white sugar", "brown sugar", "granulated sugar"],
  salt: ["salt", "table salt", "sea salt"],
  pepper: ["pepper", "black pepper", "ground pepper"],
  oil: ["oil", "vegetable oil", "olive oil", "canola oil"],

  // Vegetables
  onion: ["onion", "white onion", "yellow onion", "red onion"],
  garlic: ["garlic", "fresh garlic", "minced garlic"],
  tomato: ["tomato", "fresh tomato", "tomatoes"],
  "canned tomato": ["canned tomato", "canned tomatoes", "tomato sauce"],
  carrot: ["carrot", "carrots"],
  broccoli: ["broccoli", "fresh broccoli"],
  spinach: ["spinach", "fresh spinach"],
  lettuce: ["lettuce", "romaine lettuce", "iceberg lettuce"],
  'bell pepper': ["bell pepper", "red bell pepper", "green bell pepper", "yellow bell pepper"],

  // Fruits
  banana: ["banana", "bananas"],
  apple: ["apple", "apples"],
  orange: ["orange", "oranges"],
  lemon: ["lemon", "lemons"],
  lime: ["lime", "limes"],
  strawberry: ["strawberry", "strawberries"],

  // Grains & Pasta
  rice: ["rice", "white rice", "brown rice", "long grain rice"],
  pasta: ["pasta", "spaghetti", "penne", "fettuccine"],
  bread: ["bread", "whole wheat bread", "white bread"],

  // Spices & Seasonings
  cinnamon: ["cinnamon", "ground cinnamon"],
  vanilla: ["vanilla", "vanilla extract"],
  "baking powder": ["baking powder"],
  "baking soda": ["baking soda"],
  honey: ["honey", "raw honey"],
};

/**
 * Get the base ingredient name for any ingredient variant
 * Example: "2% milk" -> "milk", "evaporated milk" -> "evaporated milk"
 */
export const getBaseIngredient = (ingredient: string): string => {
  const normalized = ingredient.toLowerCase().trim();

  for (const [baseIngredient, variants] of Object.entries(INGREDIENT_VARIANTS)) {
    if (variants.some(variant => variant.toLowerCase() === normalized)) {
      return baseIngredient;
    }
  }

  // If no match found, return the ingredient as-is (normalized)
  return normalized;
};

/**
 * Check if a pantry item matches a recipe ingredient
 * Returns match type: 'exact', 'base', or 'none'
 */
export const matchIngredient = (
  recipeIngredient: string,
  pantryItemName: string
): "exact" | "base" | "none" => {
  const recipeBase = getBaseIngredient(recipeIngredient);
  const pantryBase = getBaseIngredient(pantryItemName);

  // Exact match (same variant)
  if (
    recipeIngredient.toLowerCase().trim() ===
    pantryItemName.toLowerCase().trim()
  ) {
    return "exact";
  }

  // Base ingredient match (same base, different variant)
  if (recipeBase === pantryBase && recipeBase !== recipeIngredient.toLowerCase().trim()) {
    return "base";
  }

  return "none";
};

/**
 * Find matching pantry items for a recipe ingredient
 * Returns array of pantry items that match
 */
export const findMatchingPantryItems = (
  recipeIngredient: string,
  pantryItems: Array<{ name: string; [key: string]: any }>
) => {
  return pantryItems.filter(
    (item) => matchIngredient(recipeIngredient, item.name) !== "none"
  );
};

/**
 * Check availability of all recipe ingredients
 * Returns: { available, missing, partialMatches }
 */
export interface IngredientAvailability {
  ingredient: string;
  available: boolean;
  matchType: "exact" | "base" | "none";
  matchedPantryItems: string[];
}

export const checkRecipeAvailability = (
  recipeIngredients: string[],
  pantryItems: Array<{ name: string; [key: string]: any }>
): {
  available: IngredientAvailability[];
  missing: IngredientAvailability[];
  partialMatches: IngredientAvailability[];
} => {
  const available: IngredientAvailability[] = [];
  const missing: IngredientAvailability[] = [];
  const partialMatches: IngredientAvailability[] = [];

  recipeIngredients.forEach((ingredient) => {
    const matchingItems = findMatchingPantryItems(ingredient, pantryItems);
    const matchType = matchingItems.length > 0 ? matchIngredient(ingredient, matchingItems[0].name) : "none";
    const matchedItemNames = matchingItems.map((item) => item.name);

    const availability: IngredientAvailability = {
      ingredient,
      available: matchingItems.length > 0,
      matchType,
      matchedPantryItems: matchedItemNames,
    };

    if (matchType === "exact") {
      available.push(availability);
    } else if (matchType === "base") {
      partialMatches.push(availability);
    } else {
      missing.push(availability);
    }
  });

  return { available, missing, partialMatches };
};
