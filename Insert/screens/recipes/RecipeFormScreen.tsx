/**
 * Recipe Form Screen - Add or edit recipes
 * Handles title, description, ingredients, steps, and dietary tags
 */

import { useState } from "react";
import { View, Text, TextInput, ScrollView, Button, TouchableOpacity, StyleSheet, Alert } from "react-native";

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

  const handleNameChange = (text: string) => {
    setFormData({ ...formData, name: text });
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      <Text style={[styles.header, { color: themeColors.textColor }]}>Add New Recipe</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: "#4CAF50",
  },
  stepDotInactive: {
    backgroundColor: "#ddd",
  },
  stepDotText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  stepContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: "#f9f9f9",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: -8,
    marginBottom: 12,
  },
  difficultyButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  difficultyButtonActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  difficultyButtonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
  },
  ingredientRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    alignItems: "flex-end",
  },
  ingredientInput: {
    flex: 2,
    marginBottom: 0,
  },
  quantityInput: {
    flex: 1,
    marginBottom: 0,
  },
  unitInput: {
    flex: 1,
    marginBottom: 0,
  },
  instructionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  instructionNumber: {
    fontWeight: "bold",
    marginTop: 14,
    color: "#666",
    width: 24,
  },
  instructionInput: {
    flex: 1,
    marginBottom: 0,
    minHeight: 60,
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: "#f44336",
    fontWeight: "bold",
    fontSize: 16,
  },
  reviewCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  reviewSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
    color: "#333",
  },
  reviewInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
    lineHeight: 20,
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
});