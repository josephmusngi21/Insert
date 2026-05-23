import { useState, useEffect, useRef, useCallback, memo } from "react";
import { View, Text, Button, ScrollView, TextInput, Alert, TouchableOpacity, FlatList, StyleSheet, Modal, Platform, Dimensions, ActivityIndicator, Keyboard, TouchableWithoutFeedback, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Swipeable from "react-native-gesture-handler/Swipeable";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, addDoc, deleteDoc, doc, writeBatch, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { pantryCol, pantryDoc, pendingCol, pendingDoc, settingsDoc, productDoc, ProductEntry, shoppingCol, recipesCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { formatQuantityForPreference, PreferredWeightUnit, UnitDisplayMode } from "@/screens/utils/unitUtils";
import styles from "./PantryItemDetailScreen.styles";

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
    type?: string;
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

// Smart item categorization - detects category from item name
const detectItemCategory = (itemName: string): string => {
  const name = itemName.toLowerCase();

  // Spices/seasonings should stay pantry (e.g. black pepper)
  if (/black pepper|peppercorn|paprika|cumin|oregano|thyme|seasoning|spice|chili powder|garlic powder|onion powder/.test(name)) {
    return "pantry";
  }

  // Meat keywords
  if (/beef|chicken|pork|lamb|fish|salmon|tuna|shrimp|steak|roast|breast|ground beef|ground chicken|ground turkey|sausage|ham|bacon|turkey|duck|veal|meat/.test(name)) {
    return "meat";
  }

  // Dairy keywords
  if (/milk|cheese|yogurt|cream|butter|cheese|dairy|cottage|mozzarella|cheddar|ice cream/.test(name)) {
    return "dairy";
  }

  // Produce keywords
  if (/apple|banana|orange|grape|tomato|lettuce|carrot|broccoli|spinach|celery|potato|onion|garlic|pepper|cucumber|zucchini|fruit|vegetable|produce/.test(name)) {
    return "produce";
  }

  // Frozen keywords
  if (/frozen|fries|pizza|nuggets|peas|corn|ice cream|tv dinner/.test(name)) {
    return "frozen";
  }

  // Beverages keywords
  if (/juice|soda|coffee|tea|water|milk|beer|wine|alcohol|drink|smoothie|coconut water/.test(name)) {
    return "beverages";
  }

  // Bakery keywords
  if (/bread|cake|cookie|pastry|donut|croissant|muffin|bagel|baguette|brioche|bakery/.test(name)) {
    return "bakery";
  }

  // Default to pantry
  return "pantry";
};

type ItemDetailsProps = { item: PantryItem };

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface PantryItemDetailScreenProps {
  onLogout?: () => void;
  theme?: ThemeColors;
  showAddItemModal: boolean;
  setShowAddItemModal: (v: boolean) => void;
  onBackToAddChoice?: () => void;
  kitchenTab?: "recipes" | "pantry";
  showKitchenToggle?: boolean;
  onKitchenTabChange?: (tab: "recipes" | "pantry") => void;
}

const PENDING_UNIT_OPTIONS = ["g", "kg", "lb", "oz", "ml", "l", "cup", "tbsp", "tsp", "pcs", "qty", "pack", "can", "bottle"];
const STORAGE_LOCATIONS = ["Fridge", "Freezer", "Pantry", "Cupboard", "Counter"];

type AddItemTypeOption = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  expirationDays: number;
  location: string;
};

const DEFAULT_ADD_ITEM_TYPES: AddItemTypeOption[] = [
  { label: "Produce", value: "produce", icon: "leaf-outline", expirationDays: 7, location: "Fridge" },
  { label: "Dairy", value: "dairy", icon: "water-outline", expirationDays: 14, location: "Fridge" },
  { label: "Meat", value: "meat", icon: "nutrition-outline", expirationDays: 3, location: "Fridge" },
  { label: "Frozen", value: "frozen", icon: "snow-outline", expirationDays: 90, location: "Freezer" },
  { label: "Pantry", value: "pantry", icon: "archive-outline", expirationDays: 180, location: "Pantry" },
  { label: "Bakery", value: "bakery", icon: "storefront-outline", expirationDays: 5, location: "Counter" },
  { label: "Beverages", value: "beverages", icon: "cafe-outline", expirationDays: 30, location: "Fridge" },
];

const ITEM_TYPE_ICON_BY_VALUE: Record<string, keyof typeof Ionicons.glyphMap> = {
  produce: "leaf-outline",
  dairy: "water-outline",
  meat: "nutrition-outline",
  frozen: "snow-outline",
  pantry: "archive-outline",
  bakery: "storefront-outline",
  beverages: "cafe-outline",
};

const ITEM_TYPE_LOCATION_BY_VALUE: Record<string, string> = {
  produce: "Fridge",
  dairy: "Fridge",
  meat: "Fridge",
  frozen: "Freezer",
  pantry: "Pantry",
  bakery: "Counter",
  beverages: "Fridge",
};

const normalizeItemTypes = (raw: unknown): AddItemTypeOption[] => {
  if (!Array.isArray(raw)) return DEFAULT_ADD_ITEM_TYPES;

  const normalized = raw
    .map((entry): AddItemTypeOption | null => {
      if (!entry || typeof entry !== "object") return null;
      const source = entry as Record<string, unknown>;

      const valueCandidate = source.value ?? source.name;
      if (typeof valueCandidate !== "string") return null;
      const value = valueCandidate.trim().toLowerCase();
      if (!value) return null;

      const labelCandidate = source.label ?? source.displayName;
      const label = typeof labelCandidate === "string" && labelCandidate.trim().length > 0
        ? labelCandidate.trim()
        : value.charAt(0).toUpperCase() + value.slice(1);

      const expirationRaw = source.expirationDays;
      const expirationDays = typeof expirationRaw === "number" && Number.isFinite(expirationRaw) && expirationRaw > 0
        ? Math.round(expirationRaw)
        : (DEFAULT_ADD_ITEM_TYPES.find((t) => t.value === value)?.expirationDays ?? 7);

      const iconRaw = source.icon;
      const icon = (typeof iconRaw === "string" && iconRaw in Ionicons.glyphMap
        ? (iconRaw as keyof typeof Ionicons.glyphMap)
        : (ITEM_TYPE_ICON_BY_VALUE[value] ?? "archive-outline"));

      const locationRaw = source.location;
      const location = typeof locationRaw === "string" && locationRaw.trim().length > 0
        ? locationRaw.trim()
        : (ITEM_TYPE_LOCATION_BY_VALUE[value] ?? "Pantry");

      return { label, value, icon, expirationDays, location };
    })
    .filter((entry): entry is AddItemTypeOption => entry !== null);

  if (normalized.length === 0) return DEFAULT_ADD_ITEM_TYPES;

  const seen = new Set<string>();
  return normalized.filter((entry) => {
    if (seen.has(entry.value)) return false;
    seen.add(entry.value);
    return true;
  });
};

export default function PantryItemDetailScreen({ onLogout, theme, showAddItemModal, setShowAddItemModal, onBackToAddChoice, kitchenTab = "pantry", showKitchenToggle = true, onKitchenTabChange }: PantryItemDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [items, setItems] = useState<PantryItem[]>([]);
  const [hasUserAddedItems, setHasUserAddedItems] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | number | null>(null);
  const [editFormData, setEditFormData] = useState<{ name: string; quantity: string; location: string }>({ name: "", quantity: "", location: "" });
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [editingPending, setEditingPending] = useState<{ [key: string]: { quantity: string; name: string; unit: string; location: string } }>({});
  const [expandedPendingId, setExpandedPendingId] = useState<string | null>(null);
  const [pendingUnitPickerItemId, setPendingUnitPickerItemId] = useState<string | null>(null);
  const [confirmShoppingItemId, setConfirmShoppingItemId] = useState<string | null>(null);
  const [confirmRecipeItemId, setConfirmRecipeItemId] = useState<string | null>(null);
  const [showExpiredItems, setShowExpiredItems] = useState(false);
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<PreferredWeightUnit>("g");
  const [unitDisplayMode, setUnitDisplayMode] = useState<UnitDisplayMode>("converted");
  const [confirmBeforeAddToShopping, setConfirmBeforeAddToShopping] = useState(true);
  const [showPendingItems, setShowPendingItems] = useState(true);
  const [pantrySearchQuery, setPantrySearchQuery] = useState("");
  const [selectedPantryCategory, setSelectedPantryCategory] = useState<string>("all");
  const [selectedStorageLocation, setSelectedStorageLocation] = useState<string>("all");
  const [activeFilterPanel, setActiveFilterPanel] = useState<"food" | "location" | null>(null);
  const [availableStorageLocations, setAvailableStorageLocations] = useState<string[]>(STORAGE_LOCATIONS);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const stickySectionHeightRef = useRef(0);
  const isAutoSnapInProgressRef = useRef(false);
  const pantrySearchInputRef = useRef<any>(null);
  const kitchenToggleAnim = useRef(new Animated.Value(kitchenTab === "recipes" ? 0 : 1)).current;
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  useEffect(() => {
    Animated.timing(kitchenToggleAnim, {
      toValue: kitchenTab === "recipes" ? 0 : 1,
      duration: 190,
      useNativeDriver: true,
    }).start();
  }, [kitchenTab, kitchenToggleAnim]);

  const locationOptions = availableStorageLocations.length > 0 ? availableStorageLocations : STORAGE_LOCATIONS;

  const getPantryMatchKey = (name: string, unit: string, location: string): string => {
    return `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}|${location.trim().toLowerCase()}`;
  };

  useEffect(() => {
    if (!userId) return;
    const loadUnitPreference = async () => {
      try {
        const snap = await getDoc(settingsDoc(userId, "preferences"));
        if (snap.exists()) {
          const pref = snap.data().preferredWeightUnit;
          const displayMode = snap.data().unitDisplayMode;
          const confirmPref = snap.data().confirmBeforeAddToShopping;
          const showExpiredPref = snap.data().showExpiredByDefault;
          if (pref === "g" || pref === "lb") setPreferredWeightUnit(pref);
          if (displayMode === "converted" || displayMode === "as_is") setUnitDisplayMode(displayMode);
          if (typeof confirmPref === "boolean") setConfirmBeforeAddToShopping(confirmPref);
          if (typeof showExpiredPref === "boolean") setShowExpiredItems(showExpiredPref);
        }
      } catch (error) {
        console.error("Error loading unit preference:", error);
      }
    };
    loadUnitPreference();
  }, [userId]);

  // Load both pending items and pantry items from Firestore
  useEffect(() => {
    if (!userId) return;
    
    // Load pending items
    const pendingUnsubscribe = onSnapshot(pendingCol(userId), (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PendingItem));
      setPendingItems(items);
    });

    // Load pantry items from Firestore
    const pantryUnsubscribe = onSnapshot(pantryCol(userId), (snapshot) => {
      const firestoreItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          _firestoreId: doc.id, // Store actual Firestore doc ID
          ...data
        };
      }) as unknown as PantryItem[];
      
      setItems(firestoreItems);
      if (firestoreItems.length > 0) setHasUserAddedItems(true);
    });

    return () => {
      pendingUnsubscribe();
      pantryUnsubscribe();
    };
  }, [userId]);

  // Keep pantry location options in sync with More > Locations settings.
  useEffect(() => {
    if (!userId) return;

    const locationsRef = doc(db, "users", userId, "settings", "locations");
    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const data = snapshot.data();
        const locationsMap = data?.locations as Record<string, string[]> | undefined;

        if (locationsMap && Object.keys(locationsMap).length > 0) {
          setAvailableStorageLocations(Object.keys(locationsMap));
        } else {
          setAvailableStorageLocations(STORAGE_LOCATIONS);
        }
      },
      (error) => {
        console.error("Error loading pantry location options:", error);
        setAvailableStorageLocations(STORAGE_LOCATIONS);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (selectedStorageLocation === "all") return;

    const stillExists = locationOptions.some(
      (location) => location.toLowerCase() === selectedStorageLocation
    );

    if (!stillExists) {
      setSelectedStorageLocation("all");
    }
  }, [locationOptions, selectedStorageLocation]);

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
              const converted = convertToUsefulUnit(Number.isFinite(parsedQuantity) ? parsedQuantity : 1, editedUnit);

              const matchKey = getPantryMatchKey(editedName, converted.unit, editedLocation);
              const existingPantryItem = items.find((existing) => {
                if (!existing._firestoreId) return false;
                const existingKey = getPantryMatchKey(existing.name || "", existing.unit || "", existing.location || "");
                return existingKey === matchKey;
              });
              
              console.log("Creating batch write...");
              const batch = writeBatch(db);
              
              if (existingPantryItem?._firestoreId) {
                const existingQuantity = Number(existingPantryItem.quantity) || 0;
                batch.update(pantryDoc(userId, existingPantryItem._firestoreId), {
                  quantity: existingQuantity + converted.quantity,
                });
              } else {
                // Add to pantry as new item
                const pantryRef = doc(pantryCol(userId));
                batch.set(pantryRef, {
                  name: editedName,
                  type: item.type || detectItemCategory(editedName),
                  quantity: converted.quantity,
                  unit: converted.unit,
                  location: editedLocation,
                  dateAdded: new Date().toISOString().split('T')[0],
                  expirationDate: item.expirationDate,
                  userId,
                  createdAt: Date.now(),
                });
              }
              
              console.log("Adding delete from pending to batch...");
              // Delete from pending
              const pendingRef = pendingDoc(userId, item.id);
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
              setExpandedPendingId(prev => (prev === item.id ? null : prev));
              
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
              await deleteDoc(pendingDoc(userId, itemId));
              setEditingPending(prev => {
                const newState = { ...prev };
                delete newState[itemId];
                return newState;
              });
              setExpandedPendingId(prev => (prev === itemId ? null : prev));
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

              const existingByKey = new Map<string, { firestoreId: string; quantity: number }>();
              items.forEach((existing) => {
                if (!existing._firestoreId) return;
                const key = getPantryMatchKey(existing.name || "", existing.unit || "", existing.location || "");
                existingByKey.set(key, {
                  firestoreId: existing._firestoreId,
                  quantity: Number(existing.quantity) || 0,
                });
              });

              const incrementByDocId = new Map<string, number>();
              const newItemsByKey = new Map<string, {
                name: string;
                type: string;
                quantity: number;
                unit: string;
                location: string;
                expirationDate: string;
              }>();
              
              // Process each pending item
              pendingItems.forEach((item) => {
                const editedQuantity = editingPending[item.id]?.quantity || item.quantity.toString();
                const editedName = editingPending[item.id]?.name || item.name;
                const editedUnit = editingPending[item.id]?.unit || item.unit;
                const editedLocation = editingPending[item.id]?.location || item.location;
                
                // Convert to useful unit
                const parsedQuantity = parseFloat(editedQuantity);
                const converted = convertToUsefulUnit(Number.isFinite(parsedQuantity) ? parsedQuantity : 1, editedUnit);

                const key = getPantryMatchKey(editedName, converted.unit, editedLocation);
                const existing = existingByKey.get(key);

                if (existing) {
                  const prevIncrement = incrementByDocId.get(existing.firestoreId) || 0;
                  incrementByDocId.set(existing.firestoreId, prevIncrement + converted.quantity);
                } else {
                  const existingNew = newItemsByKey.get(key);
                  if (existingNew) {
                    existingNew.quantity += converted.quantity;
                    newItemsByKey.set(key, existingNew);
                  } else {
                    newItemsByKey.set(key, {
                      name: editedName,
                      type: item.type || detectItemCategory(editedName),
                      quantity: converted.quantity,
                      unit: converted.unit,
                      location: editedLocation,
                      expirationDate: item.expirationDate,
                    });
                  }
                }
                
                // Delete from pending
                const pendingRef = pendingDoc(userId, item.id);
                batch.delete(pendingRef);
              });

              incrementByDocId.forEach((increment, firestoreId) => {
                const matched = items.find((entry) => entry._firestoreId === firestoreId);
                const startQty = Number(matched?.quantity) || 0;
                batch.update(pantryDoc(userId, firestoreId), {
                  quantity: startQty + increment,
                });
              });

              newItemsByKey.forEach((newItem) => {
                const pantryRef = doc(pantryCol(userId));
                batch.set(pantryRef, {
                  name: newItem.name,
                  type: newItem.type,
                  quantity: newItem.quantity,
                  unit: newItem.unit,
                  location: newItem.location,
                  dateAdded: new Date().toISOString().split('T')[0],
                  expirationDate: newItem.expirationDate,
                  userId,
                  createdAt: Date.now(),
                });
              });
              
              // Commit all operations at once
              await batch.commit();
              
              // Clear editing state
              setEditingPending({});
              setExpandedPendingId(null);
              
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

  // Get expired items
  const expiredItems = items.filter(item => {
    const expirationDays = calculateExpirationDays(item.expirationDate);
    return expirationDays < 0;
  });

  // Remove all expired items
  const removeAllExpiredItems = async () => {
    if (expiredItems.length === 0) {
      Alert.alert("Info", "No expired items to remove");
      return;
    }

    Alert.alert(
      "Remove All Expired Items",
      `Remove all ${expiredItems.length} expired items from your pantry? This cannot be undone.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Remove All",
          onPress: async () => {
            try {
              const batch = writeBatch(db);

              // Delete each expired Firestore item
              expiredItems.forEach((item) => {
                if (item._firestoreId) {
                  batch.delete(pantryDoc(userId, item._firestoreId));
                }
              });

              await batch.commit();
              setShowExpiredItems(false);

              Alert.alert("Success", `Removed ${expiredItems.length} expired item${expiredItems.length !== 1 ? 's' : ''}`);
            } catch (error) {
              console.error("Error removing expired items:", error);
              Alert.alert("Error", "Failed to remove items");
            }
          },
          style: "destructive",
        },
      ]
    );
  };

  const openEditModal = useCallback((item: PantryItem) => {
    const itemKey = typeof item.id === "string" ? item.id : item.id.toString();
    setEditingItemId(itemKey);
    setEditFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      location: item.location,
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingItemId(null);
    setEditFormData({ name: "", quantity: "", location: "" });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingItemId) return;
    
    const itemToEdit = items.find(i => (typeof i.id === "string" ? i.id : i.id.toString()) === editingItemId);
    if (!itemToEdit || !itemToEdit._firestoreId) return;

    try {
      await updateDoc(pantryDoc(userId, itemToEdit._firestoreId), {
        name: editFormData.name || itemToEdit.name,
        quantity: parseInt(editFormData.quantity) || itemToEdit.quantity,
        location: editFormData.location || itemToEdit.location,
      });
      
      setItems(items.map(item => {
        if ((typeof item.id === "string" ? item.id : item.id.toString()) === editingItemId) {
          return {
            ...item,
            name: editFormData.name || item.name,
            quantity: parseInt(editFormData.quantity) || item.quantity,
            location: editFormData.location || item.location,
          };
        }
        return item;
      }));
      
      closeEditModal();
      Alert.alert("Success", "Item updated");
    } catch (error) {
      console.error("Error saving edits:", error);
      Alert.alert("Save Error", "Failed to update item");
    }
  }, [editingItemId, editFormData, items, userId, closeEditModal]);

  const executeAddToShopping = async (item: PantryItem) => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to add items to your shopping list.");
      return;
    }
    const converted = formatQuantityForPreference(item.quantity || 1, item.unit || "qty", preferredWeightUnit, unitDisplayMode);
    try {
      await addDoc(shoppingCol(userId), {
        name: item.name,
        quantity: String(converted.quantityValue),
        unit: converted.unitText || "qty",
        completed: false,
        userId,
        createdAt: Date.now(),
        source: "pantry",
      });
      Alert.alert("Added", `${item.name} added to your shopping list.`);
    } catch (error) {
      console.error("Error adding item to shopping:", error);
      Alert.alert("Error", "Failed to add item to shopping list.");
    }
  };

  const handleAddMoreToShopping = async (item: PantryItem) => {
    if (!confirmBeforeAddToShopping) {
      await executeAddToShopping(item);
      return;
    }
    const itemKey = typeof item.id === "string" ? item.id : String(item.id);
    setConfirmShoppingItemId(itemKey);
  };

  const executeSendToRecipe = async (item: PantryItem) => {
    if (!userId) {
      Alert.alert("Sign in required", "Please sign in to create recipes from pantry items.");
      return;
    }

    const recipeName = `${item.name} Recipe`;
    const quantity = Number.isFinite(Number(item.quantity)) ? String(item.quantity) : "1";

    try {
      await addDoc(recipesCol(userId), {
        userId,
        name: recipeName,
        description: `Draft recipe started from pantry item: ${item.name}.`,
        imageUrl: "",
        sourceUrl: "",
        servings: "",
        cookTime: "",
        difficulty: "easy",
        visibility: "private",
        ingredients: [
          {
            id: 1,
            name: item.name,
            quantity,
            unit: item.unit || "",
          },
        ],
        instructions: ["Add your cooking steps here."],
        originType: "created",
        originalCreatorUserId: userId,
        originalCreatorDisplayName: auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert Chef",
        originalCreatedAt: Date.now(),
        createdAt: Date.now(),
      });

      Alert.alert("Sent to Recipes", `Created \"${recipeName}\" in your Kitchen recipes.`);
    } catch (error) {
      console.error("Error creating recipe from pantry item:", error);
      Alert.alert("Error", "Failed to create recipe from this pantry item.");
    }
  };

  const handleDeleteItem = useCallback((itemId: number | string, itemName: string) => {
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
              setItems((prev) => prev.filter((item) => item.id !== itemId));

              // IDs are stable Firestore doc IDs in local state.
              await deleteDoc(pantryDoc(userId, String(itemId)));
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "Failed to delete item");
            }
          }
        }
      ]
    );
  }, [userId]);

  const handlePantrySearchChange = useCallback((value: string) => {
    setPantrySearchQuery(value);
    requestAnimationFrame(() => {
      pantrySearchInputRef.current?.focus?.();
    });
  }, []);

  const PANTRY_CATEGORIES = [
    { key: "all", label: "All" },
    { key: "protein", label: "Protein" },
    { key: "dairy", label: "Dairy" },
    { key: "produce", label: "Produce" },
    { key: "frozen", label: "Frozen" },
    { key: "beverages", label: "Beverages" },
    { key: "bakery", label: "Bakery" },
    { key: "pantry", label: "Pantry" },
  ];

  const Header = () => {
    return (
      <View style={[styles.header, { backgroundColor: themeColors.backgroundColor }]}>
        <View style={styles.titleAndMenu}>
          <Text style={[styles.title, { color: themeColors.textColor }]}>Pantry</Text>
          {showKitchenToggle && (
          <View
            style={{
              width: 150,
              borderRadius: 999,
              padding: 2,
              borderWidth: 1,
              borderColor: themeColors.mode === "dark" ? "#3c3c3c" : "#e6e6e6",
              backgroundColor: themeColors.mode === "dark" ? "#252525" : "#fff",
              overflow: "hidden",
            }}
          >
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 2,
                left: 2,
                width: 72,
                height: 32,
                borderRadius: 999,
                backgroundColor: themeColors.accentColor,
                transform: [
                  {
                    translateX: kitchenToggleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 74],
                    }),
                  },
                ],
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => onKitchenTabChange?.("recipes")}
                style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center" }}
                activeOpacity={0.9}
              >
                <Text style={{ color: kitchenTab === "recipes" ? "#fff" : themeColors.accentColor, fontSize: 12, fontWeight: "800" }}>Recipes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onKitchenTabChange?.("pantry")}
                style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center" }}
                activeOpacity={0.9}
              >
                <Text style={{ color: kitchenTab === "pantry" ? "#fff" : themeColors.accentColor, fontSize: 12, fontWeight: "800" }}>Pantry</Text>
              </TouchableOpacity>
            </View>
          </View>
          )}
        </View>
      </View>
    );
  };

  const EditItemModal = () => {
    const isDark = themeColors.mode === "dark";
    const surfaceBg = isDark ? "#1e1e1e" : "#fff";
    const inputBg = isDark ? "#2a2a2a" : "#fafafa";
    const mutedBorder = isDark ? "#444" : "#e0e0e0";
    const mutedText = isDark ? "#aaa" : "#666";
    const labelStyle = {
      fontSize: 12, fontWeight: "600" as const, color: mutedText,
      marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: 0.6,
    };
    const inputStyle = {
      borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
      fontSize: 15, color: themeColors.textColor, backgroundColor: inputBg,
      borderColor: mutedBorder,
    };

    return (
      <Modal visible={editingItemId !== null} transparent animationType="slide" onRequestClose={closeEditModal}>
        <TouchableOpacity
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
          activeOpacity={1}
          onPress={closeEditModal}
        />

        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: surfaceBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 0,
            height: Dimensions.get("window").height * 0.75,
            maxHeight: Dimensions.get("window").height * 0.85,
          }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: themeColors.textColor }}>Edit Item</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity onPress={() => Keyboard.dismiss()} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
                  <Text style={{ color: themeColors.accentColor, fontWeight: "700", fontSize: 13 }}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeEditModal} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color="#999" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled={true}
              >
              {/* Item Name */}
              <Text style={labelStyle}>Item Name *</Text>
              <TextInput
                style={{ ...inputStyle, marginBottom: 16 }}
                placeholder="Enter item name"
                placeholderTextColor={isDark ? "#555" : "#bbb"}
                value={editFormData.name}
                onChangeText={(text) => setEditFormData(prev => ({ ...prev, name: text }))}
                blurOnSubmit={false}
                autoCorrect={false}
              />

              {/* Quantity */}
              <Text style={labelStyle}>Quantity *</Text>
              <TextInput
                style={{ ...inputStyle, marginBottom: 16 }}
                placeholder="Enter quantity"
                placeholderTextColor={isDark ? "#555" : "#bbb"}
                value={editFormData.quantity}
                onChangeText={(text) => setEditFormData(prev => ({ ...prev, quantity: text }))}
                keyboardType="numeric"
                blurOnSubmit={false}
                autoCorrect={false}
              />

              {/* Storage Location Dropdown */}
              <Text style={labelStyle}>Storage Location *</Text>
              <View style={{
                borderWidth: 1.5,
                borderColor: mutedBorder,
                borderRadius: 10,
                backgroundColor: inputBg,
                marginBottom: 16,
                overflow: "hidden",
              }}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 10, paddingVertical: 10 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {locationOptions.map((location) => {
                    const isSelected = editFormData.location === location;
                    return (
                      <TouchableOpacity
                        key={location}
                        onPress={() => setEditFormData(prev => ({ ...prev, location }))}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: isSelected ? themeColors.accentColor : mutedBorder,
                          minWidth: 80,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{
                          color: isSelected ? "#fff" : themeColors.textColor,
                          fontWeight: isSelected ? "700" : "500",
                          fontSize: 13,
                        }}>
                          {location}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              </ScrollView>
            </TouchableWithoutFeedback>

            {/* Save Button */}
            <View style={{
              marginHorizontal: -20,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: Platform.OS === "ios" ? 34 : 18,
              borderTopWidth: 1,
              borderTopColor: mutedBorder,
              backgroundColor: surfaceBg,
            }}>
              <TouchableOpacity
                onPress={handleSaveEdit}
                disabled={!editFormData.name.trim() || !editFormData.quantity.trim() || !editFormData.location.trim()}
                style={{
                  backgroundColor: (editFormData.name.trim() && editFormData.quantity.trim() && editFormData.location.trim()) ? themeColors.accentColor : mutedBorder,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center"
                }}
              >
                <Text style={{
                  color: (editFormData.name.trim() && editFormData.quantity.trim() && editFormData.location.trim()) ? "#fff" : mutedText,
                  fontWeight: "700",
                  fontSize: 16
                }}>
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const AddItemModal = () => {
    const [newItem, setNewItem] = useState({
      name: "", type: "pantry", location: "", quantity: "1", unit: "pcs",
      brand: "", notes: "", customExpiry: "",
    });
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const scanLockRef = useRef(false);
    const [itemTypes, setItemTypes] = useState<AddItemTypeOption[]>(DEFAULT_ADD_ITEM_TYPES);

    useEffect(() => {
      const loadPreferences = async () => {
        if (!userId) {
          setItemTypes(DEFAULT_ADD_ITEM_TYPES);
          return;
        }

        try {
          const prefsDoc = await getDoc(settingsDoc(userId, "preferences"));
          const rawTypes = prefsDoc.exists() ? prefsDoc.data().itemTypes : undefined;
          setItemTypes(normalizeItemTypes(rawTypes));
        } catch (_error) {
          setItemTypes(DEFAULT_ADD_ITEM_TYPES);
        }
      };

      if (showAddItemModal) {
        loadPreferences();
      }
    }, [showAddItemModal, userId]);

    // Ensure no nested modal can remain mounted and block touches after close.
    useEffect(() => {
      if (!showAddItemModal) {
        setShowScanner(false);
        setLookingUp(false);
        scanLockRef.current = false;
        setIsSaving(false);
      }
    }, [showAddItemModal]);

    const applyCategory = (typeValue: string) => {
      const found = itemTypes.find(t => t.value === typeValue);
      setNewItem(prev => ({
        ...prev,
        type: typeValue,
        // Only auto-set location if user hasn't manually overridden it
        location: prev.location || found?.location || "",
      }));
    };

    const handleBarcodeScan = async (barcode: string) => {
      if (scanLockRef.current) return;

      const sanitizedBarcode = String(barcode || "").trim();
      if (!sanitizedBarcode) return;

      scanLockRef.current = true;
      setLookingUp(true);
      setShowScanner(false);
      setScannedBarcode(sanitizedBarcode);

      try {
        // 1. Our Firestore DB first
        const snap = await getDoc(productDoc(sanitizedBarcode));
        if (snap.exists()) {
          const product = snap.data() as ProductEntry;
          const found = itemTypes.find(t => t.value === product.type);
          setNewItem(prev => ({
            ...prev,
            name: product.name,
            type: product.type,
            unit: product.unit,
            quantity: "1",
            location: prev.location || found?.location || "",
          }));
          setIsNewProduct(false);
          Alert.alert("Found in our database!", `"${product.name}" loaded.`, [
            { text: "OK", onPress: () => setShowScanner(false) }
          ]);
          return;
        }

        // 2. Open Food Facts
        const offResp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${sanitizedBarcode}.json`);
        if (offResp.ok) {
          const offData = await offResp.json();
          if (offData.status === 1 && offData.product) {
            const p = offData.product;
            console.log("[OFF] Full product data:", JSON.stringify({
              product_name: p.product_name,
              product_name_en: p.product_name_en,
              brands: p.brands,
              quantity: p.quantity,
              product_quantity: p.product_quantity,
              product_quantity_unit: p.product_quantity_unit,
              categories_tags: p.categories_tags,
              serving_size: p.serving_size,
              serving_quantity: p.serving_quantity,
            }, null, 2));
            const rawName: string = p.product_name_en || p.product_name || "";
            const brand: string = p.brands || "";

            // Map category
            const allTags: string[] = Array.isArray(p.categories_tags)
              ? p.categories_tags.filter((tag: unknown): tag is string => typeof tag === "string")
              : [];
            const categoryMap: Record<string, string> = {
              dairy: "dairy", milk: "dairy", cheese: "dairy", yogurt: "dairy", butter: "dairy",
              meat: "meat", beef: "meat", chicken: "meat", pork: "meat", fish: "meat", seafood: "meat",
              fruits: "produce", vegetables: "produce", fresh: "produce", produce: "produce",
              frozen: "frozen", "ice-cream": "frozen",
              beverages: "beverages", drinks: "beverages", juices: "beverages",
              breads: "bakery", pastries: "bakery", bakery: "bakery",
            };
            let mappedType = "pantry";
            for (const tag of allTags) {
              const clean = tag.replace(/^en:/, "").toLowerCase();
              const hit = Object.entries(categoryMap).find(([key]) => clean.includes(key));
              if (hit) { mappedType = hit[1]; break; }
            }

            // Parse quantity/unit from API
            let parsedQty = "1";
            let parsedUnit = "pcs";
            if (p.product_quantity && p.product_quantity_unit) {
              parsedQty = String(p.product_quantity);
              parsedUnit = p.product_quantity_unit.toLowerCase();
            } else if (p.quantity) {
              const match = String(p.quantity).match(/^([\d.]+)\s*([a-zA-Z]+)/);
              if (match) { parsedQty = match[1]; parsedUnit = match[2].toLowerCase(); }
            }

            if (rawName) {
              const found = itemTypes.find(t => t.value === mappedType);
              setNewItem(prev => ({
                ...prev,
                name: rawName,
                type: mappedType,
                quantity: parsedQty,
                unit: parsedUnit,
                brand,
                location: prev.location || found?.location || "",
              }));
              setIsNewProduct(true);
              Alert.alert("Found on Open Food Facts!", `"${rawName}"${brand ? ` by ${brand}` : ""} — confirm and we'll save it to our database.`, [
                { text: "OK", onPress: () => setShowScanner(false) }
              ]);
              return;
            }
          }
        }

        // 3. Not found
        setIsNewProduct(true);
        Alert.alert("Product not found", "Fill in the details and we'll add it to our database!", [
          { text: "OK", onPress: () => setShowScanner(false) }
        ]);
      } catch (e) {
        console.error("Barcode lookup failed:", e);
        setIsNewProduct(true);
        setShowScanner(false);
      } finally {
        setLookingUp(false);
        scanLockRef.current = false;
      }
    };

    const openScanner = async () => {
      Alert.alert("Coming Soon", "Barcode camera scanning is a future feature.");
    };

    const handleAddItem = async () => {
      // Prevent double-taps while a save is in progress
      if (isSaving) return;
      if (!newItem.name || !newItem.type) {
        Alert.alert("Missing Fields", "Please enter a name and choose a category.");
        return;
      }

      setIsSaving(true);

      const selectedType = itemTypes.find((t) => t.value === newItem.type);
      const effectiveLocation = newItem.location || selectedType?.location || "Pantry";
      let expirationDate: string;
      if (newItem.customExpiry) {
        const parsed = new Date(newItem.customExpiry);
        expirationDate = isNaN(parsed.getTime())
          ? new Date(Date.now() + (selectedType?.expirationDays || 7) * 86400000).toISOString()
          : parsed.toISOString();
      } else {
        expirationDate = new Date(Date.now() + (selectedType?.expirationDays || 7) * 86400000).toISOString();
      }

      // Capture all mutable values NOW before any state change.
      // AddItemModal is defined inside the parent render, so the Firestore onSnapshot
      // listener firing right after addDoc can remount this component mid-save and
      // wipe local state. Capturing here makes the rest of the function immune to that.
      const capturedBarcode = scannedBarcode;
      const capturedIsNewProduct = isNewProduct;
      const capturedItem = { ...newItem };
      const capturedExpirationDays = selectedType?.expirationDays ?? 7;
      const parsedQuantity = parseFloat(capturedItem.quantity);
      const converted = convertToUsefulUnit(
        Number.isFinite(parsedQuantity) ? parsedQuantity : 1,
        capturedItem.unit || "pcs"
      );
      const matchKey = getPantryMatchKey(capturedItem.name, converted.unit, effectiveLocation);

      try {
        if (userId) {
          if (capturedBarcode) {
            const existingPending = pendingItems.find((pending) => {
              const key = getPantryMatchKey(pending.name || "", pending.unit || "", pending.location || "");
              return key === matchKey;
            });

            if (existingPending) {
              await updateDoc(pendingDoc(userId, existingPending.id), {
                quantity: (Number(existingPending.quantity) || 0) + converted.quantity,
                expirationDate,
                updatedAt: Date.now(),
              });
            } else {
              await addDoc(pendingCol(userId), {
                type: capturedItem.type,
                name: capturedItem.name,
                quantity: converted.quantity,
                unit: converted.unit,
                location: effectiveLocation,
                expirationDate,
                userId,
                createdAt: Date.now(),
                source: "barcode",
              });
            }
          } else {
            const existingPantry = items.find((entry) => {
              if (!entry._firestoreId) return false;
              const key = getPantryMatchKey(entry.name || "", entry.unit || "", entry.location || "");
              return key === matchKey;
            });

            if (existingPantry?._firestoreId) {
              await updateDoc(pantryDoc(userId, existingPantry._firestoreId), {
                quantity: (Number(existingPantry.quantity) || 0) + converted.quantity,
                type: capturedItem.type,
                brand: capturedItem.brand || "",
                notes: capturedItem.notes || "",
              });
            } else {
              await addDoc(pantryCol(userId), {
                type: capturedItem.type,
                name: capturedItem.name,
                brand: capturedItem.brand || "",
                notes: capturedItem.notes || "",
                quantity: converted.quantity,
                unit: converted.unit,
                location: effectiveLocation,
                dateAdded: new Date().toISOString(),
                expirationDate,
                userId,
                createdAt: Date.now(),
              });
            }
          }
        } else {
          const existingIndex = items.findIndex((entry) => {
            const key = getPantryMatchKey(entry.name || "", entry.unit || "", entry.location || "");
            return key === matchKey;
          });

          if (existingIndex >= 0) {
            setItems((prev) => prev.map((entry, idx) => idx === existingIndex
              ? { ...entry, quantity: (Number(entry.quantity) || 0) + converted.quantity }
              : entry
            ));
          } else {
            const localId = items.length > 0
              ? Math.max(0, ...items.map((i) => typeof i.id === "string" ? (parseInt(i.id) || 0) : i.id)) + 1
              : 1;
            const newPantryItem: PantryItem = {
              id: localId,
              type: capturedItem.type,
              name: capturedItem.name,
              quantity: converted.quantity,
              unit: converted.unit,
              location: effectiveLocation,
              dateAdded: new Date().toISOString(),
              expirationDate,
            };
            setItems((prev) => [...prev, newPantryItem]);
          }
        }
      } catch (error) {
        console.error("Error adding item:", error);
        Alert.alert("Error", "Failed to add item. Please try again.");
        setIsSaving(false);
        return;
      }

      // Close and reset immediately after the pantry write succeeds.
      // Do NOT await the product-DB write here — let it run in the background
      // so the modal isn't blocked by a secondary, optional write.
      setNewItem({ name: "", type: "pantry", location: "", quantity: "1", unit: "pcs", brand: "", notes: "", customExpiry: "" });
      setScannedBarcode(null);
      setIsNewProduct(false);
      setShowAdvanced(false);
      setShowScanner(false);
      setLookingUp(false);
      scanLockRef.current = false;
      setIsSaving(false);
      setShowAddItemModal(false);

      if (capturedBarcode) {
        Alert.alert("Sent for approval", "Scanned item was added to Pending Confirmation.");
      }

      // Background write to shared product database (fire-and-forget)
      if (userId && capturedBarcode && capturedIsNewProduct) {
        setDoc(productDoc(capturedBarcode), {
          barcode: capturedBarcode,
          name: capturedItem.name,
          type: capturedItem.type,
          unit: capturedItem.unit || "pcs",
          defaultExpirationDays: capturedExpirationDays,
          addedBy: userId,
          createdAt: Date.now(),
        } as ProductEntry).catch((e) => console.error("Product DB write failed (non-critical):", e));
      }
    };

    const UNITS = ["pcs", "g", "kg", "ml", "L", "oz", "lb", "cups"];
    const LOCATIONS = locationOptions;
    const selectedType = itemTypes.find((t) => t.value === newItem.type);
    const expirationDays = selectedType?.expirationDays ?? 0;
    const effectiveLocation = newItem.location || selectedType?.location || "";
    const expirationPreview = newItem.customExpiry
      ? (isNaN(new Date(newItem.customExpiry).getTime()) ? "Invalid date" : new Date(newItem.customExpiry).toLocaleDateString())
      : new Date(Date.now() + expirationDays * 86400000).toLocaleDateString();
    const isDark = themeColors.mode === "dark";
    const surfaceBg = isDark ? "#1e1e1e" : "#fff";
    const inputBg = isDark ? "#2a2a2a" : "#fafafa";
    const mutedBorder = isDark ? "#444" : "#e0e0e0";
    const mutedText = isDark ? "#aaa" : "#666";
    const chipInactiveBg = isDark ? "#333" : "#f0f0f0";
    const allFilled = !!(newItem.name && newItem.type);

    // ── Swipe-down to close ────────────────────────────────────────────────
    // ── end close handlers ────────────────────────────────────────────────

    const doCloseModal = () => {
      setNewItem({ name: "", type: "", location: "", quantity: "1", unit: "pcs", brand: "", notes: "", customExpiry: "" });
      setScannedBarcode(null);
      setIsNewProduct(false);
      setShowAdvanced(false);
      setShowScanner(false);
      setLookingUp(false);
      scanLockRef.current = false;
      setIsSaving(false);
      setShowAddItemModal(false);
    };

    const handleCloseAttempt = (goBackOrEvent?: boolean | unknown) => {
      const goBack = typeof goBackOrEvent === "boolean" ? goBackOrEvent : false;
      const hasData = !!(newItem.name.trim() || newItem.brand.trim() || newItem.notes.trim());
      if (hasData) {
        Alert.alert(
          "Discard Item?",
          "You have unsaved changes. Closing will lose your progress.",
          [
            { text: "Keep Editing", style: "cancel" },
            {
              text: "Discard",
              style: "destructive",
              onPress: () => {
                doCloseModal();
                if (goBack) onBackToAddChoice?.();
              },
            },
          ]
        );
      } else {
        doCloseModal();
        if (goBack) onBackToAddChoice?.();
      }
    };

    const handleCloseModal = () => handleCloseAttempt(false);
    // ── end close handlers ────────────────────────────────────────────────

    const labelStyle = {
      fontSize: 12, fontWeight: "600" as const, color: mutedText,
      marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 0.6,
    };
    const inputStyle = {
      borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
      fontSize: 15, color: themeColors.textColor, backgroundColor: inputBg,
      borderColor: mutedBorder, marginBottom: 16,
    };
    return (
      <Modal
        visible={showAddItemModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
            activeOpacity={1}
            onPress={() => handleCloseAttempt(false)}
          />

          <View style={{
            backgroundColor: surfaceBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 0,
            maxHeight: Dimensions.get("window").height * 0.92,
            height: Dimensions.get("window").height * 0.88,
          }}>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => handleCloseAttempt(true)}
                hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 12,
                  minHeight: 46,
                  minWidth: 96,
                }}
              >
                <Ionicons name="chevron-back" size={24} color={themeColors.accentColor} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: themeColors.accentColor }}>Back</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 22, fontWeight: "700", color: themeColors.textColor, flex: 1, textAlign: "center", marginLeft: -56 }}>Add Pantry Item</Text>
              <TouchableOpacity onPress={() => handleCloseAttempt(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={22} color="#999" />
              </TouchableOpacity>
            </View>

            {/* Scan buttons row */}
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {/* Barcode */}
              <TouchableOpacity
                onPress={openScanner}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  borderWidth: 1.5, borderColor: mutedBorder, borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "#222" : "#f2f2f2",
                }}
              >
                <Ionicons name="barcode-outline" size={20} color={mutedText} />
                <Text style={{ color: mutedText, fontWeight: "600", fontSize: 14 }}>Barcode (Soon)</Text>
              </TouchableOpacity>
              {/* Receipt (future update) */}
              <View
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  borderWidth: 1.5, borderColor: mutedBorder, borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "#222" : "#f2f2f2",
                }}
              >
                <Ionicons name="receipt-outline" size={20} color={mutedText} />
                <Text style={{ color: mutedText, fontWeight: "600", fontSize: 14 }}>Receipt (Soon)</Text>
              </View>
            </View>

            {scannedBarcode && !lookingUp && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: isNewProduct ? (isDark ? "#2e1a00" : "#fff8e6") : (isDark ? "#1a2e1a" : "#f0faf0"),
                borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
                borderLeftWidth: 3, borderLeftColor: isNewProduct ? "#FFA000" : themeColors.accentColor,
              }}>
                <Ionicons name={isNewProduct ? "add-circle-outline" : "checkmark-circle-outline"} size={18} color={isNewProduct ? "#FFA000" : themeColors.accentColor} />
                <Text style={{ fontSize: 13, color: isNewProduct ? "#FFA000" : themeColors.accentColor, fontWeight: "600", flex: 1 }}>
                  {isNewProduct ? "New product — confirm details and we'll save it" : "Found in our database — fields pre-filled"}
                </Text>
              </View>
            )}

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              automaticallyAdjustKeyboardInsets={true}
            >
              {/* Name */}
              <Text style={labelStyle}>Item Name</Text>
              <TextInput
                style={{ ...inputStyle, borderColor: newItem.name ? themeColors.accentColor : mutedBorder, fontSize: 16, marginBottom: 20 }}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor={isDark ? "#555" : "#bbb"}
                value={newItem.name}
                onChangeText={(text) => {
                  const detectedCategory = detectItemCategory(text);
                  const found = itemTypes.find(t => t.value === detectedCategory);
                  setNewItem({
                    ...newItem,
                    name: text,
                    type: detectedCategory,
                    location: found?.location || "",
                  });
                }}
                autoCapitalize="words"
                returnKeyType="next"
              />

              {/* Category — also auto-sets location */}
              <Text style={labelStyle}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {itemTypes.map((type) => {
                  const isSelected = newItem.type === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      onPress={() => applyCategory(type.value)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                        flexDirection: "row", alignItems: "center", gap: 6,
                        backgroundColor: isSelected ? themeColors.accentColor : "transparent",
                        borderColor: isSelected ? themeColors.accentColor : mutedBorder,
                      }}
                    >
                      <Ionicons
                        name={type.icon}
                        size={14}
                        color={isSelected ? "#fff" : themeColors.textColor}
                      />
                      <Text style={{ color: isSelected ? "#fff" : themeColors.textColor, fontWeight: isSelected ? "600" : "400", fontSize: 13 }}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Auto-location hint */}
              {effectiveLocation ? (
                <Text style={{ fontSize: 12, color: mutedText, marginBottom: 20, marginTop: 6 }}>
                  📍 Will be stored in: <Text style={{ color: themeColors.accentColor, fontWeight: "600" }}>{effectiveLocation}</Text>
                  {" "}<Text style={{ color: mutedText }}>(change in Advanced Options)</Text>
                </Text>
              ) : <View style={{ marginBottom: 20 }} />}

              {/* Quantity + Unit */}
              <Text style={labelStyle}>Quantity & Unit</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <TouchableOpacity
                  onPress={() => setNewItem({ ...newItem, quantity: String(Math.max(1, parseFloat(newItem.quantity || "1") - 1)) })}
                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: chipInactiveBg, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 22, color: themeColors.textColor, lineHeight: 24 }}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={{
                    flex: 1, borderWidth: 1.5, borderColor: mutedBorder, borderRadius: 12,
                    paddingHorizontal: 14, paddingVertical: 10, fontSize: 20, fontWeight: "600",
                    color: themeColors.textColor, textAlign: "center", backgroundColor: inputBg,
                  }}
                  keyboardType="decimal-pad"
                  value={newItem.quantity}
                  onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
                />
                <TouchableOpacity
                  onPress={() => setNewItem({ ...newItem, quantity: String(parseFloat(newItem.quantity || "0") + 1) })}
                  style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.accentColor, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontSize: 22, color: "#fff", lineHeight: 24 }}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {UNITS.map((unit) => {
                  const isSelected = newItem.unit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => setNewItem({ ...newItem, unit })}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: isSelected ? themeColors.accentColor : chipInactiveBg }}
                    >
                      <Text style={{ color: isSelected ? "#fff" : themeColors.textColor, fontSize: 13, fontWeight: isSelected ? "600" : "400" }}>{unit}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Expiry preview */}
              {selectedType && (
                <View style={{ backgroundColor: isDark ? "#1a3a1a" : "#f0faf0", borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: themeColors.accentColor }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={14} color={themeColors.accentColor} />
                    <Text style={{ color: themeColors.accentColor, fontWeight: "600", fontSize: 13 }}>
                      Expires ~{newItem.customExpiry ? expirationPreview : `in ${expirationDays} days (${expirationPreview})`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Advanced Options */}
              <TouchableOpacity
                onPress={() => setShowAdvanced(v => !v)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, marginBottom: 4 }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: themeColors.accentColor }}>Advanced Options</Text>
                <Ionicons name={showAdvanced ? "chevron-up" : "chevron-down"} size={18} color={themeColors.accentColor} />
              </TouchableOpacity>

              {showAdvanced && (
                <View style={{ backgroundColor: isDark ? "#252525" : "#fafafa", borderRadius: 14, padding: 14, marginBottom: 16, gap: 14 }}>
                  {/* Location override */}
                  <View>
                    <Text style={labelStyle}>Storage Location Override</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {LOCATIONS.map((loc) => {
                        const isSelected = newItem.location === loc;
                        return (
                          <TouchableOpacity
                            key={loc}
                            onPress={() => setNewItem({ ...newItem, location: isSelected ? "" : loc })}
                            style={{
                              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                              backgroundColor: isSelected ? themeColors.accentColor : "transparent",
                              borderColor: isSelected ? themeColors.accentColor : mutedBorder,
                            }}
                          >
                            <Text style={{ color: isSelected ? "#fff" : themeColors.textColor, fontSize: 13, fontWeight: isSelected ? "600" : "400" }}>{loc}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Brand */}
                  <View>
                    <Text style={labelStyle}>Brand (optional)</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Heinz, Kellogg's"
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={newItem.brand}
                      onChangeText={(text) => setNewItem({ ...newItem, brand: text })}
                      autoCapitalize="words"
                    />
                  </View>

                  {/* Notes */}
                  <View>
                    <Text style={labelStyle}>Notes (optional)</Text>
                    <TextInput
                      style={{ ...inputStyle, height: 72, textAlignVertical: "top" }}
                      placeholder="e.g. Opened, low-fat, organic…"
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={newItem.notes}
                      onChangeText={(text) => setNewItem({ ...newItem, notes: text })}
                      multiline
                    />
                  </View>

                  {/* Custom expiry */}
                  <View>
                    <Text style={labelStyle}>Custom Expiry Date (optional)</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={isDark ? "#555" : "#bbb"}
                      value={newItem.customExpiry}
                      onChangeText={(text) => setNewItem({ ...newItem, customExpiry: text })}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>
              )}

            </ScrollView>

            <View style={{
              marginHorizontal: -20,
              paddingHorizontal: 20,
              paddingTop: 10,
              paddingBottom: Platform.OS === "ios" ? 34 : 18,
              borderTopWidth: 1,
              borderTopColor: mutedBorder,
              backgroundColor: surfaceBg,
            }}>
              <TouchableOpacity
                onPress={handleAddItem}
                disabled={isSaving || !allFilled}
                style={{
                  backgroundColor: (allFilled && !isSaving) ? themeColors.accentColor : (isDark ? "#333" : "#d0d0d0"),
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {isSaving && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ color: (allFilled && !isSaving) ? "#fff" : mutedText, fontWeight: "700", fontSize: 16 }}>
                  {isSaving ? "Saving…" : "Add to Pantry"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const ItemDetails = memo(({ item }: ItemDetailsProps) => {
    const itemKey = typeof item.id === 'string' ? item.id : item.id.toString();
    const convertedAmount = formatQuantityForPreference(item.quantity, item.unit, preferredWeightUnit, unitDisplayMode);

    const renderDeleteAction = () => (
      <View
        style={{
          width: 96,
          backgroundColor: "#E53935",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => handleDeleteItem(item.id, item.name)}
          activeOpacity={0.85}
          style={{
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Ionicons name="trash" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>Delete</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={{ marginHorizontal: 16, marginBottom: 8, marginTop: 6, borderRadius: 12, overflow: "hidden" }}>
        <Swipeable
          renderRightActions={renderDeleteAction}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
        >
          <TouchableOpacity 
            style={[
              styles.itemDetails,
              {
                backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff",
                borderBottomColor: themeColors.accentColor,
                borderLeftColor: themeColors.accentColor,
                marginHorizontal: 0,
                marginBottom: 0,
                marginTop: 0,
                borderRadius: 0,
              }
            ]}
            activeOpacity={1}
            onLongPress={() => openEditModal(item)}
            delayLongPress={350}
          >
          <View style={[styles.nameQuantity, styles.row]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemType, { color: themeColors.accentColor }]}>{item.type}</Text>
              <Text style={[styles.itemName, { color: themeColors.textColor }]}>{item.name}</Text>
            </View>
            <Text style={[styles.itemQuantity, { color: themeColors.textColor }]}>
              {convertedAmount.quantityText} {convertedAmount.unitText}
            </Text>
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

          <View style={styles.itemActionsRow}>
            <View style={{ flex: 1, gap: 8 }}>
              {confirmShoppingItemId === itemKey ? (
                <View style={styles.addMoreConfirmRow}>
                  <TouchableOpacity
                    onPress={() => setConfirmShoppingItemId(null)}
                    style={[styles.addMoreCancelButton, { borderColor: themeColors.mode === "dark" ? "#666" : "#bbb", backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5" }]}
                  >
                    <Text style={[styles.addMoreCancelButtonText, { color: themeColors.textColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await executeAddToShopping(item);
                      setConfirmShoppingItemId(null);
                    }}
                    style={[styles.addMoreConfirmButton, { backgroundColor: themeColors.accentColor }]}
                  >
                    <Ionicons name="cart" size={14} color="#fff" />
                    <Text style={styles.addMoreConfirmButtonText}>Confirm Add</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => handleAddMoreToShopping(item)}
                  style={[styles.addMoreButton, { borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#1f2b1f" : "#f0faf0" }]}
                >
                  <Ionicons name="cart-outline" size={15} color={themeColors.accentColor} />
                  <Text style={[styles.addMoreButtonText, { color: themeColors.accentColor }]}>Add More to Shopping</Text>
                </TouchableOpacity>
              )}

              {confirmRecipeItemId === itemKey ? (
                <View style={styles.addMoreConfirmRow}>
                  <TouchableOpacity
                    onPress={() => setConfirmRecipeItemId(null)}
                    style={[styles.addMoreCancelButton, { borderColor: themeColors.mode === "dark" ? "#666" : "#bbb", backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5" }]}
                  >
                    <Text style={[styles.addMoreCancelButtonText, { color: themeColors.textColor }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      await executeSendToRecipe(item);
                      setConfirmRecipeItemId(null);
                    }}
                    style={[styles.addMoreConfirmButton, { backgroundColor: themeColors.accentColor }]}
                  >
                    <Ionicons name="restaurant" size={14} color="#fff" />
                    <Text style={styles.addMoreConfirmButtonText}>Create Recipe</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setConfirmRecipeItemId(itemKey)}
                  style={[styles.addMoreButton, { borderColor: themeColors.accentColor, backgroundColor: themeColors.mode === "dark" ? "#2a2317" : "#fff7ee" }]}
                >
                  <Ionicons name="restaurant-outline" size={15} color={themeColors.accentColor} />
                  <Text style={[styles.addMoreButtonText, { color: themeColors.accentColor }]}>Send to Recipes</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

            <Text style={[styles.deleteHint, { color: themeColors.mode === "dark" ? "#999" : "#999" }]}>Long press to edit • Swipe to delete</Text>
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  });

  const MainContainer = () => {
    const getItemFoodType = (item: PantryItem): string => {
      const detected = detectItemCategory(item.name || "");
      const rawType = (item.type || "").toLowerCase().trim();

      if (detected === "meat") return "protein";
      if (detected !== "pantry") return detected;

      if (rawType === "meat" || rawType === "protein") return "protein";
      if (["dairy", "produce", "frozen", "beverages", "bakery", "pantry"].includes(rawType)) return rawType;

      return "pantry";
    };

    const filteredItems = items.filter((item) => {
      const searchValue = pantrySearchQuery.trim().toLowerCase();
      const foodType = getItemFoodType(item);
      const locationValue = (item.location || "").toLowerCase();

      let matchesSearch = true;
      if (searchValue) {
        matchesSearch = (item.name || "").toLowerCase().includes(searchValue);
      }

      const matchesCategory = selectedPantryCategory === "all" || foodType === selectedPantryCategory;
      const matchesStorageLocation = selectedStorageLocation === "all" || locationValue === selectedStorageLocation.toLowerCase();
      
      return matchesSearch && matchesCategory && matchesStorageLocation;
    });

    const stickyHeaderIndex = (pendingItems.length > 0 ? 1 : 0) + (expiredItems.length > 0 ? 1 : 0);

    const snapBackNearTop = (offsetY: number) => {
      if (isAutoSnapInProgressRef.current) return;
      const nearTopThreshold = Math.max(120, stickySectionHeightRef.current + 24);
      if (offsetY > 0 && offsetY < nearTopThreshold) {
        isAutoSnapInProgressRef.current = true;
        requestAnimationFrame(() => {
          mainScrollRef.current?.scrollTo({ y: 0, animated: true });
          setTimeout(() => {
            isAutoSnapInProgressRef.current = false;
          }, 220);
        });
      }
    };

    return (
      <ScrollView 
      ref={mainScrollRef}
        contentContainerStyle={[styles.mainContainer, { backgroundColor: themeColors.backgroundColor }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        stickyHeaderIndices={items.length > 0 ? [stickyHeaderIndex] : undefined}
      onScrollEndDrag={(event) => snapBackNearTop(event.nativeEvent.contentOffset.y)}
      >
        {/* Pending Items Section */}
        {pendingItems.length > 0 && (
          <View>
            <TouchableOpacity
              onPress={() => setShowPendingItems((prev) => !prev)}
              activeOpacity={0.9}
              style={[{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginHorizontal: 12,
                marginTop: 12,
                marginBottom: 6,
                paddingHorizontal: 10,
                paddingVertical: 9,
                borderRadius: 9,
                backgroundColor: themeColors.mode === "dark" ? "#242424" : "#fff",
                borderWidth: 1,
                borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e3e8e5",
              }]}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[{ fontSize: 17, fontWeight: "bold", color: themeColors.accentColor }]}>
                  Pending Confirmation ({pendingItems.length})
                </Text>
                <Text style={{ marginTop: 1, fontSize: 11, color: themeColors.mode === "dark" ? "#aaa" : "#777" }}>
                  {showPendingItems ? "Tap to collapse" : "Tap to expand"}
                </Text>
              </View>
              <Ionicons
                name={showPendingItems ? "chevron-up" : "chevron-down"}
                size={18}
                color={themeColors.mode === "dark" ? "#ddd" : "#666"}
              />
            </TouchableOpacity>

            {showPendingItems && (
              <View>
                <View style={{ flexDirection: "row", justifyContent: "flex-end", marginHorizontal: 12, marginBottom: 6 }}>
                  <TouchableOpacity
                    onPress={confirmAllPendingItems}
                    style={[{ backgroundColor: themeColors.accentColor, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }]}
                  >
                    <Text style={[{ color: "#fff", fontWeight: "600", fontSize: 12 }]}>Confirm All</Text>
                  </TouchableOpacity>
                </View>

                {pendingItems.map((item) => {
              const currentQuantity = editingPending[item.id]?.quantity || item.quantity.toString();
              const currentName = editingPending[item.id]?.name || item.name;
              const currentUnit = editingPending[item.id]?.unit || item.unit;
              const currentLocation = editingPending[item.id]?.location || item.location;
              const expiresIn = calculateExpirationDays(item.expirationDate);
              const expiryColor = expiresIn > 7 ? "#4CAF50" : expiresIn > 0 ? "#FF9800" : "#F44336";
              const isExpanded = expandedPendingId === item.id;

                  return (
                    <View key={item.id} style={{ marginHorizontal: 12, marginBottom: isExpanded ? 10 : 6 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setEditingPending(prev => {
                        if (prev[item.id]) return prev;
                        return {
                          ...prev,
                          [item.id]: {
                            name: item.name,
                            quantity: item.quantity.toString(),
                            unit: item.unit,
                            location: item.location,
                          },
                        };
                      });
                      setExpandedPendingId(prev => (prev === item.id ? null : item.id));
                    }}
                    style={{
                      backgroundColor: themeColors.mode === "dark" ? "#242424" : "#fff",
                      borderLeftColor: isExpanded ? themeColors.accentColor : (themeColors.mode === "dark" ? "#555" : "#ddd"),
                      borderLeftWidth: isExpanded ? 5 : 3,
                      borderRadius: 9,
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: themeColors.textColor, flex: 1 }} numberOfLines={1}>
                          {currentName}
                        </Text>
                        {isExpanded && (
                          <View style={{ backgroundColor: themeColors.accentColor + "22", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: themeColors.accentColor }}>EDITING</Text>
                          </View>
                        )}
                        <View style={{ backgroundColor: expiryColor + "22", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: expiryColor }}>{expiresIn}d</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 2 }}>
                        {currentQuantity} {currentUnit} • {currentLocation}
                      </Text>
                    </View>

                    <Ionicons
                      name={isExpanded ? "chevron-up" : "create-outline"}
                      size={18}
                      color={isExpanded ? themeColors.accentColor : (themeColors.mode === "dark" ? "#9a9a9a" : "#8a8a8a")}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View
                      style={{
                        backgroundColor: themeColors.mode === "dark" ? "#1a1a1a" : "#f7f9f8",
                        borderRadius: 9,
                        borderWidth: 1,
                        borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e4ece7",
                        marginTop: 5,
                        padding: 8,
                      }}
                    >
                      <TextInput
                        style={{
                          backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff",
                          color: themeColors.textColor,
                          borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#d8e4db",
                          borderWidth: 1,
                          borderRadius: 7,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          marginBottom: 6,
                          fontSize: 13,
                          fontWeight: "500",
                        }}
                        value={currentName}
                        onChangeText={(text) => setEditingPending(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), name: text } }))}
                        placeholder="Item name"
                        placeholderTextColor={themeColors.mode === "dark" ? "#666" : "#aaa"}
                        blurOnSubmit={false}
                        autoCorrect={false}
                      />

                      <View style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                        <TextInput
                          style={{
                            flex: 1,
                            backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff",
                            color: themeColors.textColor,
                            borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#d8e4db",
                            borderWidth: 1,
                            borderRadius: 7,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            fontSize: 13,
                          }}
                          placeholder="Qty"
                          placeholderTextColor={themeColors.mode === "dark" ? "#666" : "#aaa"}
                          value={currentQuantity}
                          onChangeText={(text) => setEditingPending(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), quantity: text } }))}
                          keyboardType="decimal-pad"
                          blurOnSubmit={false}
                          autoCorrect={false}
                        />

                        <TouchableOpacity
                          onPress={() => setPendingUnitPickerItemId(item.id)}
                          style={{
                            flex: 0.72,
                            backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff",
                            borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#d8e4db",
                            borderWidth: 1,
                            borderRadius: 7,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text style={{ color: themeColors.textColor, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                            {currentUnit || "Unit"}
                          </Text>
                          <Ionicons name="chevron-down" size={14} color={themeColors.mode === "dark" ? "#aaa" : "#666"} />
                        </TouchableOpacity>
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, marginBottom: 6 }}
                        keyboardShouldPersistTaps="handled"
                      >
                        {locationOptions.map((loc) => {
                          const selected = currentLocation === loc;
                          return (
                            <TouchableOpacity
                              key={loc}
                              onPress={() => setEditingPending(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || {}), location: loc } }))}
                              style={{
                                paddingHorizontal: 9,
                                paddingVertical: 5,
                                borderRadius: 14,
                                backgroundColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#333" : "#e9ecea"),
                              }}
                            >
                              <Text style={{ color: selected ? "#fff" : themeColors.textColor, fontSize: 11, fontWeight: selected ? "700" : "500" }}>{loc}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <TouchableOpacity
                          onPress={() => confirmPendingItem(item)}
                          style={{
                            flex: 1,
                            backgroundColor: themeColors.accentColor,
                            borderRadius: 7,
                            paddingVertical: 8,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={15} color="#fff" />
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => rejectPendingItem(item.id, item.name)}
                          style={{
                            flex: 1,
                            backgroundColor: "#e74c3c",
                            borderRadius: 7,
                            paddingVertical: 8,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons name="trash-outline" size={15} color="#fff" />
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                    </View>
                  );
                })}
              </View>
            )}

            <Modal
              visible={!!pendingUnitPickerItemId}
              transparent
              animationType="fade"
              onRequestClose={() => setPendingUnitPickerItemId(null)}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setPendingUnitPickerItemId(null)}
                style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", paddingHorizontal: 24 }}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => {}}
                  style={{
                    backgroundColor: themeColors.mode === "dark" ? "#252525" : "#fff",
                    borderRadius: 14,
                    padding: 14,
                    maxHeight: 420,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "700", color: themeColors.textColor, marginBottom: 10 }}>
                    Select Unit
                  </Text>
                  <ScrollView>
                    {PENDING_UNIT_OPTIONS.map((unitOpt) => (
                      <TouchableOpacity
                        key={unitOpt}
                        onPress={() => {
                          if (pendingUnitPickerItemId) {
                            setEditingPending(prev => ({
                              ...prev,
                              [pendingUnitPickerItemId]: {
                                ...(prev[pendingUnitPickerItemId] || {}),
                                unit: unitOpt,
                              },
                            }));
                          }
                          setPendingUnitPickerItemId(null);
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          marginBottom: 6,
                          backgroundColor: themeColors.mode === "dark" ? "#333" : "#f3f3f3",
                        }}
                      >
                        <Text style={{ color: themeColors.textColor, fontSize: 14, fontWeight: "600" }}>{unitOpt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          </View>
        )}

        {/* Expired Items Section */}
        {expiredItems.length > 0 && (
          <View>
            <TouchableOpacity
              onPress={() => setShowExpiredItems(!showExpiredItems)}
              style={[{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginHorizontal: 16, marginTop: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: themeColors.mode === "dark" ? "#444" : "#FFE6E6", borderRadius: 8, borderLeftColor: "#F44336", borderLeftWidth: 4 }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 18, fontWeight: "bold", color: "#F44336" }]}>
                  Expired Items ({expiredItems.length})
                </Text>
                <Text style={[{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#999", marginTop: 4 }]}>
                  Tap to review and remove
                </Text>
              </View>
              <Text style={[{ fontSize: 20, color: "#F44336" }]}>
                {showExpiredItems ? "▼" : "▶"}
              </Text>
            </TouchableOpacity>

            {showExpiredItems && (
              <View>
                {expiredItems.map((item) => {
                  const expirationDays = calculateExpirationDays(item.expirationDate);
                  const daysExpired = Math.abs(expirationDays);
                  const expiredConverted = formatQuantityForPreference(item.quantity, item.unit, preferredWeightUnit, unitDisplayMode);
                  
                  return (
                    <View 
                      key={`${item.name}-${item.id}`}
                      style={[{ backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderLeftColor: "#F44336", borderLeftWidth: 4, borderRadius: 8, marginHorizontal: 16, marginBottom: 10, padding: 12 }]}
                    >
                      <View style={{ marginBottom: 8 }}>
                        <Text style={[{ fontSize: 16, fontWeight: "600", color: themeColors.textColor }]}>
                          {item.name}
                        </Text>
                        <Text style={[{ fontSize: 12, color: "#F44336", fontWeight: "600", marginTop: 4 }]}>
                          Expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <View>
                          <Text style={[{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#666" }]}>
                            {expiredConverted.quantityText} {expiredConverted.unitText}
                          </Text>
                          <Text style={[{ fontSize: 12, color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 2 }]}>
                            {item.location}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item.id, item.name)}
                        style={[{ backgroundColor: "#F44336", borderRadius: 6, padding: 10, alignItems: "center" }]}
                      >
                        <Text style={[{ color: "#fff", fontWeight: "600", fontSize: 14 }]}>Remove Item</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}

                {expiredItems.length > 1 && (
                  <TouchableOpacity
                    onPress={removeAllExpiredItems}
                    style={[{ backgroundColor: "#d32f2f", marginHorizontal: 16, marginBottom: 16, borderRadius: 8, padding: 12, alignItems: "center" }]}
                  >
                    <Text style={[{ color: "#fff", fontWeight: "700", fontSize: 16 }]}>
                      Remove All {expiredItems.length} Expired Items
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
        
        {/* Search and Filter Section */}
        {items.length > 0 && (
          <View
            style={{ backgroundColor: themeColors.backgroundColor, paddingTop: 8, paddingBottom: 6, zIndex: 20, elevation: 8 }}
            onLayout={(event) => {
              stickySectionHeightRef.current = event.nativeEvent.layout.height;
            }}
          >
            <View style={[{ marginHorizontal: 12, marginTop: 0, marginBottom: 0 }]}>
              {/* Search Bar */}
              <View style={[{ backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#444" : "#e3e3e3" }]}>
                <Text style={[{ color: themeColors.mode === "dark" ? "#888" : "#999", marginRight: 6 }]}>⌕</Text>
                <TextInput
                  ref={pantrySearchInputRef}
                  style={[{ flex: 1, color: themeColors.textColor }]}
                  placeholder="Search pantry items..."
                  placeholderTextColor={themeColors.mode === "dark" ? "#777" : "#aaa"}
                  value={pantrySearchQuery}
                  onChangeText={handlePantrySearchChange}
                  blurOnSubmit={false}
                />
                {pantrySearchQuery ? (
                  <TouchableOpacity onPress={() => setPantrySearchQuery("")} style={{ paddingHorizontal: 6 }}>
                    <Text style={[{ color: themeColors.mode === "dark" ? "#bbb" : "#888" }]}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

            {/* Filter Mode Toggle */}
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setActiveFilterPanel((prev) => (prev === "food" ? null : "food"))}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 9,
                  alignItems: "center",
                  backgroundColor: activeFilterPanel === "food" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"),
                  borderWidth: activeFilterPanel === "food" ? 0 : 1,
                  borderColor: activeFilterPanel === "food" ? "transparent" : (themeColors.mode === "dark" ? "#444" : "#e0e0e0"),
                }}
              >
                <Text style={{ color: activeFilterPanel === "food" ? "#fff" : themeColors.textColor, fontWeight: "700", fontSize: 13 }}>
                  Food Type{selectedPantryCategory !== "all" ? " *" : ""}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveFilterPanel((prev) => (prev === "location" ? null : "location"))}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 9,
                  alignItems: "center",
                  backgroundColor: activeFilterPanel === "location" ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"),
                  borderWidth: activeFilterPanel === "location" ? 0 : 1,
                  borderColor: activeFilterPanel === "location" ? "transparent" : (themeColors.mode === "dark" ? "#444" : "#e0e0e0"),
                }}
              >
                <Text style={{ color: activeFilterPanel === "location" ? "#fff" : themeColors.textColor, fontWeight: "700", fontSize: 13 }}>
                  Storage Location{selectedStorageLocation !== "all" ? " *" : ""}
                </Text>
              </TouchableOpacity>
            </View>

            {activeFilterPanel === "food" && (
              <>
                <Text style={[{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: themeColors.mode === "dark" ? "#bbb" : "#666", marginBottom: 6 }]}>Food Type</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                >
                  {PANTRY_CATEGORIES.map((category) => {
                    const isSelected = selectedPantryCategory === category.key;
                    return (
                      <TouchableOpacity
                        key={category.key}
                        onPress={() => setSelectedPantryCategory(category.key)}
                        style={[
                          { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: isSelected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"), borderWidth: isSelected ? 0 : 1, borderColor: isSelected ? "transparent" : (themeColors.mode === "dark" ? "#444" : "#e0e0e0") }
                        ]}
                      >
                        <Text style={[{ color: isSelected ? "#fff" : themeColors.textColor, fontWeight: isSelected ? "700" : "500", fontSize: 13 }]}>{category.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {activeFilterPanel === "location" && (
              <>
                <Text style={[{ fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: themeColors.mode === "dark" ? "#bbb" : "#666", marginBottom: 6 }]}>Storage Location</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6 }}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="none"
                >
                  {["all", ...locationOptions].map((location) => {
                    const key = location.toLowerCase();
                    const label = location === "all" ? "All" : location;
                    const isSelected = selectedStorageLocation === key;

                    return (
                      <TouchableOpacity
                        key={location}
                        onPress={() => setSelectedStorageLocation(key)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          borderRadius: 7,
                          backgroundColor: isSelected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"),
                          borderWidth: isSelected ? 0 : 1,
                          borderColor: isSelected ? "transparent" : (themeColors.mode === "dark" ? "#444" : "#e0e0e0"),
                        }}
                      >
                        <Text style={{ color: isSelected ? "#fff" : themeColors.textColor, fontWeight: isSelected ? "700" : "500", fontSize: 13 }}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

              {filteredItems.length > 0 && (
                <Text style={[{ fontSize: 18, fontWeight: "bold", color: themeColors.accentColor, marginTop: 6, marginBottom: 4 }]}>
                  Pantry Items
                </Text>
              )}
            </View>
          </View>
        )}
        
        {items.length === 0 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingTop: 72, paddingBottom: 40 }}>
            <View style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff4ed",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              borderWidth: 1,
              borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ffe0c7",
            }}>
              <Ionicons name="basket-outline" size={34} color={themeColors.accentColor} />
            </View>
            <Text style={{ fontSize: 20, fontWeight: "800", color: themeColors.textColor, textAlign: "center", marginBottom: 8 }}>Your pantry is empty</Text>
            <Text style={{ fontSize: 14, color: themeColors.mode === "dark" ? "#888" : "#999", textAlign: "center", lineHeight: 21, marginBottom: 28 }}>
              Add items you have at home so Insert can help you plan meals and track what{"'s"} fresh.
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddItemModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: themeColors.accentColor,
                paddingHorizontal: 22,
                paddingVertical: 13,
                borderRadius: 14,
              }}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        )}
        {filteredItems.map((item) => (
          <ItemDetails 
            key={item.id} 
            item={item}
          />
        ))}
        {items.length > 0 && filteredItems.length === 0 && (
          <View style={[{ marginHorizontal: 16, marginTop: 20, padding: 16, backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5", borderRadius: 10, alignItems: "center" }]}>
            <Text style={[{ color: themeColors.textColor, fontSize: 15, fontWeight: "600" }]}>No items found</Text>
            <Text style={[{ color: themeColors.mode === "dark" ? "#aaa" : "#666", fontSize: 13, marginTop: 4 }]}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor, paddingTop: insets.top }]}>
      <Header />
      <AddItemModal />
      {EditItemModal()}
      {MainContainer()}
    </View>
  );
}
