import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, ScrollView, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { addDoc, deleteDoc, updateDoc, onSnapshot, doc } from "firebase/firestore";
import { shoppingCol, shoppingDoc, pendingCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
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
  showAddItemModal?: boolean;
  setShowAddItemModal?: (v: boolean) => void;
  onBackToAddChoice?: () => void;
}

type DraftShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

const QTY_OPTIONS = ["0.5", "1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20"];
const UNIT_OPTIONS = ["qty", "g", "kg", "lb", "oz", "ml", "l", "cup", "tbsp", "tsp", "pcs", "pack", "can", "bottle"];

const createDraftItem = (): DraftShoppingItem => ({
  id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: "",
  quantity: "1",
  unit: "qty",
});

export default function ShoppingListScreen({ theme, showAddItemModal, setShowAddItemModal, onBackToAddChoice }: ShoppingListScreenProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Record<string, string[]>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftShoppingItem[]>([createDraftItem()]);
  const [qtyPickerItemId, setQtyPickerItemId] = useState<string | null>(null);
  const [unitPickerItemId, setUnitPickerItemId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";
  const accentBlue = "#3A7BDE";
  const accentSage = "#4FAF8A";
  const accentPlum = "#6F5BD8";

  const withAlpha = (hex: string, alpha: string) => {
    if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
    return `${hex}${alpha}`;
  };

  useEffect(() => {
    if (!showAddItemModal) return;
    setShowAddModal(true);
    setDraftItems(prev => (prev.length > 0 ? prev : [createDraftItem()]));
  }, [showAddItemModal]);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(shoppingCol(userId), (snapshot) => {
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

  const addDraftRow = () => {
    setDraftItems(prev => [...prev, createDraftItem()]);
  };

  const removeDraftRow = (id: string) => {
    setDraftItems(prev => {
      const next = prev.filter(item => item.id !== id);
      return next.length > 0 ? next : [createDraftItem()];
    });
  };

  const updateDraftRow = (id: string, updates: Partial<DraftShoppingItem>) => {
    setDraftItems(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setShowAddItemModal?.(false);
    setQtyPickerItemId(null);
    setUnitPickerItemId(null);
  };

  const handleModalBack = () => {
    closeAddModal();
    onBackToAddChoice?.();
  };

  const addItems = async () => {
    const validItems = draftItems.filter(item => item.name.trim().length > 0);
    if (validItems.length === 0) {
      Alert.alert("Error", "Add at least one item name.");
      return;
    }

    const invalidQty = validItems.some(item => !item.quantity.trim());
    if (invalidQty) {
      Alert.alert("Error", "Each item needs a quantity.");
      return;
    }

    try {
      await Promise.all(
        validItems.map(item =>
          addDoc(shoppingCol(userId), {
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit || "qty",
            completed: false,
            userId,
            createdAt: Date.now(),
            source: "manual",
          })
        )
      );
      Alert.alert("Added", `${validItems.length} item(s) added to shopping list.`);
      setDraftItems([createDraftItem()]);
      closeAddModal();
    } catch (error) {
      Alert.alert("Error", "Failed to add items");
    }
  };

  const clearShoppingList = async () => {
    if (items.length === 0) {
      Alert.alert("Shopping List", "Your shopping list is already empty.");
      return;
    }

    Alert.alert(
      "Clear Shopping List",
      `Remove all ${items.length} item(s) from your shopping list? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await Promise.all(items.map(item => deleteDoc(shoppingDoc(userId, item.id))));
            } catch (error) {
              Alert.alert("Error", "Failed to clear shopping list");
            }
          },
        },
      ]
    );
  };

  const toggleItem = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(shoppingDoc(userId, id), {
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
              await deleteDoc(shoppingDoc(userId, id));
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
      
      await addDoc(pendingCol(userId), {
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
      await deleteDoc(shoppingDoc(userId, item.id));
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
                return addDoc(pendingCol(userId), {
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
                deleteDoc(shoppingDoc(userId, item.id))
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
    <View
      style={[
        styles.itemContainer,
        {
          backgroundColor: theme.mode === "dark" ? "#333" : "#fff",
          borderColor: theme.mode === "dark" ? "#3b3b3b" : "#ececec",
          borderLeftColor: item.completed ? accentSage : (item.source === "recipe" ? accentBlue : theme.accentColor),
        },
      ]}
    >
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => toggleItem(item.id, item.completed)}
      >
        <View style={[styles.checkbox, item.completed && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}>
          {item.completed && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
      </TouchableOpacity>

      <View style={styles.itemDetails}>
        <Text style={[styles.itemName, { color: theme.textColor, textDecorationLine: item.completed ? "line-through" : "none" }]}>
          {item.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.itemQuantity, { color: theme.mode === "dark" ? "#aaa" : "#666" }]}>
            {item.quantity} {item.unit}
          </Text>
          {item.source && (
            <View
              style={[
                styles.sourceBadge,
                {
                  backgroundColor: item.source === "recipe" ? withAlpha(accentBlue, theme.mode === "dark" ? "24" : "16") : withAlpha(accentPlum, theme.mode === "dark" ? "24" : "16"),
                },
              ]}
            >
              <Text style={[styles.sourceBadgeText, { color: item.source === "recipe" ? accentBlue : accentPlum }]}>{item.source}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionButtons}>
        {item.completed && (
          <Text style={[styles.locationText, { color: theme.accentColor }]} numberOfLines={1}>
            {getLocationForItem(item.name, locations) || "Pantry"}
          </Text>
        )}
        <TouchableOpacity onPress={() => deleteItem(item.id, item.name)} style={styles.deleteIconButton}>
          <Ionicons name="trash-outline" size={18} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const completedCount = items.filter(item => item.completed).length;
  const remainingCount = items.length - completedCount;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);
  const todayLabel = useMemo(() => new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date()), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor, paddingTop: insets.top }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundColor,
            borderBottomColor: theme.mode === "dark" ? "#3b3b3b" : "#e8e8e8",
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: theme.textColor }]}>Shopping</Text>
          <View style={styles.headerActionRow}>
            <TouchableOpacity
              onPress={clearShoppingList}
              style={[styles.clearButton, { borderColor: theme.mode === "dark" ? "#666" : "#d0d0d0", backgroundColor: theme.mode === "dark" ? "#2e2e2e" : "#f9f9f9" }]}
            >
              <Ionicons name="trash-outline" size={15} color="#e74c3c" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={[styles.heroCard, { backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#fff", borderColor: theme.mode === "dark" ? "#3b3b3b" : "#ececec" }]}>
        <Text style={[styles.heroEyebrow, { color: theme.mode === "dark" ? "#a0a0a0" : "#888" }]}>{todayLabel}</Text>
        <Text style={[styles.heroTitle, { color: theme.textColor }]}>{greeting}</Text>
        <Text style={[styles.heroSubtitle, { color: theme.mode === "dark" ? "#aaa" : "#666" }]}>
          Keep shopping simple today. Pick what you need, then finish to move checked items into Pantry confirmation.
        </Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryChip, { backgroundColor: withAlpha(accentBlue, theme.mode === "dark" ? "24" : "12") }]}>
            <Text style={[styles.summaryText, { color: accentBlue }]}>{remainingCount} remaining</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: withAlpha(accentSage, theme.mode === "dark" ? "26" : "14") }]}>
            <Text style={[styles.summaryText, { color: accentSage }]}>{completedCount} selected</Text>
          </View>
          <View style={[styles.summaryChip, { backgroundColor: withAlpha(theme.accentColor, theme.mode === "dark" ? "26" : "16") }]}>
            <Text style={[styles.summaryText, { color: theme.accentColor }]}>{items.length} total</Text>
          </View>
        </View>

        <View style={[styles.inputContainer, { backgroundColor: theme.mode === "dark" ? "#242424" : "#fafafa", borderColor: theme.mode === "dark" ? "#3b3b3b" : "#ececec" }]}>
          <Text style={[styles.bulkAddHint, { color: theme.mode === "dark" ? "#aaa" : "#666" }]}>
          Use Add to quickly create multiple shopping items with dropdown quantity and unit.
          </Text>
        </View>
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

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={closeAddModal}>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeAddModal} />
          <View style={[styles.addModalCard, { backgroundColor: theme.mode === "dark" ? "#1f1f1f" : "#fff" }]}>
            <View style={styles.addModalHeader}>
              <TouchableOpacity
                onPress={handleModalBack}
                style={styles.modalBackButton}
                hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
              >
                <Ionicons name="chevron-back" size={20} color={theme.accentColor} />
                <Text style={[styles.modalBackText, { color: theme.accentColor }]}>Back</Text>
              </TouchableOpacity>
              <Text style={[styles.addModalTitle, { color: theme.textColor }]}>Add Shopping Items</Text>
              <TouchableOpacity onPress={closeAddModal} style={styles.modalCloseButton}>
                <Ionicons name="close" size={20} color={theme.mode === "dark" ? "#999" : "#777"} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flexShrink: 1 }}
              contentContainerStyle={styles.addRowsContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              automaticallyAdjustKeyboardInsets={true}
            >
              {draftItems.map((draft, idx) => (
                <View key={draft.id} style={[styles.draftRow, { backgroundColor: theme.mode === "dark" ? "#2a2a2a" : "#f8f8f8", borderColor: theme.mode === "dark" ? "#444" : "#e5e5e5" }]}>
                  <View style={styles.draftRowTop}>
                    <Text style={[styles.draftRowLabel, { color: theme.mode === "dark" ? "#aaa" : "#777" }]}>Item {idx + 1}</Text>
                    <TouchableOpacity onPress={() => removeDraftRow(draft.id)} style={styles.removeDraftButton}>
                      <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={[styles.draftNameInput, { color: theme.textColor, borderColor: theme.accentColor, backgroundColor: theme.mode === "dark" ? "#1e1e1e" : "#fff" }]}
                    placeholder="Item name"
                    placeholderTextColor={theme.mode === "dark" ? "#777" : "#bbb"}
                    value={draft.name}
                    onChangeText={(text) => updateDraftRow(draft.id, { name: text })}
                  />

                  <View style={styles.draftPickersRow}>
                    <TouchableOpacity
                      onPress={() => setQtyPickerItemId(draft.id)}
                      style={[styles.dropdownButton, { borderColor: theme.accentColor, backgroundColor: theme.mode === "dark" ? "#1e1e1e" : "#fff" }]}
                    >
                      <Text style={{ color: theme.textColor, fontWeight: "600" }}>{draft.quantity}</Text>
                      <Ionicons name="chevron-down" size={14} color={theme.mode === "dark" ? "#999" : "#666"} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setUnitPickerItemId(draft.id)}
                      style={[styles.dropdownButton, { borderColor: theme.accentColor, backgroundColor: theme.mode === "dark" ? "#1e1e1e" : "#fff" }]}
                    >
                      <Text style={{ color: theme.textColor, fontWeight: "600" }}>{draft.unit}</Text>
                      <Ionicons name="chevron-down" size={14} color={theme.mode === "dark" ? "#999" : "#666"} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.addModalFooter}>
              <TouchableOpacity onPress={addDraftRow} style={[styles.secondaryFooterButton, { borderColor: theme.mode === "dark" ? "#666" : "#d0d0d0", backgroundColor: theme.mode === "dark" ? "#2b2b2b" : "#f4f4f4" }]}>
                <Ionicons name="add-circle-outline" size={16} color={theme.textColor} />
                <Text style={[styles.secondaryFooterButtonText, { color: theme.textColor }]}>Add Row</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addItems} style={[styles.primaryFooterButton, { backgroundColor: theme.accentColor }]}>
                <Text style={styles.primaryFooterButtonText}>Add Items</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!qtyPickerItemId} transparent animationType="fade" onRequestClose={() => setQtyPickerItemId(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setQtyPickerItemId(null)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff" }]}>
            <Text style={[styles.pickerTitle, { color: theme.textColor }]}>Select Quantity</Text>
            <ScrollView>
              {QTY_OPTIONS.map((qty) => (
                <TouchableOpacity
                  key={qty}
                  onPress={() => {
                    if (qtyPickerItemId) updateDraftRow(qtyPickerItemId, { quantity: qty });
                    setQtyPickerItemId(null);
                  }}
                  style={[styles.pickerOption, { backgroundColor: theme.mode === "dark" ? "#333" : "#f4f4f4" }]}
                >
                  <Text style={{ color: theme.textColor, fontWeight: "600" }}>{qty}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!unitPickerItemId} transparent animationType="fade" onRequestClose={() => setUnitPickerItemId(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setUnitPickerItemId(null)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.mode === "dark" ? "#222" : "#fff" }]}>
            <Text style={[styles.pickerTitle, { color: theme.textColor }]}>Select Unit</Text>
            <ScrollView>
              {UNIT_OPTIONS.map((unit) => (
                <TouchableOpacity
                  key={unit}
                  onPress={() => {
                    if (unitPickerItemId) updateDraftRow(unitPickerItemId, { unit });
                    setUnitPickerItemId(null);
                  }}
                  style={[styles.pickerOption, { backgroundColor: theme.mode === "dark" ? "#333" : "#f4f4f4" }]}
                >
                  <Text style={{ color: theme.textColor, fontWeight: "600" }}>{unit}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
