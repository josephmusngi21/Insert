/**
 * Recipe Detail Screen - Shows full recipe with ingredients and steps
 * Displays which ingredients user has in pantry and which are missing
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRecipeAvailability } from "../components/hooks/useRecipeAvailability";
import recipeData from "./example/recipes.json";
import pantryData from "../pantry/example/data.json";

interface Recipe {
  id: number;
  name: string;
  description: string;
  servings: number;
  cookTime: number;
  ingredients: string[];
  instructions: string[];
  difficulty: string;
  cuisine: string;
}

interface Props {
  recipeId?: number;
}

export default function RecipeDetailScreen({ recipeId = 1 }: Props) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    // Find recipe by ID or use first recipe
    const foundRecipe = recipeData.recipes.find((r) => r.id === recipeId);
    setRecipe(foundRecipe || (recipeData.recipes[0] as Recipe));
  }, [recipeId]);

  const availability = useRecipeAvailability(
    recipe?.ingredients || [],
    pantryData.pantryItems
  );

  if (!recipe) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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

        {/* Availability Summary */}
        <View
          style={[
            styles.availabilitySummary,
            availability.canMakeRecipe
              ? styles.canMakeBg
              : styles.cannotMakeBg,
          ]}
        >
          <Text style={styles.availabilityTitle}>
            {availability.canMakeRecipe ? "✓ You can make this!" : "Missing ingredients"}
          </Text>
          <Text style={styles.availabilityPercent}>
            {availability.percentageAvailable}% of ingredients available
          </Text>
        </View>
      </View>

      {/* Ingredients Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>

        {/* Available Ingredients */}
        {availability.available.length > 0 && (
          <View>
            <Text style={styles.subsectionTitle}>✓ Available</Text>
            {availability.available.map((item, index) => (
              <View key={`available-${index}`} style={styles.ingredientItem}>
                <View style={[styles.ingredientDot, styles.availableDot]} />
                <View style={styles.ingredientText}>
                  <Text style={styles.ingredientName}>{item.ingredient}</Text>
                  {item.matchedPantryItems.length > 0 && (
                    <Text style={styles.ingredientMatch}>
                      You have: {item.matchedPantryItems.join(", ")}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Partial Matches */}
        {availability.partialMatches.length > 0 && (
          <View style={styles.partialSection}>
            <Text style={styles.subsectionTitle}>⚠ Similar Available</Text>
            {availability.partialMatches.map((item, index) => (
              <View key={`partial-${index}`} style={styles.ingredientItem}>
                <View style={[styles.ingredientDot, styles.partialDot]} />
                <View style={styles.ingredientText}>
                  <Text style={styles.ingredientName}>{item.ingredient}</Text>
                  {item.matchedPantryItems.length > 0 && (
                    <Text style={styles.ingredientMatch}>
                      You have: {item.matchedPantryItems.join(", ")} (not exact match)
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Missing Ingredients */}
        {availability.missing.length > 0 && (
          <View style={styles.missingSection}>
            <Text style={styles.subsectionTitle}>✗ Missing</Text>
            {availability.missing.map((item, index) => (
              <View key={`missing-${index}`} style={styles.ingredientItem}>
                <View style={[styles.ingredientDot, styles.missingDot]} />
                <Text style={[styles.ingredientName, styles.missingText]}>
                  {item.ingredient}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Instructions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instructions</Text>
        {recipe.instructions.map((instruction, index) => (
          <View key={`instruction-${index}`} style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>{index + 1}</Text>
            <Text style={styles.instructionText}>{instruction}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    marginBottom: 16,
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
  availabilitySummary: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  canMakeBg: {
    backgroundColor: "#d4edda",
  },
  cannotMakeBg: {
    backgroundColor: "#f8d7da",
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  availabilityPercent: {
    fontSize: 14,
    color: "#555",
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
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
    marginTop: 12,
    marginBottom: 8,
  },
  partialSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  missingSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
  },
  ingredientDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  availableDot: {
    backgroundColor: "#28a745",
  },
  partialDot: {
    backgroundColor: "#ffc107",
  },
  missingDot: {
    backgroundColor: "#dc3545",
  },
  ingredientText: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    textTransform: "capitalize",
  },
  ingredientMatch: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  missingText: {
    color: "#dc3545",
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
