/**
 * Recipe List Screen - Displays all recipes (user's and public)
 * Supports filtering by dietary tags and search by title/ingredients
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import recipes from "./example/recipes.json";

interface RecipeListScreenProps {
  onRecipeSelect?: (recipeId: number) => void;
}

export default function RecipeListScreen({ onRecipeSelect }: RecipeListScreenProps) {
  const [recipeList] = useState(recipes.recipes);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Recipes</Text>
      {recipeList.map((recipe) => (
        <TouchableOpacity 
          key={recipe.id} 
          style={styles.recipeCard}
          onPress={() => onRecipeSelect?.(recipe.id)}
        >
          <Text style={styles.recipeName}>{recipe.name}</Text>
          <Text style={styles.recipeDescription}>{recipe.description}</Text>
          <View style={styles.recipeInfo}>
            <Text style={styles.infoText}>Cook: {recipe.cookTime} min</Text>
            <Text style={styles.infoText}>Servings: {recipe.servings}</Text>
            <Text style={styles.infoText}>Difficulty: {recipe.difficulty}</Text>
          </View>
          <Text style={styles.ingredients}>
            Ingredients: {recipe.ingredients.length} items
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
    marginTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  recipeCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  recipeInfo: {
    flexDirection: "row",
    marginBottom: 8,
    flexWrap: "wrap",
  },
  infoText: {
    fontSize: 12,
    color: "#888",
    marginRight: 12,
    marginBottom: 4,
  },
  ingredients: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
