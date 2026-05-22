import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from "react-native";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { findItemCollisions } from "@/screens/utils/locationUtils";
import styles from "./LocationsScreen.styles";

interface LocationsScreenProps {
  onBack: () => void;
  theme?: ThemeColors;
  showInternalHeader?: boolean;
}

const DEFAULT_LOCATIONS: Record<string, string[]> = {
  "Fridge": ["milk", "butter", "cheese", "eggs", "yogurt", "cream", "salmon", "fish", "chicken", "meat", "beef"],
  "Freezer": ["frozen vegetables", "ice cream", "frozen berries", "frozen fish", "frozen chicken"],
  "Pantry": ["flour", "sugar", "salt", "pepper", "rice", "pasta", "oil", "olive oil", "canned tomato", "beans", "chickpeas"],
  "Cupboard": ["spices", "herbs", "vinegar", "soy sauce", "nuts", "seeds"],
  "Counter": ["tomato", "onion", "garlic", "bread", "fruit", "apple", "banana", "orange", "lemon"],
};

export default function LocationsScreen({ onBack, theme, showInternalHeader = true }: LocationsScreenProps) {
  const [locations, setLocations] = useState<Record<string, string[]>>(DEFAULT_LOCATIONS);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newLocationName, setNewLocationName] = useState("");
  const [activeTab, setActiveTab] = useState<'locations' | 'collisions'>('locations');
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  // Find items that exist in multiple locations (collisions)
  const findCollisionsLocal = (): Record<string, string[]> => {
    return findItemCollisions(locations);
  };

  const collisions = findCollisionsLocal();

  // Load locations from Firestore
  useEffect(() => {
    if (!userId) return;

    const locationsRef = doc(db, "users", userId, "settings", "locations");
    const unsubscribe = onSnapshot(
      locationsRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.locations) {
            setLocations(data.locations);
          }
        }
      },
      (error) => {
        console.error("Error loading locations:", error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const saveLocations = async (updatedLocations: Record<string, string[]>) => {
    try {
      await setDoc(
        doc(db, "users", userId, "settings", "locations"),
        { locations: updatedLocations },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving locations:", error);
      Alert.alert("Error", "Failed to save locations");
    }
  };

  const addItemToLocation = (location: string) => {
    if (!newItemName.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    const updated = { ...locations };
    if (!updated[location]) {
      updated[location] = [];
    }

    if (!updated[location].includes(newItemName.toLowerCase())) {
      updated[location].push(newItemName.toLowerCase());
      setLocations(updated);
      saveLocations(updated);
      setNewItemName("");
    } else {
      Alert.alert("Info", "This item is already in this location");
    }
  };

  const removeItemFromLocation = (location: string, item: string) => {
    const updated = { ...locations };
    updated[location] = updated[location].filter((i) => i !== item);
    setLocations(updated);
    saveLocations(updated);
  };

  const resolveCollision = (item: string, correctLocation: string) => {
    const updated = { ...locations };
    
    // Remove item from all locations
    Object.keys(updated).forEach((location) => {
      updated[location] = updated[location].filter((i) => i !== item);
    });
    
    // Add to correct location if not already there
    if (!updated[correctLocation].includes(item)) {
      updated[correctLocation].push(item);
    }
    
    setLocations(updated);
    saveLocations(updated);
    Alert.alert("Success", `"${item}" is now only in "${correctLocation}"`);
  };

  const addNewLocation = () => {
    if (!newLocationName.trim()) {
      Alert.alert("Error", "Please enter a location name");
      return;
    }

    const normalizedName = newLocationName.trim();
    const locationExists = Object.keys(locations).some(
      (loc) => loc.toLowerCase() === normalizedName.toLowerCase()
    );

    if (locationExists) {
      Alert.alert("Error", "This location already exists");
      return;
    }

    const updated = { ...locations };
    updated[normalizedName] = [];
    setLocations(updated);
    saveLocations(updated);
    setNewLocationName("");
  };

  const deleteLocation = (location: string) => {
    Alert.alert(
      "Delete Location",
      `Are you sure you want to delete "${location}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updated = { ...locations };
            delete updated[location];
            setLocations(updated);
            saveLocations(updated);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      {/* Header */}
      {showInternalHeader && (
        <View
          style={[
            styles.header,
            { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomColor: themeColors.mode === "dark" ? "#444" : "#eee" },
          ]}
        >
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeColors.textColor }]}>Locations</Text>
          <View style={{ width: 60 }} />
        </View>
      )}

      {/* Tab Buttons */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomColor: themeColors.mode === "dark" ? "#444" : "#eee" },
        ]}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('locations')}
          style={[
            styles.tabButton,
            activeTab === 'locations' && { borderBottomColor: themeColors.accentColor, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'locations' ? themeColors.accentColor : (themeColors.mode === "dark" ? "#999" : "#999") },
              activeTab === 'locations' && { fontWeight: "700" },
            ]}
          >
            Locations
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('collisions')}
          style={[
            styles.tabButton,
            activeTab === 'collisions' && { borderBottomColor: themeColors.accentColor, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'collisions' ? themeColors.accentColor : (themeColors.mode === "dark" ? "#999" : "#999") },
              activeTab === 'collisions' && { fontWeight: "700" },
            ]}
          >
            Collisions {Object.keys(collisions).length > 0 && `(${Object.keys(collisions).length})`}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {activeTab === 'locations' && (
          <>
            {/* Add New Location Section */}
            <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Add New Location</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: themeColors.textColor,
                      borderColor: themeColors.accentColor,
                      backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                    },
                  ]}
                  placeholder="Location name (e.g., Pantry)"
                  placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                  value={newLocationName}
                  onChangeText={setNewLocationName}
                />
                <TouchableOpacity
                  onPress={addNewLocation}
                  style={[styles.addButton, { backgroundColor: themeColors.accentColor }]}
                >
                  <Text style={styles.addButtonText}>Add Location</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Locations List */}
            {Object.entries(locations).map(([location, items]) => (
              <View
                key={location}
                style={[styles.locationCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
              >
                <View style={styles.locationHeader}>
                  <Text style={[styles.locationName, { color: themeColors.accentColor }]}>{location}</Text>
                  <View style={styles.locationActions}>
                    <TouchableOpacity
                      onPress={() =>
                        setEditingLocation(editingLocation === location ? null : location)
                      }
                    >
                      <Text style={{ color: themeColors.accentColor, fontWeight: "600" }}>
                        {editingLocation === location ? "Done" : "Edit"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteLocation(location)}>
                      <Text style={{ color: "#ff6b6b", fontWeight: "600", marginLeft: 12 }}>
                        Delete
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.itemsList}>
                  {items.length === 0 ? (
                    <Text style={{ color: themeColors.mode === "dark" ? "#999" : "#ccc", fontStyle: "italic" }}>
                      No items assigned
                    </Text>
                  ) : (
                    items.map((item) => (
                      <View key={item} style={styles.itemRow}>
                        <Text style={[styles.itemName, { color: themeColors.textColor }]}>{item}</Text>
                        {editingLocation === location && (
                          <TouchableOpacity
                            onPress={() => removeItemFromLocation(location, item)}
                            style={styles.removeButton}
                          >
                            <Text style={{ color: "#ff6b6b" }}>Remove</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>

                {/* Add Item to Location */}
                {editingLocation === location && (
                  <View style={styles.addItemGroup}>
                    <TextInput
                      style={[
                        styles.addItemInput,
                        {
                          color: themeColors.textColor,
                          borderColor: themeColors.accentColor,
                          backgroundColor: themeColors.mode === "dark" ? "#444" : "#f9f9f9",
                        },
                      ]}
                      placeholder="Add item to this location"
                      placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                      value={newItemName}
                      onChangeText={setNewItemName}
                    />
                    <TouchableOpacity
                      onPress={() => addItemToLocation(location)}
                      style={[styles.addItemButton, { backgroundColor: themeColors.accentColor }]}
                    >
                      <Text style={styles.addButtonText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {activeTab === 'collisions' && (
          <View>
            {Object.keys(collisions).length === 0 ? (
              <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
                <Text style={{ color: themeColors.textColor, textAlign: "center", fontSize: 16, fontStyle: "italic" }}>
                  No collisions found. All items are in unique locations.
                </Text>
              </View>
            ) : (
              Object.entries(collisions).map(([item, itemLocations]) => (
                <View
                  key={item}
                  style={[styles.collisionCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
                >
                  <View style={styles.collisionHeader}>
                    <Text style={[styles.collisionItemName, { color: "#ff6b6b" }]}>{item}</Text>
                    <Text style={{ color: themeColors.textColor, fontSize: 12 }}>
                      Found in {itemLocations.length} locations
                    </Text>
                  </View>

                  <View style={styles.collisionLocations}>
                    {itemLocations.map((location) => (
                      <TouchableOpacity
                        key={location}
                        onPress={() => resolveCollision(item, location)}
                        style={[
                          styles.collisionLocationButton,
                          { backgroundColor: themeColors.accentColor },
                        ]}
                      >
                        <Text style={styles.collisionLocationText}>{location}</Text>
                        <Text style={{ color: "#fff", fontSize: 12, marginTop: 4 }}>Use this location</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
