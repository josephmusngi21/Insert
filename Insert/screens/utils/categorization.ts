/**
 * Recipe categorization utilities for browsing and filtering recipes
 */

export type RecipeBrowseCategory = "all" | "breakfast" | "lunch" | "dinner" | "snack" | "dessert";

export interface RecipeCategoryOption {
  key: RecipeBrowseCategory;
  label: string;
}

export const RECIPE_CATEGORY_OPTIONS: RecipeCategoryOption[] = [
  { key: "all", label: "All" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
  { key: "dessert", label: "Dessert" },
];

/**
 * Keywords that indicate a recipe belongs to a specific meal category
 */
const CATEGORY_KEYWORDS: Record<Exclude<RecipeBrowseCategory, "all">, string[]> = {
  breakfast: [
    "breakfast", "pancake", "waffle", "oatmeal", "eggs", "toast", "cereal",
    "smoothie", "bagel", "croissant", "muffin", "breakfast sandwich", "egg",
    "french toast", "scrambled", "bacon", "sausage", "omelet", "acai"
  ],
  lunch: [
    "lunch", "sandwich", "salad", "wrap", "bowl", "poke", "taco", "burrito",
    "burger", "sub", "panini", "reuben", "club sandwich", "lunch"
  ],
  dinner: [
    "dinner", "pasta", "steak", "fish", "salmon", "chicken", "beef", "pork",
    "roast", "stew", "curry", "risotto", "paella", "baked", "grilled", "fried",
    "sautéed", "braised", "meatball", "lasagna", "casserole"
  ],
  snack: [
    "snack", "chips", "dip", "hummus", "trail mix", "granola", "popcorn",
    "nuts", "fruit", "yogurt", "cheese", "crackers", "bar", "bite", "appetizer"
  ],
  dessert: [
    "dessert", "cake", "pie", "cookie", "brownie", "chocolate", "ice cream",
    "pudding", "mousse", "tart", "cheesecake", "candy", "fudge", "donut",
    "cupcake", "tiramisu", "sweet", "sugar"
  ],
};

/**
 * Determine the meal category for a recipe based on its name, description, and ingredients
 */
export function getRecipeBrowseCategory(recipe: {
  name?: string;
  description?: string;
  ingredients?: Array<{ name?: string }>;
}): RecipeBrowseCategory {
  const searchText = [
    recipe.name || "",
    recipe.description || "",
    ...(recipe.ingredients?.map((ing) => ing.name || "") || []),
  ]
    .join(" ")
    .toLowerCase();

  // Check keywords for each category (in priority order: dessert, breakfast, snack, lunch, dinner)
  for (const category of ["dessert", "breakfast", "snack", "lunch", "dinner"] as const) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords.some((keyword) => searchText.includes(keyword.toLowerCase()))) {
      return category;
    }
  }

  // Default to dinner if no specific category matches
  return "dinner";
}

/**
 * Perform a text search across multiple fields
 */
export function matchesSearch(searchFields: (string | number)[], query: string): boolean {
  if (!query || query.trim() === "") {
    return true;
  }

  const lowerQuery = query.toLowerCase();
  return searchFields.some(
    (field) =>
      field &&
      String(field)
        .toLowerCase()
        .includes(lowerQuery)
  );
}
