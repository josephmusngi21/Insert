export type DietaryRestrictionSchema = {
  name: string;
  allowedIngredients: string[];
};

// Centralized dietary filter schematics used by recipe browse filters.
export const DIETARY_RESTRICTIONS: Record<string, DietaryRestrictionSchema> = {
  vegan: {
    name: "Vegan",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds"
    ]
  },
  vegetarian: {
    name: "Vegetarian",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds",
      "eggs", "cheese", "parmesan cheese", "milk", "butter", "yogurt"
    ]
  },
  glutenfree: {
    name: "Gluten-Free",
    allowedIngredients: [
      "rice", "sugar", "salt", "pepper", "black pepper", "olive oil",
      "oil", "garlic", "onion", "tomato", "canned tomato", "bell pepper",
      "basil", "lettuce", "lemon", "vegetable", "carrot", "broccoli",
      "spinach", "mushroom", "bean", "chickpea", "eggs", "cheese",
      "parmesan cheese", "milk", "butter", "yogurt", "chicken", "chicken breast",
      "salmon", "fish", "beef", "ground beef", "meat", "soy sauce", "vinegar"
    ]
  },
  dairyfree: {
    name: "Dairy-Free",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds",
      "chicken", "chicken breast", "salmon", "fish", "beef", "ground beef", "meat", "eggs"
    ]
  }
};
