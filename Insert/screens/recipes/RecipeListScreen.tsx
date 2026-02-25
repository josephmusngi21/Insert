/**
 * Recipe List Screen - Displays all recipes (user's and public)
 * Supports filtering by dietary tags and search by title/ingredients
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Button } from "react-native";
import recipes from "./example/recipes.json";
import RecipeFormScreen from "./RecipeFormScreen";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

type Recipe = {
  id: number;
  name: string;
  description?: string;
  servings: string | number;
  cookTime: string | number;
  difficulty: string;
  ingredients: Array<{ id?: number; name: string; quantity: string; unit: string }>;
  instructions: string[];
};

interface RecipeListScreenProps {
  onRecipeSelect?: (recipeId: number) => void;
  theme?: ThemeColors;
}

export default function RecipeListScreen({ onRecipeSelect, theme }: RecipeListScreenProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>(recipes.recipes);
  const [showAddForm, setShowAddForm] = useState(false);

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const handleRecipeSaved = (newRecipe: any) => {
    const recipe: Recipe = {
      id: Math.max(...recipeList.map((r) => r.id), 0) + 1,
      name: newRecipe.name,
      description: "",
      servings: newRecipe.servings,
      cookTime: newRecipe.cookTime,
      difficulty: newRecipe.difficulty,
      ingredients: newRecipe.ingredients,
      instructions: newRecipe.instructions,
    };
    setRecipeList([...recipeList, recipe]);
    setShowAddForm(false);
  };

  if (showAddForm) {
    return (
      <RecipeFormScreen
        onRecipeSaved={handleRecipeSaved}
        onCancel={() => setShowAddForm(false)}
        theme={themeColors}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Recipes</Text>
        <Button title="+ Add Recipe" onPress={() => setShowAddForm(true)} color={themeColors.accentColor} />
      </View>

      {recipeList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: themeColors.textColor }]}>No recipes yet</Text>
          <Text style={styles.emptyStateSubtext}>Add your first recipe to get started</Text>
        </View>
      ) : (
        recipeList.map((recipe) => (
          <TouchableOpacity 
            key={recipe.id} 
            style={[styles.recipeCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
            onPress={() => onRecipeSelect?.(recipe.id)}
          >
            <Text style={[styles.recipeName, { color: themeColors.textColor }]}>{recipe.name}</Text>
            {recipe.description && (
              <Text style={[styles.recipeDescription, { color: themeColors.textColor }]}>{recipe.description}</Text>
            )}
            <View style={styles.recipeInfo}>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Cook: {recipe.cookTime} min</Text>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Servings: {recipe.servings}</Text>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Difficulty: {recipe.difficulty}</Text>
            </View>
            <Text style={[styles.ingredients, { color: themeColors.textColor }]}>
              Ingredients: {recipe.ingredients.length} items
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#bbb",
  },
  recipeCard: {
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  infoText: {
    fontSize: 12,
    marginRight: 12,
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
