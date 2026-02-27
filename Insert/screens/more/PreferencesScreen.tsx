/**
 * Preferences Screen - Manage expiration durations for item types
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import styles from "./PreferencesScreen.styles";

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
