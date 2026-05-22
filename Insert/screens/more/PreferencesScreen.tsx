/**
 * Preferences Screen - Measurement, safety, and expiration settings
 */

import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { PreferredWeightUnit, UnitDisplayMode } from "@/screens/utils/unitUtils";
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
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<PreferredWeightUnit>("g");
  const [unitDisplayMode, setUnitDisplayMode] = useState<UnitDisplayMode>("converted");
  const [confirmBeforeAddToShopping, setConfirmBeforeAddToShopping] = useState(true);
  const [showExpiredByDefault, setShowExpiredByDefault] = useState(false);
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
          const savedUnit = docSnap.data().preferredWeightUnit;
          const savedDisplayMode = docSnap.data().unitDisplayMode;
          const savedConfirm = docSnap.data().confirmBeforeAddToShopping;
          const savedShowExpired = docSnap.data().showExpiredByDefault;
          if (savedPrefs.length > 0) setPreferences(savedPrefs);
          if (savedUnit === "g" || savedUnit === "lb") {
            setPreferredWeightUnit(savedUnit);
          }
          if (savedDisplayMode === "converted" || savedDisplayMode === "as_is") {
            setUnitDisplayMode(savedDisplayMode);
          }
          if (typeof savedConfirm === "boolean") {
            setConfirmBeforeAddToShopping(savedConfirm);
          }
          if (typeof savedShowExpired === "boolean") {
            setShowExpiredByDefault(savedShowExpired);
          }
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
        preferredWeightUnit,
        unitDisplayMode,
        confirmBeforeAddToShopping,
        showExpiredByDefault,
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
            setPreferredWeightUnit("g");
            setUnitDisplayMode("converted");
            setConfirmBeforeAddToShopping(true);
            setShowExpiredByDefault(false);
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

      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={[styles.title, { color: themeColors.textColor }]}>Preferences</Text>
        <Text style={[styles.subtitle, { color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
          Customize how quantities, shopping safety, and pantry behavior work
        </Text>

        <View style={[styles.preferencesContainer, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <View
            style={[
              styles.preferenceItem,
              {
                backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                borderBottomColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0",
              },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.sectionHeading, { color: themeColors.textColor }]}>Measurement Display</Text>
              <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#888" }]}>Choose if units stay original or convert to one unit</Text>
              <View style={styles.unitChipRow}>
                <TouchableOpacity
                  onPress={() => {
                    setUnitDisplayMode("as_is");
                    setHasChanges(true);
                  }}
                  style={[
                    styles.unitChip,
                    {
                      borderColor: unitDisplayMode === "as_is" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ddd"),
                      backgroundColor: unitDisplayMode === "as_is" ? themeColors.accentColor + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: unitDisplayMode === "as_is" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Display As-Is</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setUnitDisplayMode("converted");
                    setHasChanges(true);
                  }}
                  style={[
                    styles.unitChip,
                    {
                      borderColor: unitDisplayMode === "converted" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ddd"),
                      backgroundColor: unitDisplayMode === "converted" ? themeColors.accentColor + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: unitDisplayMode === "converted" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Convert Units</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.itemType, { color: themeColors.textColor, marginTop: 8 }]}>Preferred Converted Unit</Text>
              <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#888" }]}>Used when Convert Units is selected (supports g, kg, oz, lb, ml, l, tsp, tbsp, cups)</Text>
              <View style={styles.unitChipRow}>
                <TouchableOpacity
                  onPress={() => {
                    setPreferredWeightUnit("g");
                    setHasChanges(true);
                  }}
                  style={[
                    styles.unitChip,
                    {
                      borderColor: preferredWeightUnit === "g" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ddd"),
                      backgroundColor: preferredWeightUnit === "g" ? themeColors.accentColor + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: preferredWeightUnit === "g" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Grams (g)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setPreferredWeightUnit("lb");
                    setHasChanges(true);
                  }}
                  style={[
                    styles.unitChip,
                    {
                      borderColor: preferredWeightUnit === "lb" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ddd"),
                      backgroundColor: preferredWeightUnit === "lb" ? themeColors.accentColor + "22" : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: preferredWeightUnit === "lb" ? themeColors.accentColor : themeColors.textColor, fontWeight: "700" }}>Pounds (lb)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.preferenceItem,
              {
                backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                borderBottomColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0",
              },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.sectionHeading, { color: themeColors.textColor }]}>Safety & Behavior</Text>

              <TouchableOpacity
                onPress={() => {
                  setConfirmBeforeAddToShopping(prev => !prev);
                  setHasChanges(true);
                }}
                style={[styles.toggleRow, { borderColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0", backgroundColor: themeColors.mode === "dark" ? "#3b3b3b" : "#fff" }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemType, { color: themeColors.textColor }]}>Confirm Before Add to Shopping</Text>
                  <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#888" }]}>Prevents accidental taps from adding items</Text>
                </View>
                <View style={[styles.togglePill, { backgroundColor: confirmBeforeAddToShopping ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ccc") }]}>
                  <Text style={styles.togglePillText}>{confirmBeforeAddToShopping ? "ON" : "OFF"}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowExpiredByDefault(prev => !prev);
                  setHasChanges(true);
                }}
                style={[styles.toggleRow, { borderColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0", backgroundColor: themeColors.mode === "dark" ? "#3b3b3b" : "#fff" }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemType, { color: themeColors.textColor }]}>Expand Expired Section by Default</Text>
                  <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#888" }]}>Auto-opens expired items every time you open Pantry</Text>
                </View>
                <View style={[styles.togglePill, { backgroundColor: showExpiredByDefault ? themeColors.accentColor : (themeColors.mode === "dark" ? "#666" : "#ccc") }]}>
                  <Text style={styles.togglePillText}>{showExpiredByDefault ? "ON" : "OFF"}</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={[
              styles.preferenceItem,
              {
                backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                borderBottomColor: themeColors.mode === "dark" ? "#555" : "#e0e0e0",
              },
            ]}
          >
            <View style={styles.itemInfo}>
              <Text style={[styles.sectionHeading, { color: themeColors.textColor }]}>Expiration Durations</Text>
              <Text style={[styles.editHint, { color: themeColors.mode === "dark" ? "#999" : "#888" }]}>Set how many days items last before they expire</Text>
            </View>
          </View>

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
            Convert Units mode normalizes mixed units (including tsp, tbsp, cups, ml, and liters) into your preferred display unit. Display As-Is keeps original units untouched. Shopping confirmation and expired section behavior can also be customized here.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
