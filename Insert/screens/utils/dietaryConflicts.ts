export const DIETARY_CONFLICT_KEYWORDS: Record<string, string[]> = {
  vegan: ["beef", "pork", "chicken", "fish", "salmon", "tuna", "shrimp", "egg", "milk", "cheese", "butter", "yogurt", "honey", "gelatin"],
  vegetarian: ["beef", "pork", "chicken", "fish", "salmon", "tuna", "shrimp", "anchovy", "gelatin", "bacon", "sausage", "ham"],
  pescatarian: ["beef", "pork", "chicken", "turkey", "lamb", "bacon", "sausage", "ham", "gelatin"],
  "gluten-free": ["wheat", "barley", "rye", "flour", "bread", "pasta", "noodle", "soy sauce", "breadcrumbs", "cracker"],
  "dairy-free": ["milk", "cheese", "butter", "cream", "yogurt", "ghee", "whey"],
  keto: ["sugar", "honey", "syrup", "bread", "pasta", "rice", "potato", "flour", "corn", "beans"],
  "low-carb": ["sugar", "honey", "syrup", "bread", "pasta", "rice", "potato", "flour", "corn"],
  halal: ["pork", "ham", "bacon", "lard", "gelatin", "wine", "beer", "rum", "vodka"],
  kosher: ["pork", "shellfish", "shrimp", "crab", "lobster"],
};

export function getDietaryConflicts(ingredientNames: string[], restrictions: string[] = []): string[] {
  if (!restrictions.length || !ingredientNames.length) return [];

  const combined = ingredientNames
    .map((ingredient) => String(ingredient || "").toLowerCase().trim())
    .filter(Boolean)
    .join(" ");

  return restrictions.filter((restriction) => {
    const key = String(restriction).toLowerCase().trim();
    const conflictKeywords = DIETARY_CONFLICT_KEYWORDS[key];
    if (conflictKeywords?.length) {
      return conflictKeywords.some((keyword) => combined.includes(keyword));
    }
    return combined.includes(key);
  });
}
