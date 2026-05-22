/**
 * Recipe Detail Screen - Shows full recipe with ingredients and steps
 * Displays which ingredients user has in pantry and which are missing
 */

import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, Modal, Platform, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, doc, getDoc, addDoc, deleteDoc, writeBatch, getDocs, query, orderBy, limit } from "firebase/firestore";
import { shoppingCol, pantryCol, recipesDoc, cookHistoryCol, settingsDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { formatQuantityForPreference, PreferredWeightUnit, UnitDisplayMode } from "@/screens/utils/unitUtils";
import RecipeFormScreen from "./RecipeFormScreen";

// ── Ingredient categorization ────────────────────────────────────────────
const INGREDIENT_CATEGORIES: { category: string; color: string; bg: string; bgDark: string; keywords: string[] }[] = [
  { category: 'Seasoning', color: '#b45309', bg: '#fff7ed', bgDark: '#2d1a00',
    keywords: ['salt','pepper','cumin','paprika','oregano','thyme','basil','cinnamon','turmeric','chili powder','garlic powder','onion powder','cayenne','bay leaf','rosemary','sage','cardamom','nutmeg','cloves','coriander','curry','ginger','mustard seed','saffron','anise','dill','fennel','marjoram','mint','parsley','tarragon','vanilla','spice','seasoning','chilli','chili flake','red pepper flake','allspice','sumac','za\'atar','harissa','smoked paprika','black pepper','white pepper'] },
  { category: 'Protein', color: '#b91c1c', bg: '#fff1f2', bgDark: '#2d0a0a',
    keywords: ['chicken','beef','pork','lamb','fish','salmon','tuna','shrimp','prawn','tofu','egg','turkey','bacon','sausage','crab','lobster','clam','duck','venison','lentil','chickpea','bean','tempeh','steak','mince','ground beef','ground turkey','cod','tilapia','halibut','scallop','mussel','oyster','anchovy','sardine','ham','pepperoni','chorizo','brisket','rib','wing','thigh','breast','fillet'] },
  { category: 'Produce', color: '#15803d', bg: '#f0fdf4', bgDark: '#0a2d0a',
    keywords: ['tomato','onion','garlic','carrot','celery','bell pepper','capsicum','spinach','lettuce','kale','broccoli','cucumber','zucchini','courgette','mushroom','potato','sweet potato','corn','pea','leek','cabbage','avocado','lemon','lime','orange','apple','banana','berry','blueberry','strawberry','raspberry','mango','pineapple','peach','plum','grape','watermelon','cantaloupe','melon','shallot','scallion','green onion','spring onion','bok choy','beet','radish','turnip','parsnip','asparagus','artichoke','eggplant','aubergine','squash','pumpkin','chive','cilantro','coriander leaf','jalapeño','habanero'] },
  { category: 'Dairy', color: '#1d4ed8', bg: '#eff6ff', bgDark: '#0a1a2d',
    keywords: ['milk','cream','butter','cheese','yogurt','yoghurt','sour cream','ricotta','mozzarella','parmesan','cheddar','heavy cream','whipping cream','half and half','brie','gouda','feta','cream cheese','cottage cheese','ghee','condensed milk','evaporated milk','buttermilk'] },
  { category: 'Grain', color: '#a16207', bg: '#fefce8', bgDark: '#2d2600',
    keywords: ['flour','rice','pasta','bread','oat','quinoa','barley','noodle','breadcrumb','cornstarch','couscous','tortilla','wrap','pita','baguette','sourdough','wheat','rye','buckwheat','semolina','polenta','grits','farro','millet','spelt','panko','cracker','crouton','cereal'] },
  { category: 'Sauce/Liquid', color: '#7e22ce', bg: '#faf5ff', bgDark: '#1a0d2d',
    keywords: ['oil','olive oil','vegetable oil','canola oil','sesame oil','coconut oil','soy sauce','tamari','vinegar','broth','stock','wine','beer','juice','sauce','coconut milk','water','fish sauce','oyster sauce','hoisin','worcestershire','hot sauce','tabasco','sriracha','ketchup','mustard','mayo','mayonnaise','aioli','teriyaki','balsamic','apple cider vinegar','white wine vinegar','red wine vinegar'] },
];

function categorizeIngredient(name: string): { category: string; color: string; bg: string; bgDark: string } {
  const lower = name.toLowerCase();
  for (const cat of INGREDIENT_CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) {
      return { category: cat.category, color: cat.color, bg: cat.bg, bgDark: cat.bgDark };
    }
  }
  return { category: 'Other', color: '#6b7280', bg: '#f9fafb', bgDark: '#1a1a1a' };
}

const CATEGORY_ORDER = ['Seasoning', 'Protein', 'Produce', 'Dairy', 'Grain', 'Sauce/Liquid', 'Other'];

function groupIngredients<T extends { name: string }>(ingredients: T[]): { category: string; color: string; bg: string; bgDark: string; items: T[] }[] {
  const map = new Map<string, { category: string; color: string; bg: string; bgDark: string; items: T[] }>();
  for (const ing of ingredients) {
    const cat = categorizeIngredient(ing.name);
    if (!map.has(cat.category)) map.set(cat.category, { ...cat, items: [] });
    map.get(cat.category)!.items.push(ing);
  }
  return CATEGORY_ORDER.filter(c => map.has(c)).map(c => map.get(c)!);
}

// ── Step timer parsing ────────────────────────────────────────────────────
function parseStepTime(step: string): { minSecs: number; maxSecs: number } | null {
  const text = step.toLowerCase();
  const toSecs = (val: number, unit: string) => unit.startsWith('hour') || unit === 'hr' || unit === 'h' ? val * 3600 : val * 60;

  // Match ranges like "2 to 2½ hours", "1-2 hours", "30–45 minutes"
  const rangeRe = /(\d+(?:\.\d+)?(?:\s*[½⅓⅔¼¾])?)[\s]*(?:to|–|-)[\s]*(\d+(?:\.\d+)?(?:\s*[½⅓⅔¼¾])?)[\s]*(minutes?|mins?|hours?|hrs?|h)\b/;
  const rangeMatch = text.match(rangeRe);
  if (rangeMatch) {
    const parseVal = (s: string) => {
      const fracs: Record<string, number> = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 };
      let v = parseFloat(s) || 0;
      for (const [ch, fv] of Object.entries(fracs)) if (s.includes(ch)) v += fv;
      return v;
    };
    const min = parseVal(rangeMatch[1]);
    const max = parseVal(rangeMatch[2]);
    const unit = rangeMatch[3];
    return { minSecs: toSecs(min, unit), maxSecs: toSecs(max, unit) };
  }

  // Single value: "25 minutes", "1.5 hours"
  const singleRe = /(\d+(?:\.\d+)?(?:\s*[½⅓⅔¼¾])?)[\s]*(minutes?|mins?|hours?|hrs?|h)\b/;
  const singleMatch = text.match(singleRe);
  if (singleMatch) {
    const parseVal = (s: string) => {
      const fracs: Record<string, number> = { '½': 0.5, '⅓': 0.333, '⅔': 0.667, '¼': 0.25, '¾': 0.75 };
      let v = parseFloat(s) || 0;
      for (const [ch, fv] of Object.entries(fracs)) if (s.includes(ch)) v += fv;
      return v;
    };
    const val = parseVal(singleMatch[1]);
    const unit = singleMatch[2];
    const secs = toSecs(val, unit);
    return { minSecs: secs, maxSecs: secs };
  }
  return null;
}

function fmtTime(secs: number): string {
  const s = Math.max(0, Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function normalizeIngredientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\b(large|medium|small|fresh|dried|ground|minced|chopped|sliced)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeIngredientName(value: string): string {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function namesMatch(left: string, right: string): boolean {
  const normalizedLeft = singularizeIngredientName(normalizeIngredientName(left));
  const normalizedRight = singularizeIngredientName(normalizeIngredientName(right));
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight;
}

function namesLooselyMatch(left: string, right: string): boolean {
  if (namesMatch(left, right)) return true;

  const normalizedLeft = singularizeIngredientName(normalizeIngredientName(left));
  const normalizedRight = singularizeIngredientName(normalizeIngredientName(right));
  if (!normalizedLeft || !normalizedRight) return false;

  const leftTokens = normalizedLeft.split(" ").filter(Boolean);
  const rightTokens = normalizedRight.split(" ").filter(Boolean);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;

  const leftCore = leftTokens.filter(t => t.length >= 3);
  const rightCore = rightTokens.filter(t => t.length >= 3);
  if (leftCore.length === 0 || rightCore.length === 0) return false;

  const overlap = leftCore.filter(t => rightCore.includes(t));
  const minCore = Math.min(leftCore.length, rightCore.length);
  return overlap.length >= 1 && overlap.length >= Math.ceil(minCore / 2);
}

interface Ingredient {
  name: string;
  quantity: number | string;
  unit: string;
}

interface ShoppingListItem {
  id: string;
  name: string;
  completed: boolean;
  ingredientKey?: string;
  sourceRecipeId?: string;
}

function buildIngredientKey(ingredient: Ingredient, index?: number): string {
  const name = singularizeIngredientName(normalizeIngredientName(ingredient.name || ""));
  const quantity = typeof ingredient.quantity === "string" ? ingredient.quantity.trim() : String(ingredient.quantity ?? "");
  const unit = (ingredient.unit || "").trim().toLowerCase();
  const keyBase = `${name}|${quantity}|${unit}`;
  return typeof index === "number" ? `${keyBase}|${index}` : keyBase;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  servings: number | string;
  cookTime: number | string;
  ingredients: Ingredient[];
  instructions: string[];
  difficulty: string;
  cuisine?: string;
}

interface ThemeColors {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
}

interface RecipeDetailScreenProps {
  recipeId?: string;
  onBack?: () => void;
  theme?: ThemeColors;
}

export default function RecipeDetailScreen({ recipeId, onBack, theme }: RecipeDetailScreenProps) {
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [addingIngredient, setAddingIngredient] = useState<string | null>(null);
  const [shoppingListItems, setShoppingListItems] = useState<ShoppingListItem[]>([]);
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Cook mode
  const [cookMode, setCookMode] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cookTab, setCookTab] = useState<'ingredients' | 'steps'>('ingredients');
  const [prepChecked, setPrepChecked] = useState<boolean[]>([]);
  const [stepChecked, setStepChecked] = useState<boolean[]>([]);
  const [cookComplete, setCookComplete] = useState(false);
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<PreferredWeightUnit>("g");
  const [unitDisplayMode, setUnitDisplayMode] = useState<UnitDisplayMode>("converted");
  // Step timers: keyed by step index
  const [stepTimers, setStepTimers] = useState<Record<number, { remaining: number; running: boolean; adjusted: number }>>({});
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const getDisplayQuantityText = (quantity: number | string, unit: string) => {
    const converted = formatQuantityForPreference(quantity, unit || "", preferredWeightUnit, unitDisplayMode);
    if (!converted.unitText) return converted.quantityText;
    return `${converted.quantityText} ${converted.unitText}`;
  };

  useEffect(() => {
    if (!recipeId) return;
    
    console.log("Loading recipe with ID:", recipeId);
    
    // Load from Firestore using real-time listener for instant display
    const docRef = recipesDoc(userId, recipeId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      console.log("Firestore doc exists:", docSnap.exists());
      console.log("Firestore doc data:", docSnap.data());
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipe({
          id: docSnap.id,
          name: data.name,
          description: data.description || "",
          servings: data.servings,
          cookTime: data.cookTime,
          difficulty: data.difficulty,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
        } as Recipe);
      } else {
        console.log("Document does not exist");
      }
    }, (error) => {
      console.error("Error loading recipe from Firestore:", error);
    });

    return () => unsubscribe();
  }, [recipeId, userId]);

  // Load shopping list items with real-time listener
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(shoppingCol(userId), (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        name: (d.data().name || "").toLowerCase(),
        completed: d.data().completed || false,
        ingredientKey: d.data().ingredientKey,
        sourceRecipeId: d.data().sourceRecipeId,
      }));
      setShoppingListItems(items);
    }, (error) => {
      console.error("Error loading shopping list:", error);
    });
    
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const loadUnitPreference = async () => {
      try {
        const snap = await getDoc(settingsDoc(userId, "preferences"));
        if (snap.exists()) {
          const pref = snap.data().preferredWeightUnit;
          const displayMode = snap.data().unitDisplayMode;
          if (pref === "g" || pref === "lb") setPreferredWeightUnit(pref);
          if (displayMode === "converted" || displayMode === "as_is") setUnitDisplayMode(displayMode);
        }
      } catch (error) {
        console.error("Error loading unit preference:", error);
      }
    };

    loadUnitPreference();
  }, [userId]);

  // Load pantry items from Firestore with real-time listener
  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(pantryCol(userId), (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: `fs_${doc.id}`,
        name: doc.data().name || "",
        type: doc.data().type || "",
        quantity: doc.data().quantity || 0,
        unit: doc.data().unit || "",
        location: doc.data().location || "",
        expirationDate: doc.data().expirationDate || "",
      }));
      setPantryItems(items);
    }, (error) => {
      console.error("Error loading pantry items:", error);
    });
    
    return () => unsubscribe();
  }, [userId]);

  // Timer tick
  useEffect(() => {
    timerIntervalRef.current = setInterval(() => {
      setStepTimers(prev => {
        const next = { ...prev };
        let changed = false;
        for (const key in next) {
          const t = next[key];
          if (t.running && t.remaining > 0) {
            next[key] = { ...t, remaining: t.remaining - 1 };
            changed = true;
            if (next[key].remaining === 0) {
              Alert.alert("Timer's up!", `Step ${Number(key) + 1} timer finished.`);
              next[key] = { ...next[key], running: false };
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, []);

  // Check ingredient availability in pantry and shopping list
  const getIngredientStatus = (ingredient: Ingredient, ingredientIndex?: number): { status: 'available' | 'partial' | 'missing' | 'shopping' | 'completed' | 'expired'; inShoppingList: boolean; isCompleted: boolean } => {
    const ingredientNameLower = ingredient.name.toLowerCase();
    const ingredientKey = buildIngredientKey(ingredient, ingredientIndex);

    // Prefer exact key matches for recipe-generated items; fallback to name match for legacy items.
    const shoppingMatches = shoppingListItems.filter(item => {
      if (item.ingredientKey) {
        return item.ingredientKey === ingredientKey && (!item.sourceRecipeId || item.sourceRecipeId === recipeId);
      }
      return namesLooselyMatch(item.name, ingredient.name);
    });
    const completedMatch = shoppingMatches.find(item => item.completed);
    const shoppingMatch = shoppingMatches.find(item => !item.completed);

    if (completedMatch) {
      return { status: 'completed', inShoppingList: true, isCompleted: true };
    }
    if (shoppingMatch) {
      return { status: 'shopping', inShoppingList: true, isCompleted: false };
    }
    
    // Try to find ALL matching items in pantry (case-insensitive, partial match)
    // Check both name and type fields
    const matchedItems = pantryItems.filter(item => {
      const itemName = (item.name || "").toLowerCase();
      const itemType = (item.type || "").toLowerCase();
      return itemName.includes(ingredientNameLower) ||
             ingredientNameLower.includes(itemName) ||
             itemType.includes(ingredientNameLower) ||
             ingredientNameLower.includes(itemType);
    });

    if (matchedItems.length === 0) {
      return { status: 'missing', inShoppingList: false, isCompleted: false };
    }

    // Helper function to check if an item is expired
    const isItemExpired = (item: any): boolean => {
      if (!item.expirationDate) return false;
      const expirationDate = new Date(item.expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expirationDate.setHours(0, 0, 0, 0);
      return expirationDate < today;
    };

    // Prioritize non-expired items
    const nonExpiredItems = matchedItems.filter(item => !isItemExpired(item));
    const itemsToCheck = nonExpiredItems.length > 0 ? nonExpiredItems : matchedItems;
    const matchedItem = itemsToCheck[0];

    // If the best match is expired and there were no non-expired items
    if (isItemExpired(matchedItem) && nonExpiredItems.length === 0) {
      return { status: 'expired', inShoppingList: false, isCompleted: false };
    }

    // Check if quantity is sufficient
    if (matchedItem.quantity >= ingredient.quantity) {
      return { status: 'available', inShoppingList: false, isCompleted: false };
    }

    return { status: 'partial', inShoppingList: false, isCompleted: false };
  };

  const removeSingleIngredientFromShoppingList = async (ingredient: Ingredient, ingredientIndex?: number) => {
    if (!userId) return;
    const ingredientKey = buildIngredientKey(ingredient, ingredientIndex);
    const matchingItems = shoppingListItems.filter(item => {
      if (!item.id) return false;
      if (item.ingredientKey) {
        return item.ingredientKey === ingredientKey && (!item.sourceRecipeId || item.sourceRecipeId === recipeId);
      }
      return namesLooselyMatch(item.name, ingredient.name);
    });
    if (matchingItems.length === 0) return;

    const removedIds = new Set(matchingItems.map(item => item.id));
    setShoppingListItems(prev => prev.filter(item => !removedIds.has(item.id)));

    try {
      await Promise.all(matchingItems.map(item => deleteDoc(doc(db, 'users', userId, 'shopping', item.id))));
    } catch (err) {
      console.error('Error removing shopping item:', err);
      setShoppingListItems(prev => [...prev, ...matchingItems.filter(item => !prev.some(existing => existing.id === item.id))]);
    }
  };

  const addSingleIngredientToShoppingList = async (ingredient: Ingredient, ingredientIndex?: number) => {
    if (!userId) {
      Alert.alert("Error", "Unable to add ingredient");
      return;
    }

    const ingredientKey = buildIngredientKey(ingredient, ingredientIndex);
    if (shoppingListItems.some(item => {
      if (item.ingredientKey) {
        return item.ingredientKey === ingredientKey && (!item.sourceRecipeId || item.sourceRecipeId === recipeId);
      }
      return namesLooselyMatch(item.name, ingredient.name);
    })) {
      Alert.alert("Info", `${ingredient.name} is already in your shopping list`);
      return;
    }

    try {
      await addDoc(shoppingCol(userId), {
        name: ingredient.name,
        quantity: ingredient.quantity.toString(),
        unit: ingredient.unit,
        completed: false,
        userId,
        createdAt: Date.now(),
        source: "recipe",
        ingredientKey,
        sourceRecipeId: recipeId || null,
      });
    } catch (error) {
      console.error("Error adding ingredient:", error);
      Alert.alert("Error", "Failed to add ingredient to shopping list");
    }
  };

  // ── Cook Mode ─────────────────────────────────────────────────────────────
  const startCooking = () => {
    if (!recipe) return;

    const doStart = () => {
      setPrepChecked(new Array(recipe.ingredients.length).fill(false));
      setStepChecked(new Array(recipe.instructions.length).fill(false));
      setCookTab('ingredients');
      setCookComplete(false);
      // Init timers for steps that have time mentions
      const timers: Record<number, { remaining: number; running: boolean; adjusted: number }> = {};
      recipe.instructions.forEach((inst, i) => {
        const t = parseStepTime(inst);
        if (t) timers[i] = { remaining: t.maxSecs, running: false, adjusted: t.maxSecs };
      });
      setStepTimers(timers);
      setCookMode(true);
    };

    // Check for unsatisfied ingredients
    const unsatisfied = recipe.ingredients
      .map((ing, i) => ({ ing, i, status: getIngredientStatus(ing, i).status }))
      .filter(({ status }) => status === 'missing' || status === 'partial' || status === 'expired');

    if (unsatisfied.length > 0) {
      const lines = unsatisfied.map(({ ing, status }) => {
        const label = status === 'partial' ? 'low / not enough' : status === 'expired' ? 'expired' : 'missing';
        return `\u2022 ${ing.name} (${label})`;
      }).join('\n');

      Alert.alert(
        'Heads up!',
        `You may be short on some ingredients:\n\n${lines}\n\nDo you still want to proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Proceed Anyway', onPress: doStart },
        ]
      );
    } else {
      doStart();
    }
  };

  const allStepsDone = recipe ? stepChecked.every(Boolean) : false;

  const finishCooking = async () => {
    if (!recipe || !userId) return;
    try {
      // 1. Log to cook history
      await addDoc(cookHistoryCol(userId), {
        recipeId: recipe.id,
        recipeName: recipe.name,
        cookedAt: Date.now(),
        ingredients: recipe.ingredients.map(i => ({
          name: i.name,
          quantity: String(i.quantity),
          unit: i.unit,
        })),
        userId,
      });

      // 2. Deduct ingredients from pantry
      if (recipe.ingredients.length > 0) {
        const batch = writeBatch(db);
        for (const ing of recipe.ingredients) {
          const nameLower = ing.name.toLowerCase();
          const needed = typeof ing.quantity === 'string' ? parseFloat(ing.quantity) : (ing.quantity ?? 0);
          if (needed <= 0) continue;

          // Find matching pantry docs
          const pantrySnap = await getDocs(pantryCol(userId));
          let remaining = needed;
          for (const pDoc of pantrySnap.docs) {
            if (remaining <= 0) break;
            const d = pDoc.data();
            const pName = (d.name || "").toLowerCase();
            if (pName.includes(nameLower) || nameLower.includes(pName)) {
              const have = Number(d.quantity) || 0;
              if (have <= remaining) {
                // Use all of this item
                batch.delete(pDoc.ref);
                remaining -= have;
              } else {
                // Partially deduct
                batch.update(pDoc.ref, { quantity: have - remaining });
                remaining = 0;
              }
            }
          }
        }
        await batch.commit();
      }

      setCookMode(false);
      Alert.alert("Great job!", `"${recipe.name}" has been logged to your cook history and pantry has been updated.`);
    } catch (err) {
      console.error("Finish cooking error:", err);
      Alert.alert("Error", "Failed to save cook history. Please try again.");
    }
  };

  const handleFinishPress = () => {
    if (!allStepsDone) {
      Alert.alert(
        "Not all steps done",
        "You still have unchecked steps. Mark all steps complete to finish.",
        [
          { text: "Keep Cooking", style: "cancel" },
          { text: "Finish Anyway", onPress: finishCooking },
        ]
      );
    } else {
      Alert.alert(
        "Done cooking?",
        "This will log the cook and remove the used ingredients from your pantry.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, I'm Done!", onPress: finishCooking },
        ]
      );
    }
  };
  // ── end Cook Mode ──────────────────────────────────────────────────────────

  if (!recipe) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
        <Text style={{ color: themeColors.textColor }}>Loading...</Text>
      </View>
    );
  }

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const isDark = themeColors.mode === 'dark';
  const surfaceBg = isDark ? '#1e1e1e' : '#fff';
  const mutedText = isDark ? '#aaa' : '#666';
  const mutedBorder = isDark ? '#333' : '#e8e8e8';

  const handleDeleteRecipe = () => {
    Alert.alert(
      "Delete Recipe",
      `Are you sure you want to delete "${recipe?.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Only delete if it's a Firestore recipe (not a local one)
              if (recipeId && !recipeId.startsWith("local_")) {
                await deleteDoc(recipesDoc(userId, recipeId));
                Alert.alert("Success", "Recipe deleted successfully", [
                  { text: "OK", onPress: () => onBack?.() }
                ]);
              } else {
                Alert.alert("Info", "Local recipes cannot be deleted");
              }
            } catch (error) {
              console.error("Error deleting recipe:", error);
              Alert.alert("Error", "Failed to delete recipe");
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Force re-fetch of pantry and shopping list items
      // The onSnapshot listeners will automatically update the state
      // We just need to add a small delay to ensure fresh data is fetched
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor }]}>
      {/* ── Edit Modal ───────────────────────────────────────────────────────── */}
      {recipe && (
        <RecipeFormScreen
          visible={showEditModal}
          editRecipeId={recipeId}
          initialData={{
            name: recipe.name,
            description: recipe.description || "",
            servings: String(recipe.servings || ""),
            cookTime: String(recipe.cookTime || ""),
            difficulty: recipe.difficulty || "easy",
            ingredients: recipe.ingredients.map((ing, i) => ({ id: i + 1, name: ing.name, quantity: String(ing.quantity || "1"), unit: ing.unit || "" })),
            instructions: recipe.instructions.length > 0 ? recipe.instructions : [""],
          }}
          onRecipeSaved={() => setShowEditModal(false)}
          onCancel={() => setShowEditModal(false)}
          theme={themeColors}
        />
      )}
      {/* ── Cook Mode Modal ─────────────────────────────────────────────────── */}
      <Modal visible={cookMode} animationType="slide" onRequestClose={() => setCookMode(false)}>
        <View style={{ flex: 1, backgroundColor: themeColors.backgroundColor }}>
          {/* Header */}
          <View style={{
            backgroundColor: surfaceBg, borderBottomWidth: 1, borderBottomColor: mutedBorder,
            paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingBottom: 14, paddingHorizontal: 16,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: themeColors.accentColor, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>
                  Now Cooking
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.textColor }} numberOfLines={2}>
                  {recipe.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert('Stop Cooking?', 'Your progress will not be saved.', [
                    { text: 'Keep Going', style: 'cancel' },
                    { text: 'Stop', style: 'destructive', onPress: () => setCookMode(false) },
                  ]);
                }}
                style={{ marginLeft: 12, padding: 8, borderRadius: 20, backgroundColor: isDark ? '#333' : '#f0f0f0' }}
              >
                <Ionicons name="close" size={20} color={mutedText} />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: isDark ? '#2a2a2a' : '#f3f3f3', borderRadius: 10, padding: 3 }}>
              {(['ingredients', 'steps'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setCookTab(tab)}
                  style={{
                    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                    backgroundColor: cookTab === tab ? themeColors.accentColor : 'transparent',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={tab === 'ingredients' ? 'nutrition-outline' : 'list-outline'}
                      size={15}
                      color={cookTab === tab ? '#fff' : mutedText}
                    />
                    <Text style={{ fontWeight: '700', fontSize: 13, color: cookTab === tab ? '#fff' : mutedText, textTransform: 'capitalize' }}>{tab}</Text>
                    {tab === 'ingredients' && (
                      <View style={{ backgroundColor: cookTab === tab ? 'rgba(255,255,255,0.3)' : themeColors.accentColor + '33', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: cookTab === tab ? '#fff' : themeColors.accentColor }}>
                          {prepChecked.filter(Boolean).length}/{recipe.ingredients.length}
                        </Text>
                      </View>
                    )}
                    {tab === 'steps' && (
                      <View style={{ backgroundColor: cookTab === tab ? 'rgba(255,255,255,0.3)' : themeColors.accentColor + '33', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: cookTab === tab ? '#fff' : themeColors.accentColor }}>
                          {stepChecked.filter(Boolean).length}/{recipe.instructions.length}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content */}
          {cookTab === 'ingredients' ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
              <Text style={{ fontSize: 13, color: mutedText, marginBottom: 16, lineHeight: 20 }}>
                Tap each ingredient as you measure and prep it.
              </Text>
              {groupIngredients(recipe.ingredients).map(group => {
                // find indices of these items in original array
                return (
                  <View key={group.category}>
                    {/* Category header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: group.color, marginRight: 7 }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: group.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {group.category}
                      </Text>
                    </View>
                    {group.items.map(ing => {
                      const i = recipe.ingredients.indexOf(ing);
                      const checked = prepChecked[i] ?? false;
                      return (
                        <TouchableOpacity
                          key={i}
                          onPress={() => { const a = [...prepChecked]; a[i] = !a[i]; setPrepChecked(a); }}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 14,
                            backgroundColor: checked
                              ? (isDark ? '#1a2e1a' : '#eafaf0')
                              : (isDark ? group.bgDark : group.bg),
                            borderRadius: 14, padding: 14, marginBottom: 10,
                            borderWidth: 1.5,
                            borderColor: checked ? themeColors.accentColor : group.color + '55',
                            borderLeftWidth: 3.5, borderLeftColor: group.color,
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{
                            width: 26, height: 26, borderRadius: 13, borderWidth: 2,
                            borderColor: checked ? themeColors.accentColor : group.color,
                            backgroundColor: checked ? themeColors.accentColor : 'transparent',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 16, fontWeight: '600', color: themeColors.textColor,
                              textDecorationLine: checked ? 'line-through' : 'none',
                              opacity: checked ? 0.5 : 1,
                            }}>
                              {ing.name}
                            </Text>
                            {(ing.quantity || ing.unit) ? (
                              <Text style={{ fontSize: 13, color: mutedText, marginTop: 2 }}>
                                {getDisplayQuantityText(ing.quantity, ing.unit || "")}
                              </Text>
                            ) : null}
                          </View>
                          {checked && <Ionicons name="checkmark-circle" size={20} color={themeColors.accentColor} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
              <Text style={{ fontSize: 13, color: mutedText, marginBottom: 16, lineHeight: 20 }}>
                Follow the steps and check each one off as you go.
              </Text>
              {recipe.instructions.map((inst, i) => {
                const checked = stepChecked[i] ?? false;
                const isNext = !checked && stepChecked.slice(0, i).every(Boolean);
                const timer = stepTimers[i];
                const timeParsed = parseStepTime(inst);
                return (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <TouchableOpacity
                      onPress={() => { const a = [...stepChecked]; a[i] = !a[i]; setStepChecked(a); }}
                      style={{
                        flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                        backgroundColor: checked
                          ? (isDark ? '#1a2e1a' : '#eafaf0')
                          : isNext
                            ? (isDark ? '#2a2a00' : '#fffbea')
                            : (isDark ? '#252525' : '#fafafa'),
                        borderRadius: timer ? 14 : 14,
                        borderBottomLeftRadius: timer ? 0 : 14,
                        borderBottomRightRadius: timer ? 0 : 14,
                        padding: 14,
                        borderWidth: 1.5, borderColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : mutedBorder,
                        borderBottomWidth: timer ? 0 : 1.5,
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : (isDark ? '#333' : '#eee'),
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                      }}>
                        {checked
                          ? <Ionicons name="checkmark" size={16} color="#fff" />
                          : <Text style={{ fontSize: 12, fontWeight: '700', color: isNext ? '#fff' : mutedText }}>{i + 1}</Text>}
                      </View>
                      <Text style={{
                        flex: 1, fontSize: 15, color: themeColors.textColor, lineHeight: 22,
                        textDecorationLine: checked ? 'line-through' : 'none',
                        opacity: checked ? 0.45 : 1,
                      }}>
                        {inst}
                      </Text>
                    </TouchableOpacity>

                    {/* Inline timer row */}
                    {timer && timeParsed && (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        backgroundColor: isDark ? '#1a1a1a' : '#f3f3f3',
                        borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0,
                        paddingHorizontal: 14, paddingVertical: 10,
                        borderWidth: 1.5, borderTopWidth: 0,
                        borderColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : mutedBorder,
                      }}>
                        {/* Countdown display */}
                        <View style={{
                          backgroundColor: timer.running
                            ? themeColors.accentColor
                            : timer.remaining === 0
                              ? '#ef4444'
                              : (isDark ? '#333' : '#e8e8e8'),
                          borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, minWidth: 70, alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: timer.running || timer.remaining === 0 ? '#fff' : themeColors.textColor, fontVariant: ['tabular-nums'] }}>
                            {fmtTime(timer.remaining)}
                          </Text>
                        </View>

                        {/* − / + adjust buttons */}
                        <TouchableOpacity
                          onPress={() => setStepTimers(prev => {
                            const t = prev[i];
                            if (!t) return prev;
                            const newSecs = Math.max(60, t.remaining - 60);
                            return { ...prev, [i]: { ...t, remaining: newSecs, adjusted: newSecs } };
                          })}
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#333' : '#e0e0e0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.textColor }}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setStepTimers(prev => {
                            const t = prev[i];
                            if (!t) return prev;
                            const newSecs = t.remaining + 60;
                            return { ...prev, [i]: { ...t, remaining: newSecs, adjusted: newSecs } };
                          })}
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#333' : '#e0e0e0', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.textColor }}>+</Text>
                        </TouchableOpacity>

                        {/* Play / pause */}
                        <TouchableOpacity
                          onPress={() => setStepTimers(prev => {
                            const t = prev[i];
                            if (!t) return prev;
                            if (t.remaining === 0) {
                              // Reset
                              return { ...prev, [i]: { ...t, remaining: t.adjusted, running: false } };
                            }
                            return { ...prev, [i]: { ...t, running: !t.running } };
                          })}
                          style={{
                            flexDirection: 'row', alignItems: 'center', gap: 5,
                            backgroundColor: timer.remaining === 0 ? '#6b7280' : themeColors.accentColor,
                            borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, marginLeft: 'auto' as any,
                          }}
                        >
                          <Ionicons
                            name={timer.remaining === 0 ? 'refresh' : timer.running ? 'pause' : 'play'}
                            size={14}
                            color="#fff"
                          />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>
                            {timer.remaining === 0 ? 'Reset' : timer.running ? 'Pause' : 'Start'}
                          </Text>
                        </TouchableOpacity>

                        {/* Suggested time label */}
                        {timeParsed.minSecs !== timeParsed.maxSecs ? (
                          <Text style={{ fontSize: 11, color: mutedText, position: 'absolute', right: 14, bottom: -16 }} />
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Finish Cooking button */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: surfaceBg, borderTopWidth: 1, borderTopColor: mutedBorder,
            padding: 16, paddingBottom: Platform.OS === 'ios' ? 36 : 16,
          }}>
            {cookTab === 'steps' ? (
              <TouchableOpacity
                onPress={handleFinishPress}
                style={{ backgroundColor: allStepsDone ? themeColors.accentColor : (isDark ? '#333' : '#d0d0d0'), borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: allStepsDone ? '#fff' : mutedText, fontWeight: '700', fontSize: 16 }}>
                  {allStepsDone ? '🎉 Done — Log & Update Pantry' : `${stepChecked.filter(Boolean).length}/${recipe.instructions.length} steps complete`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCookTab('steps')}
                style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Start Cooking →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
      {/* ── end Cook Mode Modal ─────────────────────────────────────────────── */}
      {onBack && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff", borderBottomWidth: 1, borderBottomColor: themeColors.mode === "dark" ? "#444" : "#e8e8e8", paddingTop: 50 }}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: 'transparent', borderBottomWidth: 0, paddingTop: 0 }]} onPress={onBack}>
            <Ionicons name="chevron-back" size={20} color={themeColors.accentColor} />
            <Text style={[styles.backButtonText, { color: themeColors.accentColor }]}>Back</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 14 }}>
            <TouchableOpacity
              onPress={startCooking}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: themeColors.accentColor, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}
            >
              <Ionicons name="flame-outline" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Cook</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={themeColors.accentColor}
            progressBackgroundColor={themeColors.mode === "dark" ? "#333" : "#fff"}
          />
        }
      >
        {/* Header */}
        <TouchableOpacity 
          onLongPress={handleDeleteRecipe} 
          delayLongPress={500}
          style={[styles.header, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
          activeOpacity={1}
        >
          <Text style={[styles.title, { color: themeColors.textColor }]}>{recipe.name}</Text>
          <Text style={[styles.description, { color: themeColors.mode === "dark" ? "#bbb" : "#666" }]}>{recipe.description}</Text>

          {/* Recipe Meta Info */}
          <View style={[styles.metaContainer, { backgroundColor: themeColors.mode === "dark" ? "#444" : "#f8f9fa" }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Servings:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.servings || "--"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Cook Time:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.cookTime ? `${recipe.cookTime} mins` : "--"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: themeColors.mode === "dark" ? "#aaa" : "#888" }]}>Difficulty:</Text>
              <Text style={[styles.metaValue, { color: themeColors.textColor }]}>{recipe.difficulty}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Ingredients Section */}
        <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Ingredients</Text>
          {groupIngredients(recipe.ingredients).map(group => (
            <View key={group.category}>
              {/* Category header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, marginTop: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: group.color, marginRight: 7 }} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: group.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  {group.category}
                </Text>
              </View>
              {group.items.map((ingredient, idx) => {
                const ingredientIndex = recipe.ingredients.indexOf(ingredient);
                const { status } = getIngredientStatus(ingredient, ingredientIndex);
                const shoppingTone = status === 'shopping';
                const completedTone = status === 'completed';
                return (
                  <View
                    key={`ingredient-${group.category}-${idx}`}
                    style={[
                      styles.ingredientItem,
                      status === 'available' && styles.ingredientAvailable,
                      status === 'partial' && styles.ingredientPartial,
                      status === 'missing' && styles.ingredientMissing,
                      status === 'shopping' && styles.ingredientShopping,
                      status === 'completed' && styles.ingredientCompleted,
                      status === 'expired' && { backgroundColor: '#fccccb' },
                      isDark && (status === 'missing' || status === 'partial' || status === 'available' || status === 'expired') && { backgroundColor: '#444' },
                      { borderLeftWidth: 4, borderLeftColor: group.color },
                    ]}
                  >
                    <Text style={[styles.ingredientBullet, { color: shoppingTone ? '#1d4ed8' : completedTone ? '#166534' : status === 'expired' ? '#d32f2f' : themeColors.accentColor }]}>
                      {completedTone ? '✓' : status === 'expired' ? '✕' : shoppingTone ? '•' : '-'}
                    </Text>
                    <View style={styles.ingredientContent}>
                      <Text style={[styles.ingredientName, { color: shoppingTone ? '#1e3a8a' : completedTone ? '#166534' : status === 'expired' ? '#d32f2f' : themeColors.textColor, textDecorationLine: completedTone || status === 'expired' ? 'line-through' : 'none' }]}>
                        {getDisplayQuantityText(ingredient.quantity, ingredient.unit || "")} {ingredient.name}
                      </Text>
                      <Text style={[styles.ingredientStatus, { color: shoppingTone ? '#1d4ed8' : completedTone ? '#166534' : status === 'expired' ? '#b71c1c' : isDark ? '#aaa' : '#666' }]}>
                        {status === 'available' ? '(In Stock)' : status === 'partial' ? '(Not Enough)' : status === 'shopping' ? '(On Shopping List)' : status === 'completed' ? '(Purchased)' : status === 'expired' ? '(Expired)' : '(Missing)'}
                      </Text>
                    </View>
                    {(shoppingTone || completedTone) && (
                      <TouchableOpacity
                        onPress={() => removeSingleIngredientFromShoppingList(ingredient, ingredientIndex)}
                        style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: shoppingTone ? '#60a5fa' : '#4ade80', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' }}
                      >
                        <Ionicons name="close" size={14} color={shoppingTone ? '#1d4ed8' : '#166534'} />
                      </TouchableOpacity>
                    )}
                    {(status === 'missing' || status === 'partial' || status === 'expired') && (
                      <TouchableOpacity
                        onPress={() => addSingleIngredientToShoppingList(ingredient, ingredientIndex)}
                        style={[styles.addIngredientButton, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: themeColors.accentColor }]}
                      >
                        <Text style={[styles.addIngredientButtonText, { color: themeColors.accentColor }]}>+</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Instructions Section */}
        <View style={[styles.section, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.textColor }]}>Instructions</Text>
          {recipe.instructions.map((instruction, index) => (
            <View key={`instruction-${index}`} style={[styles.instructionItem, { borderBottomColor: themeColors.mode === "dark" ? "#555" : "#f0f0f0" }]}>
              <Text style={[styles.instructionNumber, { color: themeColors.accentColor }]}>{index + 1}.</Text>
              <Text style={[styles.instructionText, { color: themeColors.mode === "dark" ? "#ddd" : "#555" }]}>{instruction}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
    zIndex: 10,
    paddingTop: 50,
  },
  backButtonText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "600",
    marginLeft: 2,
  },
  header: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  metaContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
  },
  metaItem: {
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  section: {
    backgroundColor: "#ffffff",
    marginTop: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  ingredientHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addShoppingButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addShoppingButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  ingredientItem: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 6,
    alignItems: "center",
  },
  ingredientAvailable: {
    backgroundColor: "#d4edda",
    borderLeftWidth: 4,
    borderLeftColor: "#28a745",
  },
  ingredientPartial: {
    backgroundColor: "#fff3cd",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  ingredientMissing: {
    backgroundColor: "#f8d7da",
    borderLeftWidth: 4,
    borderLeftColor: "#dc3545",
  },
  ingredientShopping: {
    backgroundColor: "#dbeafe",
    borderLeftWidth: 4,
    borderLeftColor: "#60a5fa",
  },
  ingredientCompleted: {
    backgroundColor: "#dcfce7",
    borderLeftWidth: 4,
    borderLeftColor: "#4ade80",
  },
  ingredientBullet: {
    fontSize: 16,
    color: "#2e7d32",
    marginRight: 12,
    fontWeight: "600",
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    textTransform: "capitalize",
  },
  ingredientStatus: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  addIngredientButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addIngredientButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  instructionItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2e7d32",
    marginRight: 12,
    minWidth: 24,
  },
  instructionText: {
    fontSize: 14,
    color: "#555",
    flex: 1,
    lineHeight: 20,
  },
});
