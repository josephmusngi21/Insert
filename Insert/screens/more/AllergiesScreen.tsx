/**
 * Allergies Screen - Manage user allergies
 */

import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Button, Alert } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

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
        <TouchableOpacity style={[styles.backButton, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]} onPress={onBack}>
          <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>← Back</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  backButton: {
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  selectedContainer: {
    marginBottom: 24,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  allergenTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  allergenTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  allergenTagText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  allergenButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  allergenButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  customInputContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
});
