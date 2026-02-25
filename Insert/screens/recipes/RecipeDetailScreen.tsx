/**
 * Recipe Detail Screen - Shows full recipe with ingredients and steps
 * Displays which ingredients user has in pantry and which are missing
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Button, TouchableOpacity, Alert } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, addDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface RecipeDetailScreenProps {
  recipeId?: number;
  onBack?: () => void;
  theme?: ThemeColors;
}

export default function RecipeDetailScreen({ recipeId = 1, onBack, theme }: RecipeDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [addingIngredient, setAddingIngredient] = useState<string | null>(null);
  const [shoppingListItems, setShoppingListItems] = useState<{ name: string; completed: boolean }[]>([]);
  const [pantryItems, setPantryItems] = useState<any[]>(pantryData.pantryItems);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    // Find recipe by ID or use first recipe
    const foundRecipe = recipeData.recipes.find((r) => r.id === recipeId) as Recipe | undefined;
    setRecipe(foundRecipe || (recipeData.recipes[0] as Recipe));
  }, [recipeId]);

  // Load shopping list items with real-time listener
  useEffect(() => {
    if (!userId) return;
    
    const q = query(
      collection(db, "shoppingList"),
      where("userId", "==", userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        name: doc.data().name.toLowerCase(),
        completed: doc.data().completed || false
      }));
      setShoppingListItems(items);
    }, (error) => {
      console.error("Error loading shopping list:", error);
    });
    
    return () => unsubscribe();
  }, [userId]);

  // Load pantry items from Firestore with real-time listener
  useEffect(() => {
    if (!userId) return;
    
    const q = query(
      collection(db, "pantry"),
      where("userId", "==", userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: `fs_${doc.id}`,
        name: doc.data().name || "",
        type: doc.data().type || "",
        quantity: doc.data().quantity || 0,
        unit: doc.data().unit || "",
        location: doc.data().location || "",
        expirationDate: doc.data().expirationDate || "",
      }));
      // Combine Firestore items with local pantry data
      const combinedItems = [...pantryData.pantryItems, ...items];
      setPantryItems(combinedItems);
    }, (error) => {
      console.error("Error loading pantry items:", error);
      // Fallback to local data if there's an error
      setPantryItems(pantryData.pantryItems);
    });
    
    return () => unsubscribe();
  }, [userId]);

  // Check ingredient availability in pantry and shopping list
  const getIngredientStatus = (ingredient: Ingredient): { status: 'available' | 'partial' | 'missing' | 'shopping' | 'completed' | 'expired'; inShoppingList: boolean; isCompleted: boolean } => {
    const ingredientNameLower = ingredient.name.toLowerCase();
    
    // Check if already in shopping list
    const shoppingItem = shoppingListItems.find(item => 
      item.name.includes(ingredientNameLower) || ingredientNameLower.includes(item.name)
    );

    if (shoppingItem) {
      if (shoppingItem.completed) {
        return { status: 'completed', inShoppingList: true, isCompleted: true };
      }
      return { status: 'shopping', inShoppingList: true, isCompleted: false };
    }
    
    // Try to find matching item in pantry (case-insensitive, partial match)
    // Check both name and type fields
    const matchedItem = pantryItems.find(item => {
      const itemName = (item.name || "").toLowerCase();
      const itemType = (item.type || "").toLowerCase();
      return itemName.includes(ingredientNameLower) ||
             ingredientNameLower.includes(itemName) ||
             itemType.includes(ingredientNameLower) ||
             ingredientNameLower.includes(itemType);
    });

    if (!matchedItem) {
      return { status: 'missing', inShoppingList: false, isCompleted: false };
    }

    // Check if item is expired
    if (matchedItem.expirationDate) {
      const expirationDate = new Date(matchedItem.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);
      if (expirationDate < today) {
        return { status: 'expired', inShoppingList: false, isCompleted: false };
      }
    }

    // Check if quantity is sufficient
    if (matchedItem.quantity >= ingredient.quantity) {
      return { status: 'available', inShoppingList: false, isCompleted: false };
    }

    return { status: 'partial', inShoppingList: false, isCompleted: false };
  };

  const addSingleIngredientToShoppingList = (ingredient: Ingredient) => {
    if (!userId) {
      Alert.alert("Error", "Unable to add ingredient");
      return;
    }

    // Check if already in shopping list
    if (shoppingListItems.some(item => item.name === ingredient.name.toLowerCase())) {
      Alert.alert("Info", `${ingredient.name} is already in your shopping list`);
      return;
    }

    // Update UI immediately
    setShoppingListItems([...shoppingListItems, { name: ingredient.name.toLowerCase(), completed: false }]);

    // Add to Firestore (fire and forget)
    addDoc(collection(db, "shoppingList"), {
      name: ingredient.name,
      quantity: ingredient.quantity.toString(),
      unit: ingredient.unit,
      completed: false,
      userId,
      createdAt: Date.now(),
      source: "recipe",
    }).catch(error => {
      console.error("Error adding ingredient:", error);
      setShoppingListItems(prev => 
        prev.filter(item => item.name !== ingredient.name.toLowerCase())
      );
      Alert.alert("Error", "Failed to add ingredient to shopping list");
    });
  };

  if (!recipe) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
        <Text style={{ color: themeColors.textColor }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      {onBack && (
        <TouchableOpacity style={[styles.backButton, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]} onPress={onBack}>
          <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>Back</Text>
        </TouchableOpacity>
      )}
      <ScrollView>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.title, { color: themeColors.textColor }]}>{recipe.name}</Text>
          <Text style={[styles.description, { color: themeColors.mode === "dark" ? "#bbb" : "#666" }]}>{recipe.description}</Text>

          {/* Recipe Meta Info */}
          <View style={[styles.metaContainer, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#f8f9fa" }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Servings:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.servings}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Cook Time:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.cookTime} mins</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Difficulty:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.difficulty}</Text>
            </View>
          </View>
        </View>

        {/* Ingredients Section */}
        <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => {
            const { status, isCompleted } = getIngredientStatus(ingredient);
            return (
              <View 
                key={`ingredient-${index}`} 
                style={[
                  styles.ingredientItem,
                  status === 'available' && styles.ingredientAvailable,
                  status === 'partial' && styles.ingredientPartial,
                  status === 'missing' && styles.ingredientMissing,
                  status === 'shopping' && styles.ingredientShopping,
                  status === 'completed' && styles.ingredientCompleted,
                  status === 'expired' && { backgroundColor: '#fccccb', borderLeftColor: '#d32f2f' },
                  themeColors.mode === "dark" && { backgroundColor: "#444" }
                ]}
              >
                <Text style={[styles.ingredientBullet, { color: status === 'shopping' || status === 'completed' ? '#fff' : status === 'expired' ? '#d32f2f' : themeColors.accentColor }]}>
                  {status === 'completed' ? '✓' : status === 'expired' ? '✕' : '-'}
                </Text>
                <View style={styles.ingredientContent}>
                  <Text style={[styles.ingredientName, { color: status === 'shopping' || status === 'completed' ? '#fff' : status === 'expired' ? '#d32f2f' : themeColors.textColor, textDecorationLine: status === 'completed' || status === 'expired' ? 'line-through' : 'none' }]}>
                    {ingredient.quantity} {ingredient.unit} {ingredient.name}
                  </Text>
                  <Text style={[styles.ingredientStatus, { color: status === 'shopping' || status === 'completed' ? '#e8f0ff' : status === 'expired' ? '#b71c1c' : themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
                    {status === 'available' ? '(In Stock)' : status === 'partial' ? '(Not Enough)' : status === 'shopping' ? '(On Shopping List)' : status === 'completed' ? '(Purchased)' : status === 'expired' ? '(Expired)' : '(Missing)'}
                  </Text>
                </View>
                {(status === 'missing' || status === 'partial' || status === 'expired') && (
                  <TouchableOpacity 
                    onPress={() => addSingleIngredientToShoppingList(ingredient)}
                    style={[styles.addIngredientButton, { backgroundColor: themeColors.accentColor }]}
                  >
                    <Text style={styles.addIngredientButtonText}>+</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Instructions Section */}
        <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={`instruction-${index}`} style={[styles.instructionItem, { borderBottomColor: themeColors.mode === "dark" ? "#555" : "#f0f0f0" }]}>
              <Text style={[styles.instructionNumber, { color: themeColors.accentColor }]}>{index + 1}.</Text>
              <Text style={[styles.instructionText, { color: themeColors.mode === "dark" ? "#ddd" : "#555" }]}>{instruction}</Text>
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
    paddingTop: 50,
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
  ingredientHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addShoppingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addShoppingButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  ingredientItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    alignItems: "center",
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
  ingredientShopping: {
    backgroundColor: "#4A90E2",
    borderLeftWidth: 4,
    borderLeftColor: "#2E5C8A",
  },
  ingredientCompleted: {
    backgroundColor: "#28a745",
    borderLeftWidth: 4,
    borderLeftColor: "#1e7e34",
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
  addIngredientButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addIngredientButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
