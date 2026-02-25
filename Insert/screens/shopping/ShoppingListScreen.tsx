import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { type ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";

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

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, "shoppingList", id));
    } catch (error) {
      Alert.alert("Error", "Failed to delete item");
    }
  };

  const addToPantry = async (item: ShoppingItem) => {
    try {
      // Add to pantry collection
      const today = new Date().toISOString().split('T')[0];
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30); // Default 30 days expiry
      
      await addDoc(collection(db, "pantry"), {
        name: item.name,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        location: "Pantry",
        dateAdded: today,
        expirationDate: expiryDate.toISOString().split('T')[0],
        userId,
        createdAt: Date.now(),
      });

      // Delete from shopping list
      await deleteDoc(doc(db, "shoppingList", item.id));
      Alert.alert("Success", `${item.name} added to pantry`);
    } catch (error) {
      Alert.alert("Error", "Failed to add to pantry");
    }
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
          <TouchableOpacity 
            onPress={() => addToPantry(item)}
            style={[styles.pantryButton, { backgroundColor: theme.accentColor }]}
          >
            <Text style={styles.pantryButtonText}>Pantry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => deleteItem(item.id)}>
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
          <Text style={{ color: theme.textColor }}>Loading...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: theme.mode === "dark" ? "#888" : "#999" }]}>No items yet. Add one to get started!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  quantityInput: {
    flex: 0.6,
  },
  unitInput: {
    flex: 0.6,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  checkboxContainer: {
    padding: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  pantryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pantryButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});
