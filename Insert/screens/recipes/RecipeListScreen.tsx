/**
 * Recipe List Screen - Displays all recipes (user's and public)
 * Supports filtering by dietary tags and search by title/ingredients
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Button, Alert } from "react-native";
import recipes from "./example/recipes.json";
import RecipeFormScreen from "./RecipeFormScreen";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Dietary restrictions with their allowed ingredients
const DIETARY_RESTRICTIONS: Record<string, { name: string; allowedIngredients: string[] }> = {
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

type Recipe = {
  id: string;
  name: string;
  description?: string;
  servings: string | number;
  cookTime: string | number;
  difficulty: string;
  ingredients: Array<{ id?: number; name: string; quantity: string; unit: string }>;
  instructions: string[];
};

interface RecipeListScreenProps {
  onRecipeSelect?: (recipeId: string) => void;
  theme?: ThemeColors;
  userAllergies?: string[];
  showRecipeForm?: boolean;
  setShowRecipeForm?: (show: boolean) => void;
}

export default function RecipeListScreen({ onRecipeSelect, theme, userAllergies = [], showRecipeForm = false, setShowRecipeForm = () => {} }: RecipeListScreenProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>(recipes.recipes.map((r, i) => ({ ...r, id: `local_${r.id}` } as Recipe)));
  const [filterByAllergies, setFilterByAllergies] = useState(false);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  // Load recipes from Firestore with real-time listener
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "recipes"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreRecipes = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        servings: doc.data().servings,
        cookTime: doc.data().cookTime,
        difficulty: doc.data().difficulty,
        ingredients: doc.data().ingredients,
        instructions: doc.data().instructions,
      } as Recipe));
      
      // Combine local recipes with Firestore recipes
      const localRecipes = recipes.recipes.map((r, i) => ({ ...r, id: `local_${r.id}` } as Recipe));
      setRecipeList([...localRecipes, ...firestoreRecipes]);
    }, (error) => {
      console.error("Error loading recipes:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Check if a recipe matches all selected dietary restrictions
  const recipeMatchesDiets = (recipe: Recipe, dietKeys: string[]): boolean => {
    if (dietKeys.length === 0) return true;

    return dietKeys.every((dietKey) => {
      const diet = DIETARY_RESTRICTIONS[dietKey];
      if (!diet) return true;

      return recipe.ingredients.every((ingredient) => {
        const ingredientName = ingredient.name.toLowerCase().trim();
        return diet.allowedIngredients.some((allowed) => ingredientName.includes(allowed));
      });
    });
  };

  // Check if a recipe is safe for user allergies
  const recipeSafeForAllergies = (recipe: Recipe): boolean => {
    if (userAllergies.length === 0) return true;

    return recipe.ingredients.every((ingredient) => {
      const ingredientName = ingredient.name.toLowerCase().trim();
      return !userAllergies.some((allergen) => ingredientName.includes(allergen.toLowerCase()));
    });
  };

  // Filter recipes based on selected diets and allergies
  let filteredRecipes = selectedDiets.length > 0
    ? recipeList.filter((recipe) => recipeMatchesDiets(recipe, selectedDiets))
    : recipeList;

  // Apply allergy filter if enabled
  if (filterByAllergies && userAllergies.length > 0) {
    filteredRecipes = filteredRecipes.filter((recipe) => recipeSafeForAllergies(recipe));
  }


  const handleRecipeSaved = async (newRecipe: any) => {
    try {
      console.log("handleRecipeSaved called with:", newRecipe.name);
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, "recipes"), {
        userId,
        name: newRecipe.name,
        description: newRecipe.description || "",
        servings: newRecipe.servings,
        cookTime: newRecipe.cookTime,
        difficulty: newRecipe.difficulty,
        ingredients: newRecipe.ingredients,
        instructions: newRecipe.instructions,
      });
      
      console.log("Recipe saved with ID:", docRef.id);
      console.log("Closing form now...");
      
      // Close the form first
      setShowRecipeForm(false);
      
      // Then show the alert and navigate
      setTimeout(() => {
        Alert.alert(
          "Recipe Saved!",
          `"${newRecipe.name}" has been saved successfully.`,
          [
            {
              text: "View Recipe",
              onPress: () => {
                console.log("Navigating to recipe:", docRef.id);
                onRecipeSelect?.(docRef.id);
              }
            },
            {
              text: "OK",
              style: "cancel"
            }
          ]
        );
      }, 100);
    } catch (error) {
      console.error("Error saving recipe:", error);
      Alert.alert("Error", "Failed to save recipe");
    }
  };

  if (showRecipeForm) {
    return (
      <RecipeFormScreen
        onRecipeSaved={handleRecipeSaved}
        onCancel={() => setShowRecipeForm(false)}
        theme={themeColors}
      />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Recipes</Text>
        <Button title="+ Add Recipe" onPress={() => setShowRecipeForm(true)} color={themeColors.accentColor} />
      </View>

      {/* Dietary Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedDiets.length === 0 && { backgroundColor: themeColors.accentColor },
            selectedDiets.length === 0 && { borderColor: themeColors.accentColor },
            selectedDiets.length > 0 && { backgroundColor: "transparent", borderColor: "#ccc" }
          ]}
          onPress={() => setSelectedDiets([])}
        >
          <Text style={[styles.filterButtonText, selectedDiets.length === 0 && { color: "#fff" }, selectedDiets.length > 0 && { color: themeColors.textColor }]}>
            All
          </Text>
        </TouchableOpacity>

        {Object.entries(DIETARY_RESTRICTIONS).map(([key, diet]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              selectedDiets.includes(key) && { backgroundColor: themeColors.accentColor },
              selectedDiets.includes(key) && { borderColor: themeColors.accentColor },
              !selectedDiets.includes(key) && { backgroundColor: "transparent", borderColor: "#ccc" }
            ]}
            onPress={() => {
              if (selectedDiets.includes(key)) {
                setSelectedDiets(selectedDiets.filter(d => d !== key));
              } else {
                setSelectedDiets([...selectedDiets, key]);
              }
            }}
          >
            <Text style={[styles.filterButtonText, selectedDiets.includes(key) && { color: "#fff" }, !selectedDiets.includes(key) && { color: themeColors.textColor }]}>
              {diet.name}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Allergies Filter Button */}
        {userAllergies.length > 0 && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterByAllergies && { backgroundColor: "#ff6b6b" },
              filterByAllergies && { borderColor: "#ff6b6b" },
              !filterByAllergies && { backgroundColor: "transparent", borderColor: "#ccc" }
            ]}
            onPress={() => setFilterByAllergies(!filterByAllergies)}
          >
            <Text style={[styles.filterButtonText, filterByAllergies && { color: "#fff" }, !filterByAllergies && { color: themeColors.textColor }]}>
              Safe 🚫
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: themeColors.textColor }]}>
            {selectedDiets.length > 0 ? "No recipes match these filters" : "No recipes yet"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedDiets.length > 0 ? "Try selecting a different diet or add a new recipe" : "Add your first recipe to get started"}
          </Text>
        </View>
      ) : (
        filteredRecipes.map((recipe) => (
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
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Cook: {recipe.cookTime ? `${recipe.cookTime} min` : "--"}</Text>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Servings: {recipe.servings || "--"}</Text>
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
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
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
