/**
 * Recipe Detail Screen - Shows full recipe with ingredients and steps
 * Displays which ingredients user has in pantry and which are missing
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Button, TouchableOpacity } from "react-native";
import recipeData from "./example/recipes.json";
import pantryData from "../pantry/example/data.json";

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  id: number;
  name: string;
  description: string;
  servings: number;
  cookTime: number;
  ingredients: Ingredient[];
  instructions: string[];
  difficulty: string;
  cuisine: string;
}

interface RecipeDetailScreenProps {
  recipeId?: number;
  onBack?: () => void;
}

export default function RecipeDetailScreen({ recipeId = 1, onBack }: RecipeDetailScreenProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    // Find recipe by ID or use first recipe
    const foundRecipe = recipeData.recipes.find((r) => r.id === recipeId) as Recipe | undefined;
    setRecipe(foundRecipe || (recipeData.recipes[0] as Recipe));
  }, [recipeId]);

  // Check ingredient availability in pantry
  const getIngredientStatus = (ingredient: Ingredient): 'available' | 'partial' | 'missing' => {
    const pantryItems = pantryData.pantryItems as any[];
    
    // Try to find matching item in pantry (case-insensitive, partial match)
    const matchedItem = pantryItems.find(item => 
      item.name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(item.name.toLowerCase()) ||
      item.type.toLowerCase().includes(ingredient.name.toLowerCase()) ||
      ingredient.name.toLowerCase().includes(item.type.toLowerCase())
    );

    if (!matchedItem) {
      return 'missing';
    }

    // Check if quantity is sufficient
    if (matchedItem.quantity >= ingredient.quantity) {
      return 'available';
    }

    return 'partial';
  };

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{recipe.name}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          {/* Recipe Meta Info */}
          <View style={styles.metaContainer}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Servings:</Text>
              <Text style={styles.metaValue}>{recipe.servings}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Cook Time:</Text>
              <Text style={styles.metaValue}>{recipe.cookTime} mins</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Difficulty:</Text>
              <Text style={styles.metaValue}>{recipe.difficulty}</Text>
            </View>
          </View>
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => {
            const status = getIngredientStatus(ingredient);
            return (
              <View 
                key={`ingredient-${index}`} 
                style={[
                  styles.ingredientItem,
                  status === 'available' && styles.ingredientAvailable,
                  status === 'partial' && styles.ingredientPartial,
                  status === 'missing' && styles.ingredientMissing,
                ]}
              >
                <Text style={styles.ingredientBullet}>-</Text>
                <View style={styles.ingredientContent}>
                  <Text style={styles.ingredientName}>
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </Text>
                  <Text style={styles.ingredientStatus}>
                    {status === 'available' ? '(In Stock)' : status === 'partial' ? '(Not Enough)' : '(Missing)'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Instructions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={`instruction-${index}`} style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>{index + 1}.</Text>
              <Text style={styles.instructionText}>{instruction}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    zIndex: 10,
    marginTop: 50,
  },
  backButtonText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "600",
  },
  header: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
  },
  metaItem: {
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  section: {
    backgroundColor: "#ffffff",
    marginTop: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  ingredientAvailable: {
    backgroundColor: "#d4edda",
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  ingredientPartial: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  ingredientMissing: {
    backgroundColor: "#f8d7da",
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  ingredientBullet: {
    fontSize: 16,
    color: "#2e7d32",
    marginRight: 12,
    fontWeight: "600",
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    textTransform: "capitalize",
  },
  ingredientStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
    marginRight: 12,
    minWidth: 24,
  },
  instructionText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
    lineHeight: 20,
  },
});
