/**
 * Allergies Screen - Manage user allergies
 */

import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Button, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import styles from "./AllergiesScreen.styles";

// Common allergens
const COMMON_ALLERGENS = [
  "Peanuts",
  "Tree Nuts",
  "Milk",
  "Eggs",
  "Fish",
  "Shellfish",
  "Soy",
  "Wheat",
  "Sesame",
  "Gluten"
];

interface AllergiesScreenProps {
  userAllergies: string[];
  onAllergiesChange: (allergies: string[]) => void;
  onBack?: () => void;
  theme?: ThemeColors;
}

export default function AllergiesScreen({ userAllergies, onAllergiesChange, onBack, theme }: AllergiesScreenProps) {
  const [customAllergen, setCustomAllergen] = useState("");

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const toggleAllergen = (allergen: string) => {
    if (userAllergies.includes(allergen)) {
      onAllergiesChange(userAllergies.filter(a => a !== allergen));
    } else {
      onAllergiesChange([...userAllergies, allergen]);
    }
  };

  const addCustomAllergen = () => {
    const trimmed = customAllergen.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please enter an allergen name");
      return;
    }
    if (userAllergies.includes(trimmed)) {
      Alert.alert("Error", "This allergen is already added");
      return;
    }
    onAllergiesChange([...userAllergies, trimmed]);
    setCustomAllergen("");
  };

  const removeCustomAllergen = (allergen: string) => {
    if (!COMMON_ALLERGENS.includes(allergen)) {
      onAllergiesChange(userAllergies.filter(a => a !== allergen));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      {onBack && (
        <TouchableOpacity style={[styles.backButton, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomColor: themeColors.mode === "dark" ? "#444" : "#e8e8e8" }]} onPress={onBack}>
          <Ionicons name="chevron-back" size={20} color={themeColors.accentColor} />
          <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>Back</Text>
        </TouchableOpacity>
      )}

      <Text style={[styles.title, { color: themeColors.textColor }]}>Your Allergies</Text>
      <Text style={[styles.subtitle, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
        Select your allergies. Recipes will be filtered to exclude these ingredients.
      </Text>

      {/* Current Allergies Display */}
      {userAllergies.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={[styles.selectedTitle, { color: themeColors.textColor }]}>Your Allergies:</Text>
          <View style={styles.allergenTagsContainer}>
            {userAllergies.map((allergen, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.allergenTag, { backgroundColor: "#ff6b6b" }]}
                onPress={() => {
                  removeCustomAllergen(allergen);
                  toggleAllergen(allergen);
                }}
              >
                <Text style={styles.allergenTagText}>{allergen} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Common Allergens */}
      <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Common Allergens</Text>
        {COMMON_ALLERGENS.map((allergen, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.allergenButton,
              userAllergies.includes(allergen) && { backgroundColor: themeColors.accentColor },
              userAllergies.includes(allergen) && { borderColor: themeColors.accentColor },
              !userAllergies.includes(allergen) && { backgroundColor: "transparent", borderColor: "#ccc" }
            ]}
            onPress={() => toggleAllergen(allergen)}
          >
            <Text style={[
              styles.allergenButtonText,
              userAllergies.includes(allergen) && { color: "#fff" },
              !userAllergies.includes(allergen) && { color: themeColors.textColor }
            ]}>
              {allergen}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Allergen Input */}
      <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
        <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Add Custom Allergen</Text>
        <View style={styles.customInputContainer}>
          <TextInput
            style={[
              styles.customInput,
              { color: themeColors.textColor, borderColor: themeColors.accentColor }
            ]}
            placeholder="Enter allergen (e.g., Latex)"
            placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
            value={customAllergen}
            onChangeText={setCustomAllergen}
          />
          <Button
            title="Add"
            onPress={addCustomAllergen}
            color={themeColors.accentColor}
          />
        </View>
      </View>
    </ScrollView>
  );
}
