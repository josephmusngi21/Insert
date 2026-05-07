/**
 * Recipe Form Screen - Add or edit recipes
 * Handles title, description, ingredients, steps, and dietary tags
 */

import { useState } from "react";
import { View, Text, TextInput, ScrollView, Button, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { addDoc } from "firebase/firestore";
import { recipesCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { parseAllRecipesFromUrl, ParsedRecipe } from "@/screens/utils/recipeImport";
import styles from "./RecipeFormScreen.styles";

type Ingredient = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
};

type RecipeFormData = {
  name: string;
  description: string;
  servings: string;
  cookTime: string;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
};

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface RecipeFormScreenProps {
  onRecipeSaved?: (recipe: RecipeFormData) => void;
  onCancel?: () => void;
  theme?: ThemeColors;
}

const COOKING_UNITS = [
  "ml", "L", "g", "kg", "oz", "lb", "tsp", "tbsp", "cup"
];

export default function RecipeFormScreen({ onRecipeSaved, onCancel, theme }: RecipeFormScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [step, setStep] = useState<"name" | "description" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review">("name");
  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
    description: "",
    servings: "",
    cookTime: "",
    difficulty: "easy",
    ingredients: [{ id: 1, name: "", quantity: "", unit: "" }],
    instructions: [""],
  });
  const [currentIngredientId, setCurrentIngredientId] = useState(2);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  // Picker state — shown when a URL has multiple recipes
  const [pickerRecipes, setPickerRecipes] = useState<ParsedRecipe[] | null>(null);
  const [pickerSelected, setPickerSelected] = useState<Set<number>>(new Set());

  const handleNameChange = (text: string) => {
    setFormData({ ...formData, name: text });
  };

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      Alert.alert("No URL", "Please paste a recipe URL first.");
      return;
    }
    setIsImporting(true);
    try {
      const parsed = await parseAllRecipesFromUrl(importUrl.trim());
      setImportUrl("");

      if (parsed.length === 1) {
        // Single recipe — fill form directly
        applyParsedRecipe(parsed[0]);
      } else {
        // Multiple recipes — show picker
        setPickerRecipes(parsed);
        setPickerSelected(new Set(parsed.map((_, i) => i)));
      }
    } catch (err: any) {
      Alert.alert("Import Failed", err?.message ?? "Something went wrong. Try a different URL.");
    } finally {
      setIsImporting(false);
    }
  };

  const applyParsedRecipe = (parsed: ParsedRecipe) => {
    const ingredients = parsed.ingredients.map((ing, idx) => ({
      id: idx + 1,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    }));
    setFormData({
      name: parsed.name,
      description: parsed.description,
      servings: parsed.servings,
      cookTime: parsed.cookTime,
      difficulty: parsed.difficulty,
      ingredients: ingredients.length > 0 ? ingredients : [{ id: 1, name: "", quantity: "", unit: "" }],
      instructions: parsed.instructions.length > 0 ? parsed.instructions : [""],
    });
    setCurrentIngredientId(ingredients.length + 1);
    setPickerRecipes(null);
    setStep("review");
  };

  const handlePickerConfirm = async () => {
    if (pickerSelected.size === 0) {
      Alert.alert("Nothing selected", "Please select at least one recipe.");
      return;
    }

    const selected = pickerRecipes!.filter((_, i) => pickerSelected.has(i));

    if (selected.length === 1) {
      // Single selection → fill form
      applyParsedRecipe(selected[0]);
      return;
    }

    // Multiple selections → save directly to Firestore, then close form
    const auth = getAuth();
    const uid = auth.currentUser?.uid || "";
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in to save recipes.");
      return;
    }

    setIsImporting(true);
    let saved = 0;
    let failed = 0;
    for (const recipe of selected) {
      try {
        await addDoc(recipesCol(userId), {
          userId: uid,
          name: recipe.name,
          description: recipe.description || "",
          servings: recipe.servings,
          cookTime: recipe.cookTime,
          difficulty: recipe.difficulty,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
        });
        saved++;
      } catch {
        failed++;
      }
    }
    setIsImporting(false);
    setPickerRecipes(null);

    const msg = failed > 0
      ? `${saved} recipe${saved !== 1 ? "s" : ""} saved, ${failed} failed.`
      : `${saved} recipe${saved !== 1 ? "s" : ""} saved successfully!`;
    Alert.alert("Import Complete", msg, [{ text: "Done", onPress: onCancel }]);
  };

  const handleDescriptionChange = (text: string) => {
    setFormData({ ...formData, description: text });
  };

  const handleServingsChange = (text: string) => {
    setFormData({ ...formData, servings: text });
  };

  const handleCookTimeChange = (text: string) => {
    setFormData({ ...formData, cookTime: text });
  };

  const handleAddIngredient = () => {
    const newIngredient: Ingredient = {
      id: currentIngredientId,
      name: "",
      quantity: "",
      unit: "",
    };
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, newIngredient],
    });
    setCurrentIngredientId(currentIngredientId + 1);
  };

  const handleIngredientChange = (id: number, field: string, value: string) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      ),
    });
  };

  const handleRemoveIngredient = (id: number) => {
    if (formData.ingredients.length > 1) {
      setFormData({
        ...formData,
        ingredients: formData.ingredients.filter((ing) => ing.id !== id),
      });
    }
  };

  const handleAddInstruction = () => {
    setFormData({
      ...formData,
      instructions: [...formData.instructions, ""],
    });
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInstructions = [...formData.instructions];
    newInstructions[index] = value;
    setFormData({ ...formData, instructions: newInstructions });
  };

  const handleRemoveInstruction = (index: number) => {
    if (formData.instructions.length > 1) {
      setFormData({
        ...formData,
        instructions: formData.instructions.filter((_, i) => i !== index),
      });
    }
  };

  const handleSaveRecipe = () => {
    console.log("Attempting to save recipe...");
    
    // Validate recipe name
    if (!formData.name || !formData.name.trim()) {
      console.log("Missing recipe name");
      Alert.alert("Missing Recipe Name", "Please enter a recipe name");
      setStep("name");
      return;
    }

    // Validate description (optional, but if provided shouldn't be blank)
    if (formData.description && !formData.description.trim()) {
      console.log("Description is blank but was started");
      Alert.alert("Incomplete Description", "Please complete the description or leave it empty");
      setStep("description");
      return;
    }

    // Servings is now optional - defaults to "--"
    // Cook time is now optional - defaults to "--"

    // Validate ingredients - must have name, quantity, and unit
    const invalidIngredients = formData.ingredients.filter(
      (ing) => !ing.name.trim() || !ing.quantity.trim() || !ing.unit.trim()
    );
    if (invalidIngredients.length > 0) {
      console.log("Invalid ingredients:", invalidIngredients);
      Alert.alert(
        "Incomplete Ingredients",
        "All ingredients must have a name, quantity, and unit. Please fill in or remove blank ingredients."
      );
      setStep("ingredients");
      return;
    }

    // Validate instructions - at least 1 instruction with text (allow single instruction)
    const validInstructions = formData.instructions.filter((inst) => inst.trim());
    if (validInstructions.length === 0) {
      console.log("Missing instructions");
      Alert.alert(
        "Missing Instructions",
        "Please add at least one cooking instruction"
      );
      setStep("instructions");
      return;
    }

    console.log("All validations passed, showing confirmation");
    
    // Show unified confirmation dialog
    const servingsDisplay = formData.servings.trim() || "--";
    const cookTimeDisplay = formData.cookTime.trim() || "--";
    
    const recipePreview = `Recipe: ${formData.name}
Servings: ${servingsDisplay}
Cook Time: ${cookTimeDisplay} minutes
Difficulty: ${formData.difficulty}
Ingredients: ${formData.ingredients.length} items
Instructions: ${validInstructions.length} steps`;

    Alert.alert(
      "Save Recipe?",
      recipePreview,
      [
        {
          text: "Keep Editing",
          onPress: () => console.log("Continue editing"),
          style: "cancel",
        },
        {
          text: "Discard",
          onPress: onCancel,
          style: "destructive",
        },
        {
          text: "Save & Close",
          onPress: () => {
            console.log("Saving recipe...");
            onRecipeSaved?.(formData);
            onCancel?.();
          },
          style: "default",
        },
      ]
    );
  };

  const nextStep = () => {
    const steps: Array<"name" | "description" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review"> = [
      "name",
      "description",
      "servings",
      "cookTime",
      "difficulty",
      "ingredients",
      "instructions",
      "review",
    ];
    const currentIndex = steps.indexOf(step);

    // Validate current step before moving to next
    if (step === "name") {
      if (!formData.name || !formData.name.trim()) {
        Alert.alert("Missing Recipe Name", "Please enter a recipe name");
        return;
      }
    }

    if (step === "description") {
      if (formData.description && !formData.description.trim()) {
        Alert.alert("Incomplete Description", "Please complete the description or leave it empty");
        return;
      }
    }

    // Servings is now optional - no validation needed

    // Cook time is now optional - no validation needed

    if (step === "ingredients") {
      const blankIngredients = formData.ingredients.filter(
        (ing) => !ing.name.trim() || !ing.quantity.trim() || !ing.unit.trim()
      );
      if (blankIngredients.length > 0) {
        Alert.alert(
          "Incomplete Ingredients",
          "Please fill in all ingredient fields (name, quantity, and unit) or remove blank ingredients."
        );
        return;
      }
    }

    if (step === "instructions") {
      const validInstructions = formData.instructions.filter((inst) => inst.trim());
      if (validInstructions.length === 0) {
        Alert.alert(
          "Missing Instructions",
          "Please add at least one cooking instruction"
        );
        return;
      }
    }

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Array<"name" | "description" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review"> = [
      "name",
      "description",
      "servings",
      "cookTime",
      "difficulty",
      "ingredients",
      "instructions",
      "review",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const StepIndicator = () => {
    const steps = ["Name", "Description", "Servings", "Cook Time", "Difficulty", "Ingredients", "Instructions", "Review"];
    const currentIndex = ["name", "description", "servings", "cookTime", "difficulty", "ingredients", "instructions", "review"].indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i <= currentIndex ? { backgroundColor: themeColors.accentColor } : styles.stepDotInactive,
            ]}
          >
            <Text style={styles.stepDotText}>{i + 1}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ── Recipe Picker (multiple recipes found) ──────────────────────────────
  if (pickerRecipes) {
    const numSelected = pickerSelected.size;
    const allSelected = numSelected === pickerRecipes.length;
    const toggleAll = () => {
      if (allSelected) setPickerSelected(new Set());
      else setPickerSelected(new Set(pickerRecipes.map((_, i) => i)));
    };
    const toggleOne = (i: number) => {
      const next = new Set(pickerSelected);
      if (next.has(i)) next.delete(i); else next.add(i);
      setPickerSelected(next);
    };

    return (
      <ScrollView
        style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <TouchableOpacity onPress={() => setPickerRecipes(null)} style={{ marginRight: 10 }}>
            <Ionicons name="chevron-back" size={22} color={themeColors.accentColor} />
          </TouchableOpacity>
          <Text style={[styles.header, { marginBottom: 0, flex: 1, color: themeColors.textColor }]}>
            {pickerRecipes.length} Recipes Found
          </Text>
        </View>
        <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", fontSize: 14, marginBottom: 16, lineHeight: 20 }}>
          Select one to review in the form, or select multiple to save them all at once.
        </Text>

        {/* Select All toggle */}
        <TouchableOpacity
          onPress={toggleAll}
          style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 6, borderWidth: 2,
            borderColor: themeColors.accentColor,
            backgroundColor: allSelected ? themeColors.accentColor : "transparent",
            alignItems: "center", justifyContent: "center", marginRight: 8,
          }}>
            {allSelected && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={{ color: themeColors.textColor, fontSize: 14, fontWeight: "600" }}>
            {allSelected ? "Deselect All" : "Select All"}
          </Text>
        </TouchableOpacity>

        {/* Recipe cards */}
        {pickerRecipes.map((recipe, i) => {
          const selected = pickerSelected.has(i);
          return (
            <TouchableOpacity
              key={i}
              onPress={() => toggleOne(i)}
              style={[
                styles.stepContainer,
                {
                  backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff",
                  borderWidth: 2,
                  borderColor: selected ? themeColors.accentColor : "transparent",
                  marginBottom: 12,
                }
              ]}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                  borderColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ccc"),
                  backgroundColor: selected ? themeColors.accentColor : "transparent",
                  alignItems: "center", justifyContent: "center",
                  marginRight: 10, marginTop: 2, flexShrink: 0,
                }}>
                  {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewTitle, { color: themeColors.textColor, marginBottom: 6 }]} numberOfLines={2}>
                    {recipe.name || "Untitled Recipe"}
                  </Text>
                  {recipe.description ? (
                    <Text style={[styles.reviewText, { color: themeColors.mode === "dark" ? "#bbb" : "#666" }]} numberOfLines={2}>
                      {recipe.description}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                    {recipe.servings ? (
                      <Text style={{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#888" }}>
                        {recipe.servings} servings
                      </Text>
                    ) : null}
                    {recipe.cookTime ? (
                      <Text style={{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#888" }}>
                        {recipe.cookTime} min
                      </Text>
                    ) : null}
                    <Text style={{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#888" }}>
                      {recipe.ingredients.length} ingredients
                    </Text>
                    <Text style={{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#888" }}>
                      {recipe.instructions.length} steps
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Action buttons */}
        <View style={[styles.navigationButtons, { marginTop: 8 }]}>
          <TouchableOpacity
            onPress={() => setPickerRecipes(null)}
            style={[styles.importButton, { backgroundColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0", flex: 1 }]}
          >
            <Text style={[styles.importButtonText, { color: themeColors.mode === "dark" ? "#fff" : "#333" }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePickerConfirm}
            disabled={numSelected === 0 || isImporting}
            style={[styles.importButton, {
              backgroundColor: numSelected === 0 ? "#ccc" : themeColors.accentColor,
              flex: 2,
              opacity: isImporting ? 0.7 : 1,
            }]}
          >
            {isImporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.importButtonText}>
                  {numSelected === 0
                    ? "Select a Recipe"
                    : numSelected === 1
                    ? "Review in Form"
                    : `Save All ${numSelected} Recipes`}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.header, { color: themeColors.textColor }]}>Add New Recipe</Text>

      {/* Import from URL card */}
      <View style={[styles.importCard, { borderColor: themeColors.accentColor + "55", backgroundColor: themeColors.mode === "dark" ? "#1e2e1e" : "#f0faf0" }]}>
        <View style={styles.importCardHeader}>
          <Ionicons name="link" size={18} color={themeColors.accentColor} />
          <Text style={[styles.importCardTitle, { color: themeColors.textColor }]}>Import from a Website</Text>
        </View>
        <Text style={[styles.importCardSubtitle, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
          Paste a URL from AllRecipes, Food Network, Simply Recipes, Serious Eats, Epicurious, or any recipe blog.
        </Text>
        <View style={styles.importRow}>
          <TextInput
            style={[styles.importInput, {
              color: themeColors.textColor,
              borderColor: themeColors.mode === "dark" ? "#555" : "#d0d0d0",
              backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff",
            }]}
            placeholder="https://www.allrecipes.com/recipe/..."
            placeholderTextColor={themeColors.mode === "dark" ? "#666" : "#bbb"}
            value={importUrl}
            onChangeText={setImportUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleImportFromUrl}
            editable={!isImporting}
          />
          <TouchableOpacity
            style={[styles.importButton, { backgroundColor: themeColors.accentColor, opacity: isImporting ? 0.7 : 1 }]}
            onPress={handleImportFromUrl}
            disabled={isImporting}
          >
            {isImporting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.importButtonText}>Import</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#e0e0e0" }]} />
        <Text style={[styles.dividerText, { color: themeColors.mode === "dark" ? "#777" : "#aaa" }]}>or fill in manually</Text>
        <View style={[styles.dividerLine, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#e0e0e0" }]} />
      </View>

      <StepIndicator />

      {step === "name" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Recipe Name</Text>
          <TextInput
            style={[styles.input, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
            placeholder="Enter recipe name (e.g., Spaghetti Carbonara)"
            placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
            value={formData.name}
            onChangeText={handleNameChange}
          />
        </View>
      )}

      {step === "description" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Description</Text>
          <TextInput
            style={[styles.input, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9", height: 100, textAlignVertical: "top" }]}
            placeholder="Enter a brief description of your recipe"
            placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
            value={formData.description}
            onChangeText={handleDescriptionChange}
            multiline
            maxLength={500}
          />
          <Text style={[styles.charCount, { color: themeColors.mode === "dark" ? "#999" : "#999" }]}>
            {formData.description.length}/500
          </Text>
        </View>
      )}

      {step === "servings" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Servings</Text>
          <TextInput
            style={[styles.input, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
            placeholder="Number of servings"
            placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
            keyboardType="numeric"
            value={formData.servings}
            onChangeText={handleServingsChange}
          />
        </View>
      )}

      {step === "cookTime" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Cook Time (minutes)</Text>
          <TextInput
            style={[styles.input, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
            placeholder="Enter cook time in minutes"
            placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
            keyboardType="numeric"
            value={formData.cookTime}
            onChangeText={handleCookTimeChange}
          />
        </View>
      )}

      {step === "difficulty" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Difficulty Level</Text>
          <View style={styles.difficultyButtons}>
            {["easy", "medium", "hard"].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  formData.difficulty === level && { backgroundColor: themeColors.accentColor },
                  formData.difficulty !== level && { borderColor: themeColors.mode === "dark" ? "#666" : "#ddd" },
                ]}
                onPress={() => setFormData({ ...formData, difficulty: level })}
              >
                <Text style={[styles.difficultyButtonText, { color: formData.difficulty === level ? "#fff" : themeColors.textColor }]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === "ingredients" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Ingredients</Text>
          {formData.ingredients.map((ingredient, index) => (
            <View key={ingredient.id}>
              <View style={styles.ingredientRow}>
                <TextInput
                  style={[styles.input, styles.ingredientInput, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
                  placeholder="Ingredient name"
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  value={ingredient.name}
                  onChangeText={(text) => handleIngredientChange(ingredient.id, "name", text)}
                />
                <TextInput
                  style={[styles.input, styles.quantityInput, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
                  placeholder="Qty"
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  keyboardType="decimal-pad"
                  value={ingredient.quantity}
                  onChangeText={(text) => handleIngredientChange(ingredient.id, "quantity", text)}
                />
                {formData.ingredients.length > 1 && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: "#f44336" }]}
                    onPress={() => handleRemoveIngredient(ingredient.id)}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Quick Unit Buttons */}
              <View style={{ marginBottom: 12 }}>
                <Text style={[{ color: themeColors.mode === "dark" ? "#aaa" : "#666", fontSize: 12, marginBottom: 8, marginHorizontal: 4 }]}>
                  Quick units:
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginHorizontal: 4 }}>
                  {COOKING_UNITS.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => handleIngredientChange(ingredient.id, "unit", unit)}
                      style={[{ 
                        paddingHorizontal: 11, 
                        paddingVertical: 7, 
                        borderRadius: 6, 
                        backgroundColor: ingredient.unit === unit ? themeColors.accentColor : (themeColors.mode === "dark" ? "#555" : "#ddd")
                      }]}
                    >
                      <Text style={[{ color: ingredient.unit === unit ? "#fff" : themeColors.textColor, fontSize: 12, fontWeight: "500" }]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))}
          <Button title="Add Ingredient" color={themeColors.accentColor} onPress={handleAddIngredient} />
        </View>
      )}

      {step === "instructions" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Instructions</Text>
          {formData.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={[styles.instructionNumber, { color: themeColors.accentColor }]}>{index + 1}</Text>
              <TextInput
                style={[styles.input, styles.instructionInput, { color: themeColors.textColor, borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}
                placeholder={`Step ${index + 1}`}
                placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                multiline
                value={instruction}
                onChangeText={(text) => handleInstructionChange(index, text)}
              />
              {formData.instructions.length > 1 && (
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: "#f44336" }]}
                  onPress={() => handleRemoveInstruction(index)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Button title="Add Step" color={themeColors.accentColor} onPress={handleAddInstruction} />
        </View>
      )}

      {step === "review" && (
        <View style={[styles.stepContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.label, { color: themeColors.textColor }]}>Review Recipe</Text>
          <View style={[styles.reviewCard, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9" }]}>
            <Text style={[styles.reviewTitle, { color: themeColors.textColor }]}>{formData.name}</Text>
            {formData.description && (
              <Text style={[styles.reviewText, { color: themeColors.mode === "dark" ? "#ddd" : "#666", marginBottom: 12, fontStyle: "italic" }]}>
                {formData.description}
              </Text>
            )}
            <Text style={[styles.reviewInfo, { color: themeColors.textColor }]}>Servings: {formData.servings || "--"}</Text>
            <Text style={[styles.reviewInfo, { color: themeColors.textColor }]}>Cook Time: {formData.cookTime || "--"} {formData.cookTime ? "min" : ""}</Text>
            <Text style={[styles.reviewInfo, { color: themeColors.textColor }]}>Difficulty: {formData.difficulty}</Text>

            <Text style={[styles.reviewSubtitle, { color: themeColors.textColor }]}>Ingredients:</Text>
            {formData.ingredients.map((ing) => (
              <Text key={ing.id} style={[styles.reviewText, { color: themeColors.mode === "dark" ? "#ddd" : "#666" }]}>
                • {ing.name} - {ing.quantity} {ing.unit}
              </Text>
            ))}

            <Text style={[styles.reviewSubtitle, { color: themeColors.textColor }]}>Instructions:</Text>
            {formData.instructions.map((inst, index) => (
              <Text key={index} style={[styles.reviewText, { color: themeColors.mode === "dark" ? "#ddd" : "#666" }]}>
                {index + 1}. {inst}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={styles.navigationButtons}>
        {step !== "name" && (
          <Button title="← Back" color={themeColors.accentColor} onPress={prevStep} />
        )}
        {step !== "review" && (
          <Button title="Next →" color={themeColors.accentColor} onPress={nextStep} />
        )}
        {step === "review" && (
          <Button title="Save Recipe" onPress={handleSaveRecipe} color={themeColors.accentColor} />
        )}
      </View>

      {onCancel && (
        <Button 
          title="Cancel" 
          onPress={() => {
            Alert.alert(
              "Cancel Recipe",
              "Are you sure you want to cancel? Any unsaved changes will be lost.",
              [
                {
                  text: "Keep Editing",
                  onPress: () => console.log("Continue editing"),
                  style: "cancel",
                },
                {
                  text: "Discard",
                  onPress: onCancel,
                  style: "destructive",
                },
              ]
            );
          }} 
          color="#f44336" 
        />
      )}
    </ScrollView>
  );
}