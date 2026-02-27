import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, onSnapshot, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { getLocationForItem } from "@/screens/utils/locationUtils";
import styles from "./ShoppingListScreen.styles";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  completed: boolean;
  userId: string;
  createdAt: number;
  source?: string; // 'manual' or 'recipe'
}

interface ShoppingListScreenProps {
  theme: ThemeColors;
}

export default function ShoppingListScreen({ theme }: ShoppingListScreenProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemUnit, setNewItemUnit] = useState("qty");
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Record<string, string[]>>({});
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    if (!userId) return;

    const q = query(collection(db, "shoppingList"), where("userId", "==", userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedItems: ShoppingItem[] = [];
      snapshot.forEach((doc) => {
        loadedItems.push({ id: doc.id, ...doc.data() } as ShoppingItem);
      });
      setItems(loadedItems.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

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

  const addItem = async () => {
    if (!newItemName.trim() || !newItemQuantity.trim()) {
      Alert.alert("Error", "Please enter item name and quantity");
      return;
    }

    try {
      await addDoc(collection(db, "shoppingList"), {
        name: newItemName,
        quantity: newItemQuantity,
        unit: newItemUnit,
        completed: false,
        userId,
        createdAt: Date.now(),
      });
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemUnit("qty");
    } catch (error) {
      Alert.alert("Error", "Failed to add item");
    }
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "shoppingList", id), {
        completed: !currentStatus,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to update item");
    }
  };

  const deleteItem = async (id: string, itemName: string) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to remove "${itemName}" from your shopping list?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "shoppingList", id));
            } catch (error) {
              Alert.alert("Error", "Failed to delete item");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const addToPantry = async (item: ShoppingItem) => {
    try {
      // Get the correct location for the item
      const itemLocation = getLocationForItem(item.name, locations) || "Pantry";
      
      // Add to pending pantry items for confirmation
      const today = new Date().toISOString().split('T')[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // Default 30 days expiry
      
      await addDoc(collection(db, "pendingPantry"), {
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        location: itemLocation,
        dateAdded: today,
        expirationDate: expiryDate.toISOString().split('T')[0],
        userId,
        createdAt: Date.now(),
      });

      // Delete from shopping list
      await deleteDoc(doc(db, "shoppingList", item.id));
      Alert.alert("Success", `${item.name} moved to pending confirmation (${itemLocation}). Go to Pantry to confirm!`);
    } catch (error) {
      Alert.alert("Error", "Failed to process item");
    }
  };

  const finishShopping = async () => {
    const completedItems = items.filter(item => item.completed);
    
    if (completedItems.length === 0) {
      Alert.alert("No Items", "Please select items to add to pantry before finishing shopping.");
      return;
    }

    Alert.alert(
      "Finish Shopping",
      `Add ${completedItems.length} item(s) to pending confirmation?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Finish",
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];
              const expiryDate = new Date();
              expiryDate.setDate(expiryDate.getDate() + 30); // Default 30 days expiry
              
              // Add all completed items to pending pantry in parallel
              const addPromises = completedItems.map(item => {
                const itemLocation = getLocationForItem(item.name, locations) || "Pantry";
                return addDoc(collection(db, "pendingPantry"), {
                  name: item.name,
                  quantity: parseFloat(item.quantity),
                  unit: item.unit,
                  location: itemLocation,
                  dateAdded: today,
                  expirationDate: expiryDate.toISOString().split('T')[0],
                  userId,
                  createdAt: Date.now(),
                });
              });
              
              // Delete all completed items from shopping list in parallel
              const deletePromises = completedItems.map(item =>
                deleteDoc(doc(db, "shoppingList", item.id))
              );
              
              // Execute both in parallel
              await Promise.all([...addPromises, ...deletePromises]);
              
              Alert.alert(
                "Success",
                `${completedItems.length} item(s) added to pending confirmation. Go to Pantry to review!`,
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert("Error", "Failed to finish shopping");
            }
          },
          style: "default",
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ShoppingItem }) => (
    <View style={[styles.itemContainer, { backgroundColor: theme.mode === "dark" ? "#333" : "#fff", borderColor: theme.accentColor }]}>
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleItem(item.id, item.completed)}
      >
        <View style={[styles.checkbox, item.completed && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}>
          {item.completed && <Text style={styles.checkmark}>+</Text>}
        </View>
      </TouchableOpacity>

      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: theme.textColor, textDecorationLine: item.completed ? "line-through" : "none" }]}>
          {item.name}
        </Text>
        <Text style={[styles.itemQuantity, { color: theme.mode === "dark" ? "#aaa" : "#666" }]}>
          {item.quantity} {item.unit}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        {item.completed && (
          <Text style={[styles.locationText, { color: theme.accentColor }]}>
            {getLocationForItem(item.name, locations) || "Pantry"}
          </Text>
        )}
        <TouchableOpacity onPress={() => deleteItem(item.id, item.name)}>
          <Text style={[styles.deleteButton, { color: "#e74c3c" }]}>X</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={[styles.header, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff", borderBottomColor: theme.accentColor }]}>
        <Text style={[styles.headerTitle, { color: theme.textColor }]}>Shopping List</Text>
      </View>

      <View style={[styles.inputContainer, { backgroundColor: theme.mode === "dark" ? "#333" : "#f9f9f9" }]}>
        <TextInput
          style={[styles.input, { color: theme.textColor, borderColor: theme.accentColor }]}
          placeholder="Item name"
          placeholderTextColor={theme.mode === "dark" ? "#888" : "#ccc"}
          value={newItemName}
          onChangeText={setNewItemName}
        />
        <TextInput
          style={[styles.input, styles.quantityInput, { color: theme.textColor, borderColor: theme.accentColor }]}
          placeholder="Qty"
          placeholderTextColor={theme.mode === "dark" ? "#888" : "#ccc"}
          value={newItemQuantity}
          onChangeText={setNewItemQuantity}
          keyboardType="decimal-pad"
        />
        <TextInput
          style={[styles.input, styles.unitInput, { color: theme.textColor, borderColor: theme.accentColor }]}
          placeholder="Unit"
          placeholderTextColor={theme.mode === "dark" ? "#888" : "#ccc"}
          value={newItemUnit}
          onChangeText={setNewItemUnit}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.accentColor }]} onPress={addItem}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <Text style={{ color: theme.textColor }}>No items yet. Add one to get started!</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: theme.mode === "dark" ? "#888" : "#999" }]}>No items yet. Add one to get started!</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
          />
          {items.some(item => item.completed) && (
            <View style={[styles.footerContainer, { backgroundColor: theme.mode === "dark" ? "#222" : "#f9f9f9", borderTopColor: theme.accentColor }]}>
              <TouchableOpacity 
                style={[styles.finishButton, { backgroundColor: theme.accentColor }]}
                onPress={finishShopping}
              >
                <Text style={styles.finishButtonText}>Finish Shopping</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}
