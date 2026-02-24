/**
 * useRecipeAvailability Hook
 * Checks which ingredients from a recipe are available in the pantry
 */

import { useState, useMemo } from "react";
import {
  checkRecipeAvailability,
  IngredientAvailability,
} from "../utils/ingredientUtils";

interface RecipeAvailabilityResult {
  available: IngredientAvailability[];
  missing: IngredientAvailability[];
  partialMatches: IngredientAvailability[];
  canMakeRecipe: boolean;
  percentageAvailable: number;
}

export const useRecipeAvailability = (
  recipeIngredients: string[],
  pantryItems: Array<{ name: string; [key: string]: any }>
): RecipeAvailabilityResult => {
  const result = useMemo(() => {
    const { available, missing, partialMatches } = checkRecipeAvailability(
      recipeIngredients,
      pantryItems
    );

    const canMakeRecipe = missing.length === 0; // Can make if no missing ingredients
    const percentageAvailable = recipeIngredients.length > 0
      ? Math.round(
          ((available.length + partialMatches.length) / recipeIngredients.length) * 100
        )
      : 0;

    return {
      available,
      missing,
      partialMatches,
      canMakeRecipe,
      percentageAvailable,
    };
  }, [recipeIngredients, pantryItems]);

  return result;
};
