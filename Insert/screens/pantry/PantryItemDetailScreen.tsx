import { useState, useEffect } from "react";
import { View, Text, Button, ScrollView, TextInput, Alert, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import styles from "./PantryItemDetailScreen.styles";
import data from "./example/data.json";

const pantryItems = data.pantryItems;

type PantryItem = {
  id: number | string;
  type: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  dateAdded: string;
  expirationDate: string;
  _firestoreId?: string;
};

type PendingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  expirationDate: string;
  userId: string;
};

// Helper function to calculate days until expiration
const calculateExpirationDays = (expirationDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

type ItemDetailsProps = { item: PantryItem; isEditing: boolean };

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface PantryItemDetailScreenProps {
  onLogout?: () => void;
  theme?: ThemeColors;
}

export default function PantryItemDetailScreen({ onLogout, theme }: PantryItemDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [items, setItems] = useState<PantryItem[]>(pantryItems);
  const [editingMode, setEditingMode] = useState(false);
  const [editForm, setEditForm] = useState<{ [key: number]: { name: string; quantity: string; location: string } }>({});
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [editingPending, setEditingPending] = useState<{ [key: string]: { quantity: string; name: string; unit: string; location: string } }>({});
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  // Load both pending items and pantry items from Firestore
  useEffect(() => {
    if (!userId) return;
    
    // Load pending items
    const pendingQuery = query(collection(db, "pendingPantry"), where("userId", "==", userId));
    const pendingUnsubscribe = onSnapshot(pendingQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PendingItem));
      console.log("Pending items updated:", items.length);
      setPendingItems(items);
    });

    // Load pantry items from Firestore
    const pantryQuery = query(collection(db, "pantry"), where("userId", "==", userId));
    const pantryUnsubscribe = onSnapshot(pantryQuery, (snapshot) => {
      const firestoreItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: Math.random(), // Use random ID for local state
          _firestoreId: doc.id, // Store actual Firestore doc ID
          ...data
        };
      }) as unknown as PantryItem[];
      console.log("Pantry items from Firestore:", firestoreItems.length);
      // Combine Firestore items with local items
      const combinedItems = [...pantryItems, ...firestoreItems];
      // Remove duplicates by name
      const uniqueItems = Array.from(new Map(combinedItems.map(item => [item.name, item])).values());
      setItems(uniqueItems);
    });

    return () => {
      pendingUnsubscribe();
      pantryUnsubscribe();
    };
  }, [userId]);

  // Function to convert units to most useful format
  const convertToUsefulUnit = (quantity: number, unit: string): { quantity: number; unit: string } => {
    const lowerUnit = unit.toLowerCase();
    
    // Volume conversions (ml to L)
    if ((lowerUnit === 'ml' || lowerUnit === 'milliliter') && quantity >= 1000) {
      return { quantity: quantity / 1000, unit: 'L' };
    }
    
    // Weight conversions (g to kg)
    if ((lowerUnit === 'g' || lowerUnit === 'gram') && quantity >= 1000) {
      return { quantity: quantity / 1000, unit: 'kg' };
    }
    
    // Ounces to pounds
    if ((lowerUnit === 'oz' || lowerUnit === 'ounce') && quantity >= 16) {
      return { quantity: quantity / 16, unit: 'lb' };
    }
    
    return { quantity, unit };
  };

  const confirmPendingItem = async (item: PendingItem) => {
    const editedQuantity = editingPending[item.id]?.quantity || item.quantity.toString();
    const editedName = editingPending[item.id]?.name || item.name;
    const editedUnit = editingPending[item.id]?.unit || item.unit;
    const editedLocation = editingPending[item.id]?.location || item.location;
    
    Alert.alert(
      "Confirm Item",
      `Add "${editedName}" (${editedQuantity} ${editedUnit}) to ${editedLocation}?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              console.log("Starting item confirmation for:", item.id);
              
              // Convert to useful unit
              const parsedQuantity = parseFloat(editedQuantity);
              const converted = convertToUsefulUnit(parsedQuantity, editedUnit);
              
              console.log("Creating batch write...");
              const batch = writeBatch(db);
              
              // Add to pantry
              const pantryRef = doc(collection(db, "pantry"));
              batch.set(pantryRef, {
                name: editedName,
                type: item.name,
                quantity: converted.quantity,
                unit: converted.unit,
                location: editedLocation,
                dateAdded: new Date().toISOString().split('T')[0],
                expirationDate: item.expirationDate,
                userId,
                createdAt: Date.now(),
              });
              
              console.log("Adding delete from pending to batch...");
              // Delete from pending
              const pendingRef = doc(db, "pendingPantry", item.id);
              batch.delete(pendingRef);
              
              console.log("Committing batch write...");
              // Commit both operations
              await batch.commit();
              
              console.log("Batch committed successfully");
              
              // Clear the editing state for this item
              setEditingPending(prev => {
                const newState = { ...prev };
                delete newState[item.id];
                return newState;
              });
              
              Alert.alert("Success", `${editedName} added to ${editedLocation}`);
            } catch (error) {
              console.error("Error confirming item:", error);
              Alert.alert("Error", "Failed to confirm item: " + (error instanceof Error ? error.message : String(error)));
            }
          },
          style: "default",
        },
      ]
    );
  };

  const rejectPendingItem = async (itemId: string, itemName: string) => {
    Alert.alert(
      "Reject Item",
      `Remove "${itemName}" from pending? This cannot be undone.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Reject",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "pendingPantry", itemId));
              setEditingPending(prev => {
                const newState = { ...prev };
                delete newState[itemId];
                return newState;
              });
              Alert.alert("Success", `${itemName} removed from pending`);
            } catch (error) {
              Alert.alert("Error", "Failed to remove item");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const confirmAllPendingItems = async () => {
    if (pendingItems.length === 0) {
      Alert.alert("Info", "No pending items to confirm");
      return;
    }

    Alert.alert(
      "Confirm All Items",
      `Add all ${pendingItems.length} pending items to your pantry?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Confirm All",
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              
              // Process each pending item
              pendingItems.forEach((item) => {
                const editedQuantity = editingPending[item.id]?.quantity || item.quantity.toString();
                const editedName = editingPending[item.id]?.name || item.name;
                const editedUnit = editingPending[item.id]?.unit || item.unit;
                const editedLocation = editingPending[item.id]?.location || item.location;
                
                // Convert to useful unit
                const parsedQuantity = parseFloat(editedQuantity);
                const converted = convertToUsefulUnit(parsedQuantity, editedUnit);
                
                // Add to pantry
                const pantryRef = doc(collection(db, "pantry"));
                batch.set(pantryRef, {
                  name: editedName,
                  type: item.name,
                  quantity: converted.quantity,
                  unit: converted.unit,
                  location: editedLocation,
                  dateAdded: new Date().toISOString().split('T')[0],
                  expirationDate: item.expirationDate,
                  userId,
                  createdAt: Date.now(),
                });
                
                // Delete from pending
                const pendingRef = doc(db, "pendingPantry", item.id);
                batch.delete(pendingRef);
              });
              
              // Commit all operations at once
              await batch.commit();
              
              // Clear editing state
              setEditingPending({});
              
              Alert.alert("Success", `All ${pendingItems.length} items added to pantry`);
            } catch (error) {
              console.error("Error confirming all items:", error);
              Alert.alert("Error", "Failed to confirm items: " + (error instanceof Error ? error.message : String(error)));
            }
          },
          style: "default",
        },
      ]
    );
  };

  const handleToggleEdit = async () => {
    if (editingMode) {
      // Save all changes when exiting edit mode
      const updatedItems = items.map((item) => {
        const form = editForm[item.id];
        if (!form) return item;
        return {
          ...item,
          name: form.name || item.name,
          quantity: parseInt(form.quantity) || item.quantity,
          location: form.location || item.location,
        };
      });
      setItems(updatedItems);
      setEditForm({});
    }
    setEditingMode(!editingMode);
  };

  const handleDeleteItem = (itemId: number, itemName: string) => {
    Alert.alert(
      "Delete Item",
      `Are you sure you want to remove "${itemName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Update local state immediately for UI feedback
              const updatedItems = items.filter(item => item.id !== itemId);
              setItems(updatedItems);

              // If it's a Firestore item (id starts with 'fs_'), delete from Firestore
              const itemIndex = items.findIndex(item => item.id === itemId);
              if (itemIndex !== -1 && items[itemIndex].id.toString().startsWith('fs_')) {
                const firestoreId = items[itemIndex].id.toString().replace('fs_', '');
                await deleteDoc(doc(db, "pantry", firestoreId));
                console.log("Item deleted from Firestore:", firestoreId);
              }
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
              // Revert state if deletion fails
              setItems([...items]);
            }
          }
        }
      ]
    );
  };

  const Header = () => {
    return (
      <View style={[styles.header, { backgroundColor: themeColors.backgroundColor }]}>
        <View style={styles.titleAndMenu}>
          <Text style={[styles.title, { color: themeColors.textColor }]}>Pantry</Text>
          <View style={styles.headerButtonGroup}>
            <TouchableOpacity onPress={() => setShowAddItemModal(true)}>
              <Text style={[styles.headerButton, { color: themeColors.accentColor }]}>+ Add Item</Text>
            </TouchableOpacity>
            <Button
              title={editingMode ? "Done" : "Edit Items"} 
              onPress={handleToggleEdit}
              color={themeColors.accentColor}
              accessibilityLabel={editingMode ? "Done editing" : "Edit items"}
            />
          </View>
        </View>
      </View>
    );
  };

  const AddItemModal = () => {
    const [newItem, setNewItem] = useState({ name: "", type: "", location: "", quantity: "" });

    const itemTypes = [
      { label: "Produce", value: "produce", expirationDays: 7 },
      { label: "Dairy", value: "dairy", expirationDays: 14 },
      { label: "Meat", value: "meat", expirationDays: 3 },
      { label: "Pantry", value: "pantry", expirationDays: 30 },
    ];

    const handleAddItem = async () => {
      if (!newItem.name || !newItem.type || !newItem.location || !newItem.quantity) {
        alert("Please fill all fields");
        return;
      }

      const selectedType = itemTypes.find((t) => t.value === newItem.type);
      const newPantryItem: PantryItem = {
        id: Math.max(...items.map((i) => i.id), 0) + 1,
        type: newItem.type,
        name: newItem.name,
        quantity: parseInt(newItem.quantity),
        unit: "pcs",
        location: newItem.location,
        dateAdded: new Date().toISOString(),
        expirationDate: new Date(Date.now() + (selectedType?.expirationDays || 0) * 86400000).toISOString(),
      };

      const updatedItems = [...items, newPantryItem];
      setItems(updatedItems);
      setNewItem({ name: "", type: "", location: "", quantity: "" });
      setShowAddItemModal(false);
    };

    return showAddItemModal ? (
      <View style={styles.modal}>
        <TextInput style={styles.input} placeholder="Item Name" value={newItem.name} onChangeText={(text) => setNewItem({ ...newItem, name: text })} />
        <TextInput style={styles.input} placeholder="Type" value={newItem.type} onChangeText={(text) => setNewItem({ ...newItem, type: text })} />
        <TextInput style={styles.input} placeholder="Location" value={newItem.location} onChangeText={(text) => setNewItem({ ...newItem, location: text })} />
        <TextInput style={styles.input} placeholder="Quantity" keyboardType="numeric" value={newItem.quantity} onChangeText={(text) => setNewItem({ ...newItem, quantity: text })} />
        <Button title="Add Item" onPress={handleAddItem} />
        <Button title="Cancel" onPress={() => setShowAddItemModal(false)} />
      </View>
    ) : null;
  };

  const ItemDetails = ({ item, isEditing }: ItemDetailsProps) => {
    const itemKey = typeof item.id === 'string' ? item.id : item.id.toString();
    const currentForm = editForm[itemKey] ?? { name: item.name, quantity: item.quantity.toString(), location: item.location };
    
    const handleEditChange = (field: string, value: string) => {
      setEditForm({
        ...editForm,
        [itemKey]: { ...currentForm, [field]: value }
      });
    };

    return (
      <TouchableOpacity 
        style={[styles.itemDetails, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomColor: themeColors.accentColor, borderLeftColor: themeColors.accentColor }]}
        onLongPress={() => !isEditing && handleDeleteItem(item.id, item.name)}
        delayLongPress={500}
      >
        <View style={[styles.nameQuantity, styles.row]}>
          <View>
            <Text style={[styles.itemType, { color: themeColors.accentColor }]}>{item.type}</Text>
            {isEditing ? (
                <>
                <TextInput
                  style={[styles.editItemNameInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
                  placeholder={item.name}
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  value={currentForm.name}
                  onChangeText={(text) => handleEditChange("name", text)}
                  submitBehavior="blurAndSubmit"
                />
                <TextInput
                  style={[styles.editItemLocationInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
                  placeholder={item.location}
                  placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
                  value={currentForm.location}
                  onChangeText={(text) => handleEditChange("location", text)}
                  submitBehavior="blurAndSubmit"
                />
                </>
            ) : (
              <Text style={[styles.itemName, { color: themeColors.textColor }]}>{item.name}</Text>
            )}
          </View>
          {isEditing ? (
            <TextInput
              style={[styles.editItemQuantityInput, { color: themeColors.textColor, borderColor: themeColors.accentColor }]}
              placeholder={item.quantity.toString()}
              placeholderTextColor={themeColors.mode === "dark" ? "#999" : "#ccc"}
              value={currentForm.quantity}
              keyboardType="numeric"
              onChangeText={(text) => handleEditChange("quantity", text)}
            />
          ) : (
            <Text style={[styles.itemQuantity, { color: themeColors.textColor }]}>
              {item.quantity} {item.unit}
            </Text>
          )}
        </View>

        <View style={[styles.expirationLocation, styles.row]}>
          {(() => {
            const expirationDays = calculateExpirationDays(item.expirationDate);
            if (expirationDays >= 4) {
              return <Text style={[styles.itemExpiration1, { color: "#4CAF50" }]}>{expirationDays} days left</Text>;
            } else if (expirationDays === 0) {
              return <Text style={[styles.itemExpiration2, { color: "#FF9800" }]}>Expires Today!</Text>;
            } else if (expirationDays < 0) {
              const daysExpired = Math.abs(expirationDays);
              return <Text style={[styles.itemExpiration2, { color: "#F44336" }]}>Expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago</Text>;
            } else {
              return <Text style={[styles.itemExpiration3, { color: "#FF9800" }]}>Expiring in {expirationDays} day{expirationDays !== 1 ? 's' : ''}!</Text>;
            }
          })()}

          <Text style={[styles.itemLocation, { color: themeColors.textColor }]}>{item.location}</Text>
        </View>

        {!isEditing && (
          <Text style={[styles.deleteHint, { color: themeColors.mode === "dark" ? "#999" : "#999" }]}>Long press to delete</Text>
        )}
      </TouchableOpacity>
    );
  };

  const MainContainer = () => {
    return (
      <ScrollView contentContainerStyle={[styles.mainContainer, { backgroundColor: themeColors.backgroundColor }]}>
        {/* Pending Items Section */}
        {pendingItems.length > 0 && (
          <View>
            <View style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 16, marginBottom: 8 }]}>
              <Text style={[{ fontSize: 18, fontWeight: "bold", color: themeColors.accentColor }]}>
                Pending Confirmation
              </Text>
              <TouchableOpacity
                onPress={confirmAllPendingItems}
                style={[{ backgroundColor: themeColors.accentColor, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }]}
              >
                <Text style={[{ color: "#fff", fontWeight: "600", fontSize: 12 }]}>Confirm All</Text>
              </TouchableOpacity>
            </View>
            {pendingItems.map((item) => {
              const currentQuantity = editingPending[item.id]?.quantity || item.quantity.toString();
              const currentName = editingPending[item.id]?.name || item.name;
              const currentUnit = editingPending[item.id]?.unit || item.unit;
              const currentLocation = editingPending[item.id]?.location || item.location;
              
              return (
                <View key={item.id} style={[{ backgroundColor: themeColors.mode === "dark" ? "#444" : "#FFF9E6", borderLeftColor: "#FFC107", borderLeftWidth: 4, borderRadius: 8, marginHorizontal: 16, marginBottom: 12, padding: 12 }]}>
                  <TextInput
                    style={[{ color: themeColors.textColor, borderColor: themeColors.accentColor, borderWidth: 1, borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 16, fontWeight: "500" }]}
                    placeholder="Item name"
                    placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                    value={currentName}
                    onChangeText={(text) => setEditingPending(prev => ({...prev, [item.id]: {...(prev[item.id] || {}), name: text}}))}
                  />
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" }}>
                    <TextInput
                      style={[{ flex: 1, color: themeColors.textColor, borderColor: themeColors.accentColor, borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 14 }]}
                      placeholder="Quantity"
                      placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                      value={currentQuantity}
                      onChangeText={(text) => setEditingPending(prev => ({...prev, [item.id]: {...(prev[item.id] || {}), quantity: text}}))}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[{ flex: 0.5, color: themeColors.textColor, borderColor: themeColors.accentColor, borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 14 }]}
                      placeholder="Unit"
                      placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                      value={currentUnit}
                      onChangeText={(text) => setEditingPending(prev => ({...prev, [item.id]: {...(prev[item.id] || {}), unit: text}}))}
                    />
                  </View>
                  <TextInput
                    style={[{ color: themeColors.textColor, borderColor: themeColors.accentColor, borderWidth: 1, borderRadius: 6, padding: 8, marginBottom: 8, fontSize: 14 }]}
                    placeholder="Location"
                    placeholderTextColor={themeColors.mode === "dark" ? "#888" : "#ccc"}
                    value={currentLocation}
                    onChangeText={(text) => setEditingPending(prev => ({...prev, [item.id]: {...(prev[item.id] || {}), location: text}}))}
                  />
                  <View style={{ marginBottom: 12 }}>
                    <Text style={[{ color: themeColors.mode === "dark" ? "#aaa" : "#666", fontSize: 12, marginBottom: 6 }]}>
                      Quick locations:
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                      {["Pantry", "Fridge", "Freezer", "Cupboard", "Counter", "Cabinet"].map(loc => (
                        <TouchableOpacity
                          key={loc}
                          onPress={() => setEditingPending(prev => ({...prev, [item.id]: {...(prev[item.id] || {}), location: loc}}))}
                          style={[{ 
                            paddingHorizontal: 10, 
                            paddingVertical: 6, 
                            borderRadius: 6, 
                            backgroundColor: currentLocation === loc ? themeColors.accentColor : (themeColors.mode === "dark" ? "#555" : "#ddd")
                          }]}
                        >
                          <Text style={[{ color: currentLocation === loc ? "#fff" : themeColors.textColor, fontSize: 12, fontWeight: "500" }]}>
                            {loc}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <Text style={[{ color: themeColors.mode === "dark" ? "#aaa" : "#666", fontSize: 12, marginBottom: 12 }]}>
                    Expires: {new Date(item.expirationDate).toLocaleDateString()}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => confirmPendingItem(item)}
                      style={[{ flex: 1, backgroundColor: themeColors.accentColor, borderRadius: 6, padding: 10, alignItems: "center" }]}
                    >
                      <Text style={[{ color: "#fff", fontWeight: "600", fontSize: 14 }]}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => rejectPendingItem(item.id, item.name)}
                      style={[{ flex: 1, backgroundColor: "#e74c3c", borderRadius: 6, padding: 10, alignItems: "center" }]}
                    >
                      <Text style={[{ color: "#fff", fontWeight: "600", fontSize: 14 }]}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Regular Items Section */}
        {items.length > 0 && (
          <Text style={[{ fontSize: 18, fontWeight: "bold", color: themeColors.accentColor, marginHorizontal: 16, marginTop: 16, marginBottom: 8 }]}>
            Pantry Items
          </Text>
        )}
        {items.map((item) => (
          <ItemDetails 
            key={item.id} 
            item={item} 
            isEditing={editingMode}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor, paddingTop: 50 }]}>
      <Header />
      <AddItemModal />
      <MainContainer />
    </View>
  );
}
