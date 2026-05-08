import { useState, useEffect, useRef } from "react";
import { View, Text, Button, ScrollView, TextInput, Alert, TouchableOpacity, FlatList, StyleSheet, Modal, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, addDoc, deleteDoc, doc, writeBatch, getDoc, setDoc } from "firebase/firestore";
import { pantryCol, pantryDoc, pendingCol, pendingDoc, settingsDoc, productDoc, ProductEntry } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
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
  showAddItemModal: boolean;
  setShowAddItemModal: (v: boolean) => void;
}

export default function PantryItemDetailScreen({ onLogout, theme, showAddItemModal, setShowAddItemModal }: PantryItemDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [items, setItems] = useState<PantryItem[]>([]);
  const [hasUserAddedItems, setHasUserAddedItems] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [editForm, setEditForm] = useState<{ [key: string]: { name: string; quantity: string; location: string } }>({});
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [editingPending, setEditingPending] = useState<{ [key: string]: { quantity: string; name: string; unit: string; location: string } }>({});
  const [showExpiredItems, setShowExpiredItems] = useState(false);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  // Load both pending items and pantry items from Firestore
  useEffect(() => {
    if (!userId) return;
    
    // Load pending items
    const pendingUnsubscribe = onSnapshot(pendingCol(userId), (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PendingItem));
      console.log("Pending items updated:", items.length);
      setPendingItems(items);
    });

    // Load pantry items from Firestore
    const pantryUnsubscribe = onSnapshot(pantryCol(userId), (snapshot) => {
      const firestoreItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: Math.random(), // Use random ID for local state
          _firestoreId: doc.id, // Store actual Firestore doc ID
          ...data
        };
      }) as unknown as PantryItem[];
      console.log("Pantry items from Firestore:", firestoreItems.length);
      
      setItems(firestoreItems);
      if (firestoreItems.length > 0) setHasUserAddedItems(true);
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
              const pantryRef = doc(pantryCol(userId));
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
                const pantryRef = doc(pantryCol(userId));
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
                const pendingRef = pendingDoc(userId, item.id);
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

  const handleDeleteItem = (itemId: number | string, itemName: string) => {
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

              // If it's a Firestore item, delete using _firestoreId
              const itemIndex = items.findIndex(item => item.id === itemId);
              if (itemIndex !== -1 && items[itemIndex]._firestoreId) {
                await deleteDoc(pantryDoc(userId, items[itemIndex]._firestoreId!));
                console.log("Item deleted from Firestore:", items[itemIndex]._firestoreId);
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
    const [newItem, setNewItem] = useState({
      name: "", type: "", location: "", quantity: "1", unit: "pcs",
      brand: "", notes: "", customExpiry: "",
    });
    const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
    const [isNewProduct, setIsNewProduct] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [lookingUp, setLookingUp] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const scanLockRef = useRef(false);

    // ── Receipt scanner state ──────────────────────────────────────────────
    type ReceiptItem = {
      id: string;
      name: string;
      quantity: string;
      unit: string;
      type: string;
      location: string;
      expirationDays: number;
      checked: boolean;
    };
    const [showReceiptCamera, setShowReceiptCamera] = useState(false);
    const [receiptProcessing, setReceiptProcessing] = useState(false);
    const [receiptStep, setReceiptStep] = useState<'idle' | 'ocr' | 'lookup'>('idle');
    const [receiptLookupProgress, setReceiptLookupProgress] = useState(0);
    const [receiptLookupTotal, setReceiptLookupTotal] = useState(0);
    const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
    const [showReceiptReview, setShowReceiptReview] = useState(false);
    const cameraRef = useRef<any>(null);

    const openReceiptCamera = async () => {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert("Camera Permission", "Camera access is required to scan receipts.");
          return;
        }
      }
      setShowReceiptCamera(true);
    };

    /** Parse raw OCR text from a receipt → candidate product name lines */
    const parseReceiptLines = (rawText: string): string[] => {
      const SKIP = /total|subtotal|tax|hst|gst|pst|change|balance|cash|credit|debit|visa|mastercard|amex|approval|auth|store|receipt|thank|welcome|member|loyalty|points|savings|discount|coupon|void|refund|return|service|date|time|reg|cashier|operator|tel|phone|address|www\.|\.com|invoice|order|trans|^\d+$/i;
      const PRICE = /^\$?[\d,]+\.\d{2}$|^\d{1,2}\/\d{1,2}\/\d{2,4}$|\b\d{12,}\b/;
      return rawText
        .split('\n')
        .map(l => l.replace(/[*|\\/#@<>{}[\]]/g, '').trim())
        .filter(l => l.length >= 3 && l.length <= 60)
        .filter(l => !SKIP.test(l))
        .filter(l => !PRICE.test(l.trim()))
        // must contain at least one letter
        .filter(l => /[a-zA-Z]/.test(l))
        // strip trailing price if present e.g. "Chicken Breast  4.99"
        .map(l => l.replace(/\s+\$?[\d,]+\.\d{2}\s*[A-Z]?\s*$/, '').trim())
        .filter(l => l.length >= 3)
        // dedupe
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 30); // safety cap
    };

    /** Search Open Food Facts by name → best-match product info */
    const lookupItemByName = async (name: string): Promise<Partial<ReceiptItem>> => {
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(name)}&action=process&json=1&page_size=1&fields=product_name,categories_tags,product_quantity,product_quantity_unit,quantity`;
        const resp = await fetch(url);
        if (!resp.ok) return {};
        const data = await resp.json();
        const p = data.products?.[0];
        if (!p) return {};

        const allTags: string[] = p.categories_tags || [];
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

        let unit = "pcs";
        let quantity = "1";
        if (p.product_quantity && p.product_quantity_unit) {
          quantity = String(p.product_quantity);
          unit = p.product_quantity_unit.toLowerCase();
        } else if (p.quantity) {
          const m = String(p.quantity).match(/^([\d.]+)\s*([a-zA-Z]+)/);
          if (m) { quantity = m[1]; unit = m[2].toLowerCase(); }
        }
        return { type: mappedType, quantity, unit };
      } catch {
        return {};
      }
    };

    const captureAndProcessReceipt = async () => {
      if (!cameraRef.current) return;
      try {
        setReceiptProcessing(true);
        setReceiptStep('ocr');

        // Take photo
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
        setShowReceiptCamera(false);

        // OCR via ocr.space free API
        const formBody = new URLSearchParams({
          apikey: 'K88888888888888', // free demo key — user can replace
          base64Image: `data:image/jpeg;base64,${photo.base64}`,
          language: 'eng',
          isOverlayRequired: 'false',
        }).toString();

        const ocrResp = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody,
        });
        const ocrData = await ocrResp.json();
        const rawText: string = ocrData.ParsedResults?.[0]?.ParsedText || '';
        if (!rawText) {
          Alert.alert("Couldn't read receipt", "No text was detected. Try better lighting and hold the camera steady.");
          setReceiptProcessing(false);
          setReceiptStep('idle');
          return;
        }

        const lines = parseReceiptLines(rawText);
        if (lines.length === 0) {
          Alert.alert("No items found", "The receipt text was detected but no product lines could be extracted.");
          setReceiptProcessing(false);
          setReceiptStep('idle');
          return;
        }

        // Look up each item on Open Food Facts
        setReceiptStep('lookup');
        setReceiptLookupTotal(lines.length);
        setReceiptLookupProgress(0);

        const results: ReceiptItem[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const info = await lookupItemByName(line);
          const foundType = info.type ?? 'pantry';
          const foundTypeObj = itemTypes.find(t => t.value === foundType);
          results.push({
            id: `receipt-${i}`,
            name: line,
            quantity: info.quantity ?? '1',
            unit: info.unit ?? 'pcs',
            type: foundType,
            location: foundTypeObj?.location ?? 'Pantry',
            expirationDays: foundTypeObj?.expirationDays ?? 7,
            checked: true,
          });
          setReceiptLookupProgress(i + 1);
          // small delay to avoid hammering the API
          await new Promise(r => setTimeout(r, 120));
        }

        setReceiptItems(results);
        setReceiptProcessing(false);
        setReceiptStep('idle');
        setShowReceiptReview(true);
      } catch (err) {
        console.error('Receipt processing error:', err);
        Alert.alert("Error", "Failed to process receipt. Please try again.");
        setReceiptProcessing(false);
        setReceiptStep('idle');
        setShowReceiptCamera(false);
      }
    };

    const addReceiptItemsToPantry = async () => {
      const toAdd = receiptItems.filter(ri => ri.checked);
      if (toAdd.length === 0) {
        Alert.alert("Nothing selected", "Check at least one item to add.");
        return;
      }
      try {
        if (userId) {
          const batch = writeBatch(db);
          toAdd.forEach(ri => {
            const ref = doc(pantryCol(userId));
            const expDate = new Date(Date.now() + ri.expirationDays * 86400000).toISOString();
            batch.set(ref, {
              type: ri.type,
              name: ri.name,
              quantity: parseFloat(ri.quantity) || 1,
              unit: ri.unit,
              location: ri.location,
              dateAdded: new Date().toISOString(),
              expirationDate: expDate,
              userId,
              createdAt: Date.now(),
            });
          });
          await batch.commit();
        }
        setShowReceiptReview(false);
        setReceiptItems([]);
        setShowAddItemModal(false);
        Alert.alert("Added!", `${toAdd.length} item${toAdd.length !== 1 ? 's' : ''} added to your pantry.`);
      } catch (err) {
        console.error('Batch add error:', err);
        Alert.alert("Error", "Failed to add items. Please try again.");
      }
    };
    // ── end receipt scanner state ──────────────────────────────────────────
    const [itemTypes, setItemTypes] = useState([
      { label: "Produce",   value: "produce",   icon: "leaf-outline" as const,          expirationDays: 7,   location: "Fridge"  },
      { label: "Dairy",     value: "dairy",     icon: "water-outline" as const,         expirationDays: 14,  location: "Fridge"  },
      { label: "Meat",      value: "meat",      icon: "nutrition-outline" as const,     expirationDays: 3,   location: "Fridge"  },
      { label: "Frozen",    value: "frozen",    icon: "snow-outline" as const,          expirationDays: 90,  location: "Freezer" },
      { label: "Pantry",    value: "pantry",    icon: "archive-outline" as const,       expirationDays: 180, location: "Pantry"  },
      { label: "Bakery",    value: "bakery",    icon: "storefront-outline" as const,    expirationDays: 5,   location: "Counter" },
      { label: "Beverages", value: "beverages", icon: "cafe-outline" as const,          expirationDays: 30,  location: "Fridge"  },
    ]);

    useEffect(() => {
      const loadPreferences = async () => {
        if (!userId) return;
        try {
          const prefsDoc = await getDoc(settingsDoc(userId, "preferences"));
          if (prefsDoc.exists()) {
            const savedPrefs = prefsDoc.data().itemTypes || [];
            setItemTypes(savedPrefs);
          }
        } catch (_error) {}
      };
      if (showAddItemModal) loadPreferences();
    }, []);

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
      scanLockRef.current = true;
      setLookingUp(true);
      setScannedBarcode(barcode);
      try {
        // 1. Our Firestore DB first
        const snap = await getDoc(productDoc(barcode));
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
        const offResp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
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
            const allTags: string[] = p.categories_tags || [];
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
      }
    };

    const openScanner = async () => {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert("Camera Permission", "Camera access is required to scan barcodes.");
          return;
        }
      }
      setShowScanner(true);
      scanLockRef.current = false;
    };

    const handleAddItem = async () => {
      if (!newItem.name || !newItem.type) {
        Alert.alert("Missing Fields", "Please enter a name and choose a category.");
        return;
      }
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
      try {
        if (userId) {
          await addDoc(pantryCol(userId), {
            type: newItem.type,
            name: newItem.name,
            brand: newItem.brand || "",
            notes: newItem.notes || "",
            quantity: parseFloat(newItem.quantity) || 1,
            unit: newItem.unit || "pcs",
            location: effectiveLocation,
            dateAdded: new Date().toISOString(),
            expirationDate,
            userId,
            createdAt: Date.now(),
          });
          if (scannedBarcode && isNewProduct) {
            await setDoc(productDoc(scannedBarcode), {
              barcode: scannedBarcode,
              name: newItem.name,
              type: newItem.type,
              unit: newItem.unit || "pcs",
              defaultExpirationDays: selectedType?.expirationDays || 7,
              addedBy: userId,
              createdAt: Date.now(),
            } as ProductEntry);
          }
        } else {
          const newPantryItem: PantryItem = {
            id: Math.max(...items.map((i) => typeof i.id === "string" ? parseInt(i.id) : i.id), 0) + 1,
            type: newItem.type,
            name: newItem.name,
            quantity: parseFloat(newItem.quantity) || 1,
            unit: newItem.unit || "pcs",
            location: effectiveLocation,
            dateAdded: new Date().toISOString(),
            expirationDate,
          };
          setItems([...items, newPantryItem]);
        }
      } catch (error) {
        console.error("Error adding item:", error);
        Alert.alert("Error", "Failed to add item. Please try again.");
        return;
      }
      setNewItem({ name: "", type: "", location: "", quantity: "1", unit: "pcs", brand: "", notes: "", customExpiry: "" });
      setScannedBarcode(null);
      setIsNewProduct(false);
      setShowAdvanced(false);
      setShowAddItemModal(false);
    };

    const UNITS = ["pcs", "g", "kg", "ml", "L", "oz", "lb", "cups"];
    const LOCATIONS = ["Fridge", "Freezer", "Pantry", "Cupboard", "Counter", "Cabinet"];
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
        onRequestClose={() => setShowAddItemModal(false)}
      >
        {showScanner && (
          <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "qr"] }}
                onBarcodeScanned={({ data }) => handleBarcodeScan(data)}
              />
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
                <View style={{ width: 260, height: 160, borderRadius: 12, borderWidth: 2, borderColor: "#fff", backgroundColor: "transparent" }} />
                <Text style={{ color: "#fff", marginTop: 16, fontSize: 14, fontWeight: "500" }}>Point at a barcode</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowScanner(false)}
                style={{ position: "absolute", top: 56, right: 20, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}

        {/* ── Receipt Camera Modal ── */}
        {showReceiptCamera && (
          <Modal visible={showReceiptCamera} animationType="slide" onRequestClose={() => setShowReceiptCamera(false)}>
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
              {/* Overlay guide */}
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", pointerEvents: "none" }}>
                <View style={{ width: Dimensions.get("window").width * 0.88, height: Dimensions.get("window").height * 0.55, borderRadius: 12, borderWidth: 2, borderColor: "rgba(255,255,255,0.7)", backgroundColor: "transparent" }} />
                <Text style={{ color: "#fff", marginTop: 14, fontSize: 13, fontWeight: "500", textAlign: "center" }}>
                  Fit the receipt inside the frame
                </Text>
              </View>
              {/* Cancel */}
              <TouchableOpacity
                onPress={() => setShowReceiptCamera(false)}
                style={{ position: "absolute", top: 56, left: 20, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              {/* Capture */}
              <TouchableOpacity
                onPress={captureAndProcessReceipt}
                style={{ position: "absolute", bottom: 48, alignSelf: "center", width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.4)" }}
              >
                <Ionicons name="camera" size={32} color="#222" />
              </TouchableOpacity>
            </View>
          </Modal>
        )}

        {/* ── Receipt Processing Overlay ── */}
        {receiptProcessing && (
          <Modal visible={receiptProcessing} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", alignItems: "center", justifyContent: "center" }}>
              <View style={{ backgroundColor: surfaceBg, borderRadius: 20, padding: 28, alignItems: "center", width: 260 }}>
                <ActivityIndicator size="large" color={themeColors.accentColor} />
                <Text style={{ color: themeColors.textColor, fontWeight: "700", fontSize: 16, marginTop: 16 }}>
                  {receiptStep === 'ocr' ? 'Reading receipt…' : `Looking up items… (${receiptLookupProgress}/${receiptLookupTotal})`}
                </Text>
                <Text style={{ color: mutedText, fontSize: 13, marginTop: 6, textAlign: "center" }}>
                  {receiptStep === 'ocr' ? 'Extracting text with OCR' : 'Fetching product info'}
                </Text>
                {receiptStep === 'lookup' && receiptLookupTotal > 0 && (
                  <View style={{ width: "100%", height: 4, backgroundColor: mutedBorder, borderRadius: 2, marginTop: 14 }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: themeColors.accentColor, width: `${(receiptLookupProgress / receiptLookupTotal) * 100}%` }} />
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* ── Receipt Review Modal ── */}
        {showReceiptReview && (
          <Modal visible={showReceiptReview} animationType="slide" onRequestClose={() => setShowReceiptReview(false)}>
            <View style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}>
              {/* Header */}
              <View style={{ backgroundColor: isDark ? '#1c1c1c' : '#fff', borderBottomWidth: 1, borderBottomColor: mutedBorder, paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity onPress={() => setShowReceiptReview(false)} style={{ marginRight: 12 }}>
                  <Ionicons name="chevron-back" size={24} color={themeColors.accentColor} />
                </TouchableOpacity>
                <Text style={{ flex: 1, fontSize: 18, fontWeight: "700", color: themeColors.textColor }}>Review Receipt Items</Text>
                <Text style={{ color: mutedText, fontSize: 13 }}>{receiptItems.filter(r => r.checked).length}/{receiptItems.length}</Text>
              </View>

              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
                <Text style={{ color: mutedText, fontSize: 13, marginBottom: 16 }}>
                  Uncheck items you don't want. Edit names, quantities, and categories as needed.
                </Text>
                {receiptItems.map((ri, idx) => {
                  const foundTypeObj = itemTypes.find(t => t.value === ri.type);
                  return (
                    <View key={ri.id} style={{ backgroundColor: isDark ? "#2a2a2a" : "#fff", borderRadius: 14, marginBottom: 12, overflow: "hidden", borderWidth: 1.5, borderColor: ri.checked ? themeColors.accentColor : mutedBorder }}>
                      {/* Row header: checkbox + name */}
                      <TouchableOpacity
                        onPress={() => setReceiptItems(prev => prev.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r))}
                        style={{ flexDirection: "row", alignItems: "center", padding: 14, gap: 12 }}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: ri.checked ? themeColors.accentColor : mutedBorder, backgroundColor: ri.checked ? themeColors.accentColor : "transparent", alignItems: "center", justifyContent: "center" }}>
                          {ri.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <TextInput
                          style={{ flex: 1, fontSize: 15, fontWeight: "600", color: themeColors.textColor }}
                          value={ri.name}
                          onChangeText={text => setReceiptItems(prev => prev.map((r, i) => i === idx ? { ...r, name: text } : r))}
                          placeholder="Item name"
                          placeholderTextColor={mutedText}
                        />
                        <TouchableOpacity
                          onPress={() => setReceiptItems(prev => prev.filter((_, i) => i !== idx))}
                          style={{ padding: 4 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={isDark ? "#666" : "#ccc"} />
                        </TouchableOpacity>
                      </TouchableOpacity>

                      {ri.checked && (
                        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
                          {/* Quantity + Unit */}
                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, fontWeight: "600", color: mutedText, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Qty</Text>
                              <TextInput
                                style={{ borderWidth: 1.5, borderColor: mutedBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: themeColors.textColor, backgroundColor: inputBg }}
                                value={ri.quantity}
                                onChangeText={text => setReceiptItems(prev => prev.map((r, i) => i === idx ? { ...r, quantity: text } : r))}
                                keyboardType="decimal-pad"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, fontWeight: "600", color: mutedText, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Unit</Text>
                              <TextInput
                                style={{ borderWidth: 1.5, borderColor: mutedBorder, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, color: themeColors.textColor, backgroundColor: inputBg }}
                                value={ri.unit}
                                onChangeText={text => setReceiptItems(prev => prev.map((r, i) => i === idx ? { ...r, unit: text } : r))}
                              />
                            </View>
                          </View>
                          {/* Category chips */}
                          <View>
                            <Text style={{ fontSize: 11, fontWeight: "600", color: mutedText, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Category</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View style={{ flexDirection: "row", gap: 6 }}>
                                {itemTypes.map(t => {
                                  const sel = ri.type === t.value;
                                  return (
                                    <TouchableOpacity
                                      key={t.value}
                                      onPress={() => {
                                        const newType = itemTypes.find(it => it.value === t.value);
                                        setReceiptItems(prev => prev.map((r, i) => i === idx ? { ...r, type: t.value, location: newType?.location ?? r.location, expirationDays: newType?.expirationDays ?? r.expirationDays } : r));
                                      }}
                                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: sel ? themeColors.accentColor : "transparent", borderColor: sel ? themeColors.accentColor : mutedBorder }}
                                    >
                                      <Ionicons name={t.icon} size={12} color={sel ? "#fff" : themeColors.textColor} />
                                      <Text style={{ color: sel ? "#fff" : themeColors.textColor, fontSize: 12, fontWeight: sel ? "600" : "400" }}>{t.label}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </ScrollView>
                          </View>
                          {/* Location + Expiry hint */}
                          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                            <Ionicons name="location-outline" size={13} color={mutedText} />
                            <Text style={{ fontSize: 12, color: mutedText }}>{ri.location}</Text>
                            <Text style={{ color: mutedBorder }}>·</Text>
                            <Ionicons name="time-outline" size={13} color={mutedText} />
                            <Text style={{ fontSize: 12, color: mutedText }}>~{ri.expirationDays}d shelf life</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {/* Bottom action bar */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: isDark ? "#1c1c1c" : "#fff", borderTopWidth: 1, borderTopColor: mutedBorder, padding: 16, paddingBottom: Platform.OS === "ios" ? 36 : 16 }}>
                <TouchableOpacity
                  onPress={addReceiptItemsToPantry}
                  style={{ backgroundColor: receiptItems.filter(r => r.checked).length > 0 ? themeColors.accentColor : (isDark ? "#333" : "#d0d0d0"), borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: receiptItems.filter(r => r.checked).length > 0 ? "#fff" : mutedText, fontWeight: "700", fontSize: 16 }}>
                    Add {receiptItems.filter(r => r.checked).length} Item{receiptItems.filter(r => r.checked).length !== 1 ? 's' : ''} to Pantry
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <KeyboardAvoidingView
          style={{ flex: 1, justifyContent: "flex-end" }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" }}
            activeOpacity={1}
            onPress={() => setShowAddItemModal(false)}
          />

          <View style={{
            backgroundColor: surfaceBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            minHeight: Dimensions.get("window").height * 0.75,
            maxHeight: Dimensions.get("window").height * 0.92,
          }}>
            <View style={{ width: 40, height: 4, backgroundColor: "#ddd", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: "700", color: themeColors.textColor }}>Add Pantry Item</Text>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)} style={{ padding: 6 }}>
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
                  borderWidth: 1.5, borderColor: themeColors.accentColor, borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "#1a2e1a" : "#f0faf0",
                }}
              >
                {lookingUp
                  ? <ActivityIndicator size="small" color={themeColors.accentColor} />
                  : <Ionicons name="barcode-outline" size={20} color={themeColors.accentColor} />}
                <Text style={{ color: themeColors.accentColor, fontWeight: "600", fontSize: 14 }}>
                  {lookingUp ? "Looking up…" : scannedBarcode ? "Scan Again" : "Barcode"}
                </Text>
              </TouchableOpacity>
              {/* Receipt */}
              <TouchableOpacity
                onPress={openReceiptCamera}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  borderWidth: 1.5, borderColor: themeColors.accentColor, borderRadius: 12,
                  paddingVertical: 12,
                  backgroundColor: isDark ? "#1a2e1a" : "#f0faf0",
                }}
              >
                <Ionicons name="receipt-outline" size={20} color={themeColors.accentColor} />
                <Text style={{ color: themeColors.accentColor, fontWeight: "600", fontSize: 14 }}>Receipt</Text>
              </TouchableOpacity>
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
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name */}
              <Text style={labelStyle}>Item Name</Text>
              <TextInput
                style={{ ...inputStyle, borderColor: newItem.name ? themeColors.accentColor : mutedBorder, fontSize: 16, marginBottom: 20 }}
                placeholder="e.g. Chicken Breast"
                placeholderTextColor={isDark ? "#555" : "#bbb"}
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
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

              {/* Add button */}
              <TouchableOpacity
                onPress={handleAddItem}
                style={{
                  backgroundColor: allFilled ? themeColors.accentColor : (isDark ? "#333" : "#d0d0d0"),
                  borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 8,
                }}
              >
                <Text style={{ color: allFilled ? "#fff" : mutedText, fontWeight: "700", fontSize: 16 }}>Add to Pantry</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
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
                            {item.quantity} {item.unit}
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
