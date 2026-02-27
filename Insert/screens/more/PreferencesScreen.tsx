/**
 * Preferences Screen - Manage expiration durations for item types
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

interface ItemTypePreference {
  name: string;
  displayName: string;
  expirationDays: number;
}

interface PreferencesScreenProps {
  onBack?: () => void;
  theme?: ThemeColors;
}

export default function PreferencesScreen({ onBack, theme }: PreferencesScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const [preferences, setPreferences] = useState<ItemTypePreference[]>([
    { name: "dairy", displayName: "Dairy & Dairy Products", expirationDays: 14 },
    { name: "produce", displayName: "Produce (Fruits & Vegetables)", expirationDays: 7 },
    { name: "meat", displayName: "Meat & Seafood", expirationDays: 3 },
    { name: "pantry", displayName: "Pantry Items & Dry Goods", expirationDays: 30 },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  // Load preferences from Firestore
  useEffect(() => {
    if (!userId) return;

    const loadPreferences = async () => {
      try {
        const userRef = doc(db, "users", userId, "settings", "preferences");
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          const savedPrefs = docSnap.data().itemTypes || [];
          setPreferences(savedPrefs);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      }
    };

    loadPreferences();
  }, [userId]);

  const updatePreference = (index: number, newDays: string) => {
    const numDays = parseInt(newDays) || 0;
    if (numDays < 1) return;

    const updated = [...preferences];
    updated[index].expirationDays = numDays;
    setPreferences(updated);
    setHasChanges(true);
  };

  const savePreferences = async () => {
    if (!userId) {
      Alert.alert("Error", "Unable to save preferences");
      return;
    }

    try {
      const userRef = doc(db, "users", userId, "settings", "preferences");
      await setDoc(userRef, {
        itemTypes: preferences,
        lastUpdated: new Date().toISOString(),
      });

      setHasChanges(false);
      Alert.alert("Success", "Preferences saved successfully");
    } catch (error) {
      console.error("Error saving preferences:", error);
      Alert.alert("Error", "Failed to save preferences");
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      "Reset to Defaults",
      "Are you sure you want to reset all expiration durations to their default values?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            const defaults: ItemTypePreference[] = [
              { name: "dairy", displayName: "Dairy & Dairy Products", expirationDays: 14 },
              { name: "produce", displayName: "Produce (Fruits & Vegetables)", expirationDays: 7 },
              { name: "meat", displayName: "Meat & Seafood", expirationDays: 3 },
              { name: "pantry", displayName: "Pantry Items & Dry Goods", expirationDays: 30 },
            ];
            setPreferences(defaults);
            setHasChanges(true);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      {onBack && (
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
          onPress={onBack}
        >
          <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>Back</Text>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Expiration Durations</Text>
        <Text style={[styles.subtitle, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
          Set how many days items last before they expire
        </Text>

        <View style={[styles.preferencesContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          {preferences.map((pref, index) => (
            <View
              key={pref.name}
              style={[
                styles.preferenceItem,
                {
                  backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                  borderBottomColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0",
                },
                editingId === pref.name && {
                  backgroundColor: themeColors.mode === "dark" ? "#555" : "#fff",
                  borderLeftColor: themeColors.accentColor,
                  borderLeftWidth: 4,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemType, { color: themeColors.textColor }]}>
                  {pref.displayName}
                </Text>
                {editingId === pref.name ? (
                  <View style={styles.editingRow}>
                    <TextInput
                      style={[
                        styles.daysInput,
                        {
                          color: themeColors.textColor,
                          borderColor: themeColors.accentColor,
                          backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff",
                        },
                      ]}
                      keyboardType="number-pad"
                      value={pref.expirationDays.toString()}
                      onChangeText={(text) => updatePreference(index, text)}
                      placeholder="Days"
                      placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                    />
                    <Text style={[styles.daysLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
                      days
                    </Text>
                    <TouchableOpacity
                      style={[styles.checkButton, { backgroundColor: themeColors.accentColor }]}
                      onPress={() => setEditingId(null)}
                    >
                      <Text style={styles.checkButtonText}>✓</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.displayRow}
                    onPress={() => setEditingId(pref.name)}
                  >
                    <Text style={[styles.daysDisplay, { color: themeColors.accentColor }]}>
                      {pref.expirationDays} days
                    </Text>
                    <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#bbb" }]}>
                      Tap to edit
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: themeColors.accentColor }]}
              onPress={savePreferences}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.resetButton, { borderColor: "#999", backgroundColor: themeColors.mode === "dark" ? "#444" : "#f5f5f5" }]}
            onPress={resetToDefaults}
          >
            <Text style={[styles.resetButtonText, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
              Reset to Defaults
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.infoBox, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#f0f8ff" }]}>
          <Text style={[styles.infoTitle, { color: themeColors.textColor }]}>
            How it works
          </Text>
          <Text style={[styles.infoText, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
            When you add new items to your pantry, the expiration date will be automatically calculated based on these durations. Items are marked as expiring soon (yellow) when within 3 days, and expired (red) when the date has passed.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingTop: 50,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    paddingTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  preferencesContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  preferenceItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  itemInfo: {
    gap: 8,
  },
  itemType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  displayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  daysDisplay: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4CAF50",
  },
  editHint: {
    fontSize: 12,
    color: "#bbb",
    fontStyle: "italic",
  },
  editingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  daysInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#4CAF50",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  daysLabel: {
    fontSize: 14,
    color: "#666",
    minWidth: 35,
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4CAF50",
  },
  checkButtonText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 24,
  },
  saveButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#999",
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  infoBox: {
    backgroundColor: "#f0f8ff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
    color: "#333",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#666",
  },
});
