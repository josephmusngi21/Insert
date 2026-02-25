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
  servings: string;
  cookTime: string;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
};

interface RecipeFormScreenProps {
  onRecipeSaved?: (recipe: RecipeFormData) => void;
  onCancel?: () => void;
}

export default function RecipeFormScreen({ onRecipeSaved, onCancel }: RecipeFormScreenProps) {
  const [step, setStep] = useState<"name" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review">("name");
  const [formData, setFormData] = useState<RecipeFormData>({
    name: "",
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
    if (!formData.name.trim()) {
      Alert.alert("Error", "Recipe name is required");
      return;
    }
    if (!formData.servings.trim()) {
      Alert.alert("Error", "Servings is required");
      return;
    }
    if (!formData.cookTime.trim()) {
      Alert.alert("Error", "Cook time is required");
      return;
    }
    if (formData.ingredients.some((ing) => !ing.name.trim())) {
      Alert.alert("Error", "All ingredients must have a name");
      return;
    }
    if (formData.instructions.some((inst) => !inst.trim())) {
      Alert.alert("Error", "All instructions must have text");
      return;
    }

    onRecipeSaved?.(formData);
    Alert.alert("Success", "Recipe saved successfully!");
  };

  const nextStep = () => {
    const steps: Array<"name" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review"> = [
      "name",
      "servings",
      "cookTime",
      "difficulty",
      "ingredients",
      "instructions",
      "review",
    ];
    const currentIndex = steps.indexOf(step);

    // Validate ingredients before moving to next step
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

    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Array<"name" | "servings" | "cookTime" | "difficulty" | "ingredients" | "instructions" | "review"> = [
      "name",
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
    const steps = ["Name", "Servings", "Cook Time", "Difficulty", "Ingredients", "Instructions", "Review"];
    const currentIndex = ["name", "servings", "cookTime", "difficulty", "ingredients", "instructions", "review"].indexOf(step);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((s, i) => (
          <View
            key={i}
            style={[
              styles.stepDot,
              i <= currentIndex ? styles.stepDotActive : styles.stepDotInactive,
            ]}
          >
            <Text style={styles.stepDotText}>{i + 1}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Add New Recipe</Text>
      <StepIndicator />

      {step === "name" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Recipe Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter recipe name (e.g., Spaghetti Carbonara)"
            value={formData.name}
            onChangeText={handleNameChange}
          />
        </View>
      )}

      {step === "servings" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={styles.input}
            placeholder="Number of servings"
            keyboardType="numeric"
            value={formData.servings}
            onChangeText={handleServingsChange}
          />
        </View>
      )}

      {step === "cookTime" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Cook Time (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter cook time in minutes"
            keyboardType="numeric"
            value={formData.cookTime}
            onChangeText={handleCookTimeChange}
          />
        </View>
      )}

      {step === "difficulty" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.difficultyButtons}>
            {["easy", "medium", "hard"].map((level) => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.difficultyButton,
                  formData.difficulty === level && styles.difficultyButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, difficulty: level })}
              >
                <Text style={styles.difficultyButtonText}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {step === "ingredients" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Ingredients</Text>
          {formData.ingredients.map((ingredient, index) => (
            <View key={ingredient.id} style={styles.ingredientRow}>
              <TextInput
                style={[styles.input, styles.ingredientInput]}
                placeholder="Ingredient name"
                value={ingredient.name}
                onChangeText={(text) => handleIngredientChange(ingredient.id, "name", text)}
              />
              <TextInput
                style={[styles.input, styles.quantityInput]}
                placeholder="Qty"
                keyboardType="decimal-pad"
                value={ingredient.quantity}
                onChangeText={(text) => handleIngredientChange(ingredient.id, "quantity", text)}
              />
              <TextInput
                style={[styles.input, styles.unitInput]}
                placeholder="Unit"
                value={ingredient.unit}
                onChangeText={(text) => handleIngredientChange(ingredient.id, "unit", text)}
              />
              {formData.ingredients.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveIngredient(ingredient.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Button title="Add Ingredient" onPress={handleAddIngredient} />
        </View>
      )}

      {step === "instructions" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Instructions</Text>
          {formData.instructions.map((instruction, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{index + 1}</Text>
              <TextInput
                style={[styles.input, styles.instructionInput]}
                placeholder={`Step ${index + 1}`}
                multiline
                value={instruction}
                onChangeText={(text) => handleInstructionChange(index, text)}
              />
              {formData.instructions.length > 1 && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveInstruction(index)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <Button title="Add Step" onPress={handleAddInstruction} />
        </View>
      )}

      {step === "review" && (
        <View style={styles.stepContainer}>
          <Text style={styles.label}>Review Recipe</Text>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>{formData.name}</Text>
            <Text style={styles.reviewInfo}>Servings: {formData.servings}</Text>
            <Text style={styles.reviewInfo}>Cook Time: {formData.cookTime} min</Text>
            <Text style={styles.reviewInfo}>Difficulty: {formData.difficulty}</Text>

            <Text style={styles.reviewSubtitle}>Ingredients:</Text>
            {formData.ingredients.map((ing) => (
              <Text key={ing.id} style={styles.reviewText}>
                • {ing.name} - {ing.quantity} {ing.unit}
              </Text>
            ))}

            <Text style={styles.reviewSubtitle}>Instructions:</Text>
            {formData.instructions.map((inst, index) => (
              <Text key={index} style={styles.reviewText}>
                {index + 1}. {inst}
              </Text>
            ))}
          </View>
        </View>
      )}

      <View style={styles.navigationButtons}>
        {step !== "name" && (
          <Button title="← Back" onPress={prevStep} />
        )}
        {step !== "review" && (
          <Button title="Next →" onPress={nextStep} />
        )}
        {step === "review" && (
          <Button title="Save Recipe" onPress={handleSaveRecipe} color="#4CAF50" />
        )}
      </View>

      {onCancel && (
        <Button title="Cancel" onPress={onCancel} color="#f44336" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    marginTop: 50,
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
