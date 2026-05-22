/**
 * Recipe List Screen - Displays all recipes (user's and public)
 * Supports filtering by dietary tags and search by title/ingredients
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Animated, TextInput } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, addDoc, deleteDoc } from "firebase/firestore";
import { recipesCol, recipesDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { RECIPE_CATEGORY_OPTIONS, RecipeBrowseCategory, getRecipeBrowseCategory, matchesSearch } from "@/screens/utils/categorization";
import styles from "./RecipeListScreen.styles";
import RecipeFormScreen from "./RecipeFormScreen";

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
  onBackToAddChoice?: () => void;
}

export default function RecipeListScreen({ onRecipeSelect, theme, userAllergies = [], showRecipeForm = false, setShowRecipeForm = () => {}, onBackToAddChoice }: RecipeListScreenProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);
  const [filterByAllergies, setFilterByAllergies] = useState(false);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<RecipeBrowseCategory>("all");
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const recipeSearchInputRef = useRef<any>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRecipeSearchChange = (value: string) => {
    setSearchQuery(value);
    requestAnimationFrame(() => {
      recipeSearchInputRef.current?.focus?.();
    });
  };

  const showToast = (message: string, success: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, success });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };
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

    const unsubscribe = onSnapshot(recipesCol(userId), (snapshot) => {
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
      
      setRecipeList(firestoreRecipes);
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

  const filteredRecipes = useMemo(() => {
    let next = selectedDiets.length > 0
      ? recipeList.filter((recipe) => recipeMatchesDiets(recipe, selectedDiets))
      : recipeList;

    if (filterByAllergies && userAllergies.length > 0) {
      next = next.filter((recipe) => recipeSafeForAllergies(recipe));
    }

    next = next.filter((recipe) => {
      const derivedCategory = getRecipeBrowseCategory({
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
      });

      const categoryMatches = selectedCategory === "all" || derivedCategory === selectedCategory;
      const searchMatches = matchesSearch(
        [
          recipe.name,
          recipe.description,
          recipe.difficulty,
          recipe.cookTime,
          recipe.servings,
          ...recipe.ingredients.map((ingredient) => ingredient.name),
          derivedCategory,
        ],
        searchQuery
      );

      return categoryMatches && searchMatches;
    });

    return next;
  }, [filterByAllergies, recipeList, searchQuery, selectedCategory, selectedDiets, userAllergies]);


  const handleRecipeSaved = async (newRecipe: any) => {
    try {
      await addDoc(recipesCol(userId), {
        userId,
        name: newRecipe.name,
        description: newRecipe.description || "",
        servings: newRecipe.servings,
        cookTime: newRecipe.cookTime,
        difficulty: newRecipe.difficulty,
        ingredients: newRecipe.ingredients,
        instructions: newRecipe.instructions,
      });
      setShowRecipeForm(false);
      showToast(`"${newRecipe.name}" saved!`, true);
    } catch (error) {
      showToast("Failed to save recipe. Try again.", false);
    }
  };

  const handleDeleteRecipeFromList = (recipe: Recipe) => {
    Alert.alert(
      "Delete Recipe",
      `Delete "${recipe.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(recipesDoc(userId, recipe.id));
            showToast(`"${recipe.name}" deleted.`, true);
          } catch {
            showToast("Failed to delete.", false);
          }
        }},
      ]
    );
  };

  return (
    <>
      <RecipeFormScreen
        visible={showRecipeForm}
        editRecipeId={editingRecipe?.id}
        initialData={editingRecipe ? {
          name: editingRecipe.name,
          description: editingRecipe.description || "",
          servings: String(editingRecipe.servings || ""),
          cookTime: String(editingRecipe.cookTime || ""),
          difficulty: editingRecipe.difficulty || "easy",
          ingredients: editingRecipe.ingredients.map((ing, i) => ({ id: i + 1, name: ing.name, quantity: String(ing.quantity || "1"), unit: ing.unit || "" })),
          instructions: editingRecipe.instructions.length > 0 ? editingRecipe.instructions : [""],
        } : undefined}
        onRecipeSaved={editingRecipe ? () => {
          showToast(`"${editingRecipe.name}" updated!`, true);
          setEditingRecipe(null);
          setShowRecipeForm(false);
        } : handleRecipeSaved}
        onCancel={() => { setEditingRecipe(null); setShowRecipeForm(false); }}
        onBack={editingRecipe ? undefined : onBackToAddChoice}
        theme={themeColors}
        existingRecipeNames={editingRecipe ? [] : recipeList.map(r => r.name)}
      />
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Recipes</Text>
      </View>

      <View style={[styles.searchSection, { borderBottomColor: themeColors.mode === "dark" ? "#333" : "#ececec" }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff", borderColor: themeColors.mode === "dark" ? "#444" : "#e3e3e3" }]}>
          <Text style={[styles.searchIcon, { color: themeColors.mode === "dark" ? "#888" : "#999" }]}>⌕</Text>
          <TextInput
            ref={recipeSearchInputRef}
            style={[styles.searchInput, { color: themeColors.textColor }]}
            placeholder="Search recipes, ingredients, difficulty..."
            placeholderTextColor={themeColors.mode === "dark" ? "#777" : "#aaa"}
            value={searchQuery}
            onChangeText={handleRecipeSearchChange}
            blurOnSubmit={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
              <Text style={[styles.clearSearchText, { color: themeColors.mode === "dark" ? "#bbb" : "#888" }]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: themeColors.mode === "dark" ? "#cfcfcf" : "#6c6c6c" }]}>Meal Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} keyboardShouldPersistTaps="handled" keyboardDismissMode="none">
          {RECIPE_CATEGORY_OPTIONS.map((category) => {
            const selected = selectedCategory === category.key;
            return (
              <TouchableOpacity
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"),
                    borderColor: "transparent",
                  },
                ]}
              >
                {selected && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={[styles.categoryChipText, { color: selected ? "#fff" : themeColors.textColor, fontWeight: selected ? "700" : "500" }]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 16, color: themeColors.mode === "dark" ? "#cfcfcf" : "#6c6c6c" }]}>Dietary Preferences</Text>
      {/* Dietary Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer} keyboardShouldPersistTaps="handled">
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
            All Diets
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
      </ScrollView>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: themeColors.textColor }]}>
            {selectedDiets.length > 0 || selectedCategory !== "all" || searchQuery ? "No recipes match this search" : "No recipes yet"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedDiets.length > 0 || selectedCategory !== "all" || searchQuery ? "Try another category, adjust the search, or remove a filter" : "Add your first recipe to get started"}
          </Text>
        </View>
      ) : (
        filteredRecipes.map((recipe) => (
          <TouchableOpacity 
            key={recipe.id} 
            style={[styles.recipeCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
            onPress={() => onRecipeSelect?.(recipe.id)}
            onLongPress={() => Alert.alert(
              recipe.name || "Recipe",
              "What would you like to do?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Edit Recipe", onPress: () => { setEditingRecipe(recipe); setShowRecipeForm(true); } },
                { text: "Delete Recipe", style: "destructive", onPress: () => handleDeleteRecipeFromList(recipe) },
              ]
            )}
            delayLongPress={400}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Text style={[styles.recipeName, { color: themeColors.textColor, flex: 1 }]}>{recipe.name}</Text>
              <Ionicons name="ellipsis-horizontal" size={16} color={themeColors.mode === "dark" ? "#666" : "#ccc"} style={{ marginTop: 2, marginLeft: 8 }} />
            </View>
            {recipe.description && (
              <Text style={[styles.recipeDescription, { color: themeColors.textColor }]}>{recipe.description}</Text>
            )}
            <View style={styles.recipeMetaRow}>
              <View style={[styles.recipeMetaChip, { backgroundColor: themeColors.mode === "dark" ? "#243326" : "#edf8ef" }]}>
                <Text style={[styles.recipeMetaChipText, { color: themeColors.accentColor }]}>
                  {RECIPE_CATEGORY_OPTIONS.find((option) => option.key === getRecipeBrowseCategory({ name: recipe.name, description: recipe.description, ingredients: recipe.ingredients }))?.label ?? "Dinner"}
                </Text>
              </View>
            </View>
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
    </>
  );
}
