/**
 * Recipe Detail Screen - Shows full recipe with ingredients and steps
 * Displays which ingredients user has in pantry and which are missing
 */

import { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, RefreshControl, Modal, Platform, Dimensions, Pressable, Share, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { CameraView, useCameraPermissions } from "expo-camera";
import { db, storage } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, doc, getDoc, addDoc, deleteDoc, writeBatch, getDocs, collection, query, orderBy, limit, serverTimestamp, setDoc, where } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { shoppingCol, pantryCol, recipesDoc, cookHistoryCol, settingsDoc, socialPostsCol, friendsCol, recipeSharesCol, friendRequestsCol, outgoingFriendRequestsCol, userDoc, publicRecipeDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
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

const STEP_INGREDIENT_STOP_WORDS = new Set([
  'and', 'with', 'for', 'into', 'over', 'from', 'then', 'until', 'about', 'plus', 'more', 'less',
  'to', 'of', 'in', 'on', 'at', 'or', 'the', 'a', 'an', 'your', 'optional',
]);

function containsPhrase(text: string, phrase: string): boolean {
  return !!phrase && text.includes(` ${phrase} `);
}

function buildIngredientAliases(name: string): string[] {
  const normalized = singularizeIngredientName(normalizeIngredientName(name));
  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .map((t) => singularizeIngredientName(t))
    .filter((t) => t.length >= 3 && !STEP_INGREDIENT_STOP_WORDS.has(t));

  const aliases: string[] = [normalized];
  if (tokens.length > 0) {
    aliases.push(tokens.join(' '));
    aliases.push(tokens[tokens.length - 1]);
  }
  if (tokens.length >= 2) {
    aliases.push(`${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`);
  }

  return [...new Set(aliases.filter(Boolean))];
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

function getStepIngredients(stepText: string, ingredients: Ingredient[]): Ingredient[] {
  const normalizedStep = ` ${normalizeIngredientName(stepText)} `;

  return ingredients.filter((ingredient) => {
    const aliases = buildIngredientAliases(ingredient.name);
    if (aliases.length === 0) return false;

    // Cross-reference step text against aliases derived from the known ingredient list.
    const phraseMatch = aliases.some((alias) => alias.length >= 4 && containsPhrase(normalizedStep, alias));
    if (phraseMatch) return true;

    // Conservative fallback for short ingredient names: require all core tokens present.
    const coreTokens = aliases[0]
      .split(' ')
      .filter((t) => t.length >= 4 && !STEP_INGREDIENT_STOP_WORDS.has(t));
    if (coreTokens.length === 0) return false;

    return coreTokens.every((token) => containsPhrase(normalizedStep, token));
  });
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
  userId?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  servings: number | string;
  cookTime: number | string;
  calories?: number | string;
  ingredients: Ingredient[];
  instructions: string[];
  difficulty: string;
  visibility?: "private" | "public";
  cuisine?: string;
  creatorName?: string;
  creatorHandle?: string;
  creatorFollowers?: number;
  creatorUserId?: string;
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: number | { seconds: number; nanoseconds: number };
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: number | { seconds: number; nanoseconds: number };
}

type FriendItem = {
  id: string;
  displayName?: string;
  handle?: string;
};

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
  const [activeCookStep, setActiveCookStep] = useState(0);
  const [showCookRecipeModal, setShowCookRecipeModal] = useState(false);
  const [stepByStepStarted, setStepByStepStarted] = useState(false);
  const [stepPhotoUris, setStepPhotoUris] = useState<Record<number, string>>({});
  const [showStepCameraModal, setShowStepCameraModal] = useState(false);
  const [stepPhotoTarget, setStepPhotoTarget] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [sendingToFriendId, setSendingToFriendId] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [cookComplete, setCookComplete] = useState(false);
  const [preferredWeightUnit, setPreferredWeightUnit] = useState<PreferredWeightUnit>("g");
  const [unitDisplayMode, setUnitDisplayMode] = useState<UnitDisplayMode>("converted");
  // Step timers: keyed by step index
  const [stepTimers, setStepTimers] = useState<Record<number, { remaining: number; running: boolean; adjusted: number }>>({});
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  // Importer profile modal
  const [showImporterProfile, setShowImporterProfile] = useState(false);
  const [loadingImporterProfile, setLoadingImporterProfile] = useState(false);
  type ImporterPublicRecipe = { id: string; name: string; imageUrl?: string; cookTime?: string | number; difficulty?: string; description?: string; sourceUrl?: string; ingredients?: { name: string; quantity?: string | number; unit?: string }[]; instructions?: string[] };
  const [importerProfile, setImporterProfile] = useState<{ userId: string; displayName: string; handle: string; allergies: string[]; dietaryRestrictions: string[]; publicRecipes: ImporterPublicRecipe[]; isFriend: boolean; hasPendingRequest: boolean } | null>(null);
  const [selectedImporterRecipeDetail, setSelectedImporterRecipeDetail] = useState<ImporterPublicRecipe | null>(null);

  const getDisplayQuantityText = (quantity: number | string, unit: string) => {
    const converted = formatQuantityForPreference(quantity, unit || "", preferredWeightUnit, unitDisplayMode);
    if (!converted.unitText) return converted.quantityText;
    return `${converted.quantityText} ${converted.unitText}`;
  };

  useEffect(() => {
    if (!recipeId) return;

    // Load from Firestore using real-time listener for instant display
    const docRef = recipesDoc(userId, recipeId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRecipe({
          id: docSnap.id,
          userId: data.userId || userId,
          name: data.name,
          description: data.description || "",
          imageUrl: data.imageUrl || data.photoUrl || "",
          servings: data.servings,
          cookTime: data.cookTime,
          calories: data.calories,
          difficulty: data.difficulty,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          creatorName: data.creatorName || data.authorName || "Insert Chef",
          creatorHandle: data.creatorHandle || data.authorHandle || "@insertchef",
          creatorFollowers: data.creatorFollowers || data.authorFollowers || 0,
          creatorUserId: data.creatorUserId || data.creatorId || data.userId || "",
          sourceUrl: data.sourceUrl || data.importSourceUrl || data.importedFromUrl || "",
          originType: data.originType || ((data.sourceUrl || data.importSourceUrl || data.importedFromUrl) ? "imported" : "created"),
          originalCreatorUserId: data.originalCreatorUserId || data.creatorUserId || data.userId || "",
          originalCreatorDisplayName: data.originalCreatorDisplayName || data.creatorName || data.authorName || "Insert Chef",
          originalCreatedAt: data.originalCreatedAt || data.createdAt || null,
          originalImporterUserId: data.originalImporterUserId || "",
          originalImporterDisplayName: data.originalImporterDisplayName || "",
          originalImportedAt: data.originalImportedAt || null,
        } as Recipe);
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
    const unsubscribe = onSnapshot(friendsCol(userId), (snapshot) => {
      const mapped = snapshot.docs.map((d) => ({
        id: d.id,
        displayName: (d.data().displayName || d.data().friendDisplayName || "") as string,
        handle: (d.data().handle || d.data().friendHandle || "") as string,
      }));
      setFriends(mapped);
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
      setStepByStepStarted(false);
      setCookComplete(false);
      setActiveCookStep(0);
      setShowCookRecipeModal(false);
      setStepPhotoUris({});
      setShowStepCameraModal(false);
      setStepPhotoTarget(null);
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
  const safeActiveCookStep = recipe
    ? Math.min(Math.max(activeCookStep, 0), Math.max(recipe.instructions.length - 1, 0))
    : 0;

  const firstIncompleteStep = recipe
    ? (() => {
        const idx = stepChecked.findIndex(done => !done);
        return idx === -1 ? Math.max(recipe.instructions.length - 1, 0) : idx;
      })()
    : 0;

  const toggleCookStep = (index: number) => {
    setStepChecked(prev => {
      const next = [...prev];
      const wasChecked = !!next[index];
      next[index] = !wasChecked;
      if (!wasChecked && recipe && index < recipe.instructions.length - 1) {
        setActiveCookStep(index + 1);
      }
      return next;
    });
  };

  const openStepPhotoCamera = async (stepIndex: number) => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert("Camera permission required", "Allow camera access to capture step photos.");
        return;
      }
    }

    setStepPhotoTarget(stepIndex);
    setShowStepCameraModal(true);
  };

  const captureStepPhoto = async () => {
    if (stepPhotoTarget == null) return;
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.72 });
      if (!photo?.uri) return;
      setStepPhotoUris(prev => ({ ...prev, [stepPhotoTarget]: photo.uri }));
      setShowStepCameraModal(false);
      setStepPhotoTarget(null);
    } catch {
      Alert.alert("Capture failed", "Could not capture step photo. Please try again.");
    }
  };

  const uploadCookStepPhoto = async (uri: string): Promise<string> => {
    if (!userId) throw new Error("User not signed in");
    const response = await fetch(uri);
    const blob = await response.blob();
    const path = `social/${userId}/cook-steps/${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
    return getDownloadURL(fileRef);
  };

  const publishCookResult = async (cookedAtOverride?: number, sourceCookHistoryId?: string) => {
    if (!recipe || !userId) return;

    const entries = Object.entries(stepPhotoUris)
      .map(([stepIndex, uri]) => ({ stepIndex: Number(stepIndex), uri }))
      .filter(item => !!item.uri)
      .sort((a, b) => a.stepIndex - b.stepIndex);

    if (entries.length === 0) {
      Alert.alert("Add photos", "Capture at least one step photo before posting.");
      return;
    }

    Alert.alert(
      "Share cook to Social?",
      `Post your ${recipe.name} cook and photos to Social?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            try {
              const uploaded = await Promise.all(entries.map(async (item) => ({
                stepIndex: item.stepIndex,
                url: await uploadCookStepPhoto(item.uri),
              })));

              const email = auth.currentUser?.email || "";
              const displayName = auth.currentUser?.displayName || email.split("@")[0] || "Insert Cook";
              const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertcook";

              await addDoc(socialPostsCol(), {
                userId,
                recipeOwnerId: userId,
                userDisplayName: displayName,
                userHandle: `@${handleRoot}`,
                recipeId: recipe.id,
                recipeName: recipe.name,
                recipeImageUrl: recipe.imageUrl || "",
                note: `Cooked ${recipe.name} with step-by-step photos.`,
                ingredients: recipe.ingredients.map((i) => i.name),
                recipeIngredientsDetailed: recipe.ingredients.map((i) => ({
                  name: i.name,
                  quantity: String(i.quantity ?? ""),
                  unit: i.unit || "",
                })),
                recipeInstructions: recipe.instructions || [],
                sourceUrl: recipe.sourceUrl || "",
                originType: recipe.originType || (recipe.sourceUrl ? "imported" : "created"),
                originalCreatorUserId: recipe.originalCreatorUserId || recipe.userId || userId,
                originalCreatorDisplayName: recipe.originalCreatorDisplayName || recipe.creatorName || displayName,
                originalCreatedAt: recipe.originalCreatedAt || Date.now(),
                originalImporterUserId: recipe.sourceUrl ? (recipe.originalImporterUserId || recipe.userId || userId) : "",
                originalImporterDisplayName: recipe.sourceUrl ? (recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || recipe.creatorName || displayName) : "",
                originalImportedAt: recipe.sourceUrl ? (recipe.originalImportedAt || Date.now()) : null,
                cookedAt: cookedAtOverride || Date.now(),
                stepPhotos: uploaded,
                likes: [],
                createdAt: serverTimestamp(),
                sharedAt: serverTimestamp(),
                sourceCookHistoryId: sourceCookHistoryId || null,
              });

              Alert.alert("Posted", "Your cook result was posted to Social.");
              setStepPhotoUris({});
            } catch (err) {
              console.error("Failed to publish cook result:", err);
              Alert.alert("Post failed", "Could not post your result right now.");
            }
          },
        },
      ]
    );
  };

  const finishCooking = async () => {
    if (!recipe || !userId) return;
    try {
      const cookedAt = Date.now();
      // 1. Log to cook history
      const cookHistoryRef = await addDoc(cookHistoryCol(userId), {
        recipeId: recipe.id,
        recipeName: recipe.name,
        cookedAt,
        ingredients: recipe.ingredients.map(i => ({
          name: i.name,
          quantity: String(i.quantity),
          unit: i.unit,
        })),
        recipeIngredientsDetailed: recipe.ingredients.map((i) => ({
          name: i.name,
          quantity: String(i.quantity ?? ""),
          unit: i.unit || "",
        })),
        recipeInstructions: recipe.instructions || [],
        recipeImageUrl: recipe.imageUrl || "",
        stepPhotos: Object.entries(stepPhotoUris)
          .map(([stepIndex, uri]) => ({ stepIndex: Number(stepIndex), url: uri }))
          .sort((a, b) => a.stepIndex - b.stepIndex),
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
      if (Object.keys(stepPhotoUris).length > 0) {
        Alert.alert(
          "Great job!",
          `"${recipe.name}" was logged. Want to post your step photos to Social?`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Post to Social", onPress: () => publishCookResult(cookedAt, cookHistoryRef.id) },
          ]
        );
      } else {
        Alert.alert("Great job!", `"${recipe.name}" has been logged to your cook history and pantry has been updated.`);
      }
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

  const shareRecipeToSocial = async () => {
    if (!recipe || !userId) return;
    Alert.alert(
      "Share to Social?",
      `Post "${recipe.name}" to Social now? This will be visible to other users.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: async () => {
            try {
              const email = auth.currentUser?.email || "";
              const displayName = auth.currentUser?.displayName || email.split("@")[0] || "Insert Cook";
              const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertcook";

              await addDoc(socialPostsCol(), {
                userId,
                recipeOwnerId: recipe.userId || userId,
                userDisplayName: displayName,
                userHandle: `@${handleRoot}`,
                recipeId: recipe.id,
                recipeName: recipe.name,
                recipeImageUrl: recipe.imageUrl || "",
                note: `Shared a recipe: ${recipe.name}`,
                ingredients: recipe.ingredients.map((i) => i.name),
                recipeIngredientsDetailed: recipe.ingredients.map((i) => ({
                  name: i.name,
                  quantity: String(i.quantity ?? ""),
                  unit: i.unit || "",
                })),
                recipeInstructions: recipe.instructions || [],
                sourceUrl: recipe.sourceUrl || "",
                originType: recipe.originType || (recipe.sourceUrl ? "imported" : "created"),
                originalCreatorUserId: recipe.originalCreatorUserId || recipe.userId || userId,
                originalCreatorDisplayName: recipe.originalCreatorDisplayName || recipe.creatorName || displayName,
                originalCreatedAt: recipe.originalCreatedAt || Date.now(),
                originalImporterUserId: recipe.sourceUrl ? (recipe.originalImporterUserId || recipe.userId || userId) : "",
                originalImporterDisplayName: recipe.sourceUrl ? (recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || recipe.creatorName || displayName) : "",
                originalImportedAt: recipe.sourceUrl ? (recipe.originalImportedAt || Date.now()) : null,
                stepPhotos: [],
                likes: [],
                createdAt: serverTimestamp(),
                sharedAt: serverTimestamp(),
              });

              Alert.alert("Shared to Social", "Your recipe is now visible on Social.");
            } catch (err) {
              console.error("Share to social failed:", err);
              Alert.alert("Share failed", "Could not share to Social right now.");
            }
          },
        },
      ]
    );
  };

  const shareRecipeByText = async () => {
    if (!recipe) return;
    const ownerId = recipe.userId || userId;
    const appLink = `insert://recipe/${recipe.id}?owner=${ownerId}`;
    const fallbackLink = `https://insert.app/recipe/${ownerId}/${recipe.id}`;
    const message = `Check out this recipe on Insert: ${recipe.name}\n${appLink}\n${fallbackLink}`;
    try {
      await Share.share({ message, title: recipe.name });
    } catch (err) {
      console.error("Text share failed:", err);
      Alert.alert("Share failed", "Could not open the share sheet right now.");
    }
  };

  const recipeContainsAllergy = (allergies: string[] = []) => {
    const combined = recipe?.ingredients.map((ingredient) => ingredient.name.toLowerCase()).join(" ") || "";
    return allergies.filter((allergen) => combined.includes(allergen.toLowerCase()));
  };

  const DIETARY_CONFLICT_KEYWORDS: Record<string, string[]> = {
    vegan: ["beef", "pork", "chicken", "fish", "salmon", "tuna", "shrimp", "egg", "milk", "cheese", "butter", "yogurt", "honey", "gelatin"],
    vegetarian: ["beef", "pork", "chicken", "fish", "salmon", "tuna", "shrimp", "anchovy", "gelatin", "bacon", "sausage", "ham"],
    pescatarian: ["beef", "pork", "chicken", "turkey", "lamb", "bacon", "sausage", "ham", "gelatin"],
    "gluten-free": ["wheat", "barley", "rye", "flour", "bread", "pasta", "noodle", "soy sauce", "breadcrumbs", "cracker"],
    "dairy-free": ["milk", "cheese", "butter", "cream", "yogurt", "ghee", "whey"],
    keto: ["sugar", "honey", "syrup", "bread", "pasta", "rice", "potato", "flour", "corn", "beans"],
    "low-carb": ["sugar", "honey", "syrup", "bread", "pasta", "rice", "potato", "flour", "corn"],
    halal: ["pork", "ham", "bacon", "lard", "gelatin", "wine", "beer", "rum", "vodka"],
    kosher: ["pork", "shellfish", "shrimp", "crab", "lobster"],
  };

  const recipeConflictsDietaryRestrictions = (dietaryRestrictions: string[] = []) => {
    const combined = recipe?.ingredients.map((ingredient) => ingredient.name.toLowerCase()).join(" ") || "";
    return dietaryRestrictions.filter((restriction) => {
      const key = restriction.toLowerCase().trim();
      const conflictKeywords = DIETARY_CONFLICT_KEYWORDS[key];
      if (conflictKeywords?.length) {
        return conflictKeywords.some((keyword) => combined.includes(keyword));
      }
      return combined.includes(key);
    });
  };

  const sendRecipeToFriend = async (friend: FriendItem) => {
    if (!recipe || !userId || !friend?.id) return;
    setSendingToFriendId(friend.id);
    try {
      const friendProfileSnap = await getDoc(userDoc(friend.id));
      const friendAllergies = Array.isArray(friendProfileSnap.data()?.allergies)
        ? friendProfileSnap.data()?.allergies.filter((value: unknown): value is string => typeof value === "string")
        : [];
      const friendDietaryRestrictions = Array.isArray(friendProfileSnap.data()?.dietaryRestrictions)
        ? friendProfileSnap.data()?.dietaryRestrictions.filter((value: unknown): value is string => typeof value === "string")
        : [];
      const matchedAllergies = recipeContainsAllergy(friendAllergies);
      const dietaryConflicts = recipeConflictsDietaryRestrictions(friendDietaryRestrictions);
      if (matchedAllergies.length > 0 || dietaryConflicts.length > 0) {
        const warningParts: string[] = [];
        if (matchedAllergies.length > 0) {
          warningParts.push(`${friend.displayName || "Your friend"} has allergies listed that match this recipe: ${matchedAllergies.join(", ")}.`);
        }
        if (dietaryConflicts.length > 0) {
          warningParts.push(`${friend.displayName || "Your friend"} has dietary restrictions that may conflict: ${dietaryConflicts.join(", ")}.`);
        }
        const continueShare = await new Promise<boolean>((resolve) => {
          Alert.alert(
            matchedAllergies.length > 0 ? "Allergy / dietary warning" : "Dietary warning",
            `${warningParts.join("\n\n")}\n\nThis check is based on ingredient-name text and may not be 100% exact. Share anyway?`,
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Share Anyway", style: "destructive", onPress: () => resolve(true) },
            ]
          );
        });
        if (!continueShare) return;
      }

      const email = auth.currentUser?.email || "";
      const displayName = auth.currentUser?.displayName || email.split("@")[0] || "Insert User";
      await addDoc(recipeSharesCol(friend.id), {
        fromUserId: userId,
        fromDisplayName: displayName,
        toUserId: friend.id,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeOwnerId: recipe.userId || userId,
        recipeImageUrl: recipe.imageUrl || "",
        recipeDescription: recipe.description || "",
        recipeServings: recipe.servings || "",
        recipeCookTime: recipe.cookTime || "",
        recipeDifficulty: recipe.difficulty || "easy",
        recipeIngredientsDetailed: recipe.ingredients.map((ingredient) => ({
          name: ingredient.name,
          quantity: String(ingredient.quantity ?? ""),
          unit: ingredient.unit || "",
        })),
        recipeInstructions: recipe.instructions || [],
        sourceUrl: recipe.sourceUrl || "",
        originType: recipe.originType || (recipe.sourceUrl ? "imported" : "created"),
        originalCreatorUserId: recipe.originalCreatorUserId || recipe.userId || userId,
        originalCreatorDisplayName: recipe.originalCreatorDisplayName || recipe.creatorName || displayName,
        originalCreatedAt: recipe.originalCreatedAt || Date.now(),
        originalImporterUserId: recipe.sourceUrl ? (recipe.originalImporterUserId || recipe.userId || userId) : "",
        originalImporterDisplayName: recipe.sourceUrl ? (recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || recipe.creatorName || displayName) : "",
        originalImportedAt: recipe.sourceUrl ? (recipe.originalImportedAt || Date.now()) : null,
        status: "pending",
        message: `${displayName} shared ${recipe.name} with you.`,
        createdAt: serverTimestamp(),
      });
      Alert.alert("Sent", `Recipe sent to ${friend.displayName || "your friend"}.`);
      setShowShareModal(false);
    } catch (err) {
      console.error("Send to friend failed:", err);
      Alert.alert("Send failed", "Could not send recipe to friend right now.");
    } finally {
      setSendingToFriendId(null);
    }
  };

  const openImporterProfile = async () => {
    if (!recipe) return;
    const importerUserId = recipe.originalImporterUserId || recipe.originalCreatorUserId || recipe.creatorUserId || "";
    if (!importerUserId) {
      Alert.alert("Profile unavailable", "No importer profile is linked to this recipe.");
      return;
    }
    setShowImporterProfile(true);
    setLoadingImporterProfile(true);
    try {
      const profileSnap = await getDoc(doc(db, "users", importerUserId));
      const profileData = profileSnap.data() as { displayName?: string; email?: string; allergies?: unknown[]; dietaryRestrictions?: unknown[] } | undefined;
      const displayName = profileData?.displayName || profileData?.email?.split("@")[0] || recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || "Insert User";
      const handle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`;
      const allergies = Array.isArray(profileData?.allergies)
        ? (profileData!.allergies as unknown[]).filter((v): v is string => typeof v === "string")
        : [];
      const dietaryRestrictions = Array.isArray(profileData?.dietaryRestrictions)
        ? (profileData!.dietaryRestrictions as unknown[]).filter((v): v is string => typeof v === "string")
        : [];

      const publicRecipesSnap = await getDocs(query(collection(db, "publicRecipes"), where("ownerId", "==", importerUserId), limit(12)));
      const publicRecipes: ImporterPublicRecipe[] = publicRecipesSnap.docs.map((d) => {
        const rd = d.data() as { name?: string; imageUrl?: string; cookTime?: string | number; difficulty?: string; description?: string; sourceUrl?: string; ingredients?: { name: string; quantity?: string | number; unit?: string }[]; instructions?: string[] };
        return {
          id: d.id,
          name: rd.name || "Recipe",
          imageUrl: rd.imageUrl || "",
          cookTime: rd.cookTime,
          difficulty: rd.difficulty,
          description: rd.description || "",
          sourceUrl: rd.sourceUrl || "",
          ingredients: Array.isArray(rd.ingredients) ? rd.ingredients : [],
          instructions: Array.isArray(rd.instructions) ? rd.instructions : [],
        };
      });

      const isFriend = friends.some((f) => f.id === importerUserId);
      // check outgoing requests
      let hasPendingRequest = false;
      try {
        const outSnap = await getDoc(doc(outgoingFriendRequestsCol(userId), importerUserId));
        hasPendingRequest = outSnap.exists();
      } catch { /* ignore */ }

      setImporterProfile({ userId: importerUserId, displayName, handle, allergies, dietaryRestrictions, publicRecipes, isFriend, hasPendingRequest });
    } catch (error) {
      console.error("Importer profile load failed:", error);
      Alert.alert("Profile unavailable", "Could not load this profile right now.");
      setShowImporterProfile(false);
    } finally {
      setLoadingImporterProfile(false);
    }
  };

  const sendFriendRequestToImporter = async () => {
    if (!importerProfile || !userId) return;
    const targetId = importerProfile.userId;
    if (targetId === userId) { Alert.alert("This is you", "You cannot add yourself as a friend."); return; }
    if (importerProfile.isFriend) { Alert.alert("Already friends", `You are already connected with ${importerProfile.displayName}.`); return; }
    if (importerProfile.hasPendingRequest) { Alert.alert("Request pending", "You already sent a friend request."); return; }
    const displayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert User";
    const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser";
    try {
      await setDoc(doc(friendRequestsCol(targetId), userId), { fromUserId: userId, fromDisplayName: displayName, fromHandle: `@${handleRoot}`, status: "pending", createdAt: serverTimestamp() });
      await setDoc(doc(outgoingFriendRequestsCol(userId), targetId), { toUserId: targetId, toDisplayName: importerProfile.displayName, status: "pending", createdAt: serverTimestamp() });
      setImporterProfile((prev) => prev ? { ...prev, hasPendingRequest: true } : prev);
      Alert.alert("Friend request sent", `Request sent to ${importerProfile.displayName}.`);
    } catch (error) {
      console.error("Friend request failed:", error);
      Alert.alert("Request failed", "Could not send friend request right now.");
    }
  };

  const openImporterPublicRecipeDetail = async (publicRecipe: ImporterPublicRecipe) => {
    // Close the profile modal first — Android cannot stack two sibling Modals simultaneously.
    setShowImporterProfile(false);

    const applyRecipe = (resolved: ImporterPublicRecipe) => {
      setTimeout(() => setSelectedImporterRecipeDetail(resolved), 120);
    };

    try {
      const latestSnap = await getDoc(doc(db, "publicRecipes", publicRecipe.id));
      if (latestSnap.exists()) {
        const ld = latestSnap.data() as { name?: string; imageUrl?: string; cookTime?: string | number; difficulty?: string; description?: string; sourceUrl?: string; ingredients?: { name: string; quantity?: string | number; unit?: string }[]; instructions?: string[] };
        applyRecipe({
          id: publicRecipe.id,
          name: ld.name || publicRecipe.name,
          imageUrl: ld.imageUrl || publicRecipe.imageUrl || "",
          cookTime: ld.cookTime ?? publicRecipe.cookTime,
          difficulty: ld.difficulty || publicRecipe.difficulty,
          description: ld.description || publicRecipe.description || "",
          sourceUrl: ld.sourceUrl || publicRecipe.sourceUrl || "",
          ingredients: Array.isArray(ld.ingredients) ? ld.ingredients : (publicRecipe.ingredients || []),
          instructions: Array.isArray(ld.instructions) ? ld.instructions : (publicRecipe.instructions || []),
        });
        return;
      }
    } catch { /* fallback below */ }
    applyRecipe(publicRecipe);
  };

  const handleAddCreatorAsFriend = async () => {
    if (!recipe || !userId) return;
    const creatorUid = recipe.creatorUserId;
    if (!creatorUid) {
      Alert.alert("Add Friend", "Creator profile is unavailable for this recipe.");
      return;
    }
    if (creatorUid === userId) {
      Alert.alert("Add Friend", "This is your recipe.");
      return;
    }

    try {
      const email = auth.currentUser?.email || "";
      const displayName = auth.currentUser?.displayName || email.split("@")[0] || "Insert User";
      const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser";

      await setDoc(doc(friendRequestsCol(creatorUid), userId), {
        fromUserId: userId,
        fromDisplayName: displayName,
        fromHandle: `@${handleRoot}`,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(outgoingFriendRequestsCol(userId), creatorUid), {
        toUserId: creatorUid,
        toDisplayName: recipe.creatorName || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Friend request sent", `Sent request to ${recipe.creatorName || "creator"}.`);
    } catch (err) {
      console.error("Creator friend request failed:", err);
      Alert.alert("Request failed", "Could not send friend request right now.");
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
  const primaryColor = '#FF8A3D';
  const accentSoft = '#FFE8D9';
  const backgroundTone = isDark ? '#161616' : '#F8F8F8';
  const cardTone = isDark ? '#222222' : '#FFFFFF';
  const sourceHost = recipe.sourceUrl
    ? (() => {
        try {
          return new URL(recipe.sourceUrl).hostname.replace(/^www\./, "");
        } catch {
          return recipe.sourceUrl;
        }
      })()
    : "";

  const showStepIngredientAccuracyInfo = () => {
    Alert.alert(
      "Ingredient matching note",
      "Step ingredient chips are generated by cross-referencing each step against your ingredient list. This assumes ingredient names are accurate, and it may still miss or over-include some ingredients."
    );
  };
  const heroHeight = 280;
  const titleFont = Platform.select({ ios: 'AvenirNext-Bold', android: 'sans-serif-medium', default: 'System' });
  const bodyFont = Platform.select({ ios: 'AvenirNext-Regular', android: 'sans-serif', default: 'System' });

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
                await deleteDoc(publicRecipeDoc(recipeId)).catch(() => undefined);
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
            imageUrl: recipe.imageUrl || "",
            servings: String(recipe.servings || ""),
            cookTime: String(recipe.cookTime || ""),
            difficulty: recipe.difficulty || "easy",
            visibility: recipe.visibility || "private",
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

            {/* Tabs (hidden only after step-by-step cooking starts) */}
            {!stepByStepStarted && (
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
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Content */}
          {cookTab === 'ingredients' ? (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
              <Text style={{ fontSize: 13, color: mutedText, marginBottom: 16, lineHeight: 20 }}>
                Prep ingredients before starting. Tap each one when ready.
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
                            flexDirection: 'row', alignItems: 'center', gap: 12,
                            backgroundColor: checked
                              ? (isDark ? '#18261f' : '#f1f8f3')
                              : (isDark ? '#202020' : '#ffffff'),
                            borderRadius: 12,
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            marginBottom: 8,
                            borderWidth: 1,
                            borderColor: checked ? themeColors.accentColor : (isDark ? '#333' : '#ececec'),
                            borderLeftWidth: 2.5,
                            borderLeftColor: checked ? themeColors.accentColor : group.color,
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{
                            width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
                            borderColor: checked ? themeColors.accentColor : group.color,
                            backgroundColor: checked ? themeColors.accentColor : 'transparent',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{
                              fontSize: 15, fontWeight: '600', color: themeColors.textColor,
                              textDecorationLine: checked ? 'line-through' : 'none',
                              opacity: checked ? 0.65 : 1,
                            }}>
                              {ing.name}
                            </Text>
                            {(ing.quantity || ing.unit) ? (
                              <Text style={{ fontSize: 12, color: mutedText, marginTop: 2 }}>
                                {getDisplayQuantityText(ing.quantity, ing.unit || "")}
                              </Text>
                            ) : null}
                          </View>
                          {checked && <Ionicons name="checkmark-circle" size={18} color={themeColors.accentColor} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
              {!stepByStepStarted ? (
                <>
                  <Text style={{ fontSize: 13, color: mutedText, marginBottom: 12 }}>
                    Recipe steps
                  </Text>

                  <Text style={{ fontSize: 13, color: mutedText, marginBottom: 14, lineHeight: 20 }}>
                    Review all steps first. Step-by-step mode starts only after you tap Start Cooking.
                  </Text>

                  {recipe.instructions.map((instruction, index) => {
                    const stepIngredients = getStepIngredients(instruction, recipe.ingredients);
                    return (
                      <View
                        key={`cook-preview-step-${index}`}
                        style={{
                          backgroundColor: isDark ? '#252525' : '#fafafa',
                          borderRadius: 14,
                          padding: 14,
                          borderWidth: 1,
                          borderColor: mutedBorder,
                          marginBottom: 10,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: themeColors.accentColor, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{index + 1}</Text>
                          </View>
                          <Text style={{ flex: 1, color: themeColors.textColor, lineHeight: 22 }}>{instruction}</Text>
                        </View>

                        {stepIngredients.length > 0 && (
                          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: mutedBorder }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                              <Text style={{ color: mutedText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                Ingredients used
                              </Text>
                              <TouchableOpacity onPress={showStepIngredientAccuracyInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="information-circle-outline" size={14} color={mutedText} />
                              </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                              {stepIngredients.map((ingredient, chipIndex) => (
                                <View key={`step-ing-${index}-${chipIndex}`} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: isDark ? '#333' : '#fff1e8', borderWidth: 1, borderColor: isDark ? '#474747' : '#ffd5be' }}>
                                  <Text style={{ color: themeColors.textColor, fontSize: 12, fontWeight: '600' }}>{ingredient.name}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, color: mutedText }}>
                      Step {safeActiveCookStep + 1} of {recipe.instructions.length}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowCookRecipeModal(true)}
                      style={{ borderWidth: 1, borderColor: mutedBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: isDark ? '#2b2b2b' : '#fff' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: themeColors.textColor }}>View Full Recipe</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 13, color: mutedText, marginBottom: 14, lineHeight: 20 }}>
                    Focus on one step at a time. Mark done to move forward.
                  </Text>

                  {recipe.instructions.length > 0 && (() => {
                    const i = safeActiveCookStep;
                    const inst = recipe.instructions[i];
                      const stepIngredients = getStepIngredients(inst, recipe.ingredients);
                    const checked = stepChecked[i] ?? false;
                    const isNext = !checked && stepChecked.slice(0, i).every(Boolean);
                    const timer = stepTimers[i];
                    const timeParsed = parseStepTime(inst);
                    const stepPhotoUri = stepPhotoUris[i];

                    return (
                      <>
                        <TouchableOpacity
                          onPress={() => toggleCookStep(i)}
                          style={{
                            flexDirection: 'row', alignItems: 'flex-start', gap: 14,
                            backgroundColor: checked
                              ? (isDark ? '#1a2e1a' : '#eafaf0')
                              : isNext
                                ? (isDark ? '#2a2a00' : '#fffbea')
                                : (isDark ? '#252525' : '#fafafa'),
                            borderRadius: 16,
                            borderBottomLeftRadius: timer ? 0 : 16,
                            borderBottomRightRadius: timer ? 0 : 16,
                            padding: 16,
                            borderWidth: 1.5,
                            borderColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : mutedBorder,
                            borderBottomWidth: timer ? 0 : 1.5,
                            marginBottom: timer ? 0 : 12,
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={{
                            width: 34, height: 34, borderRadius: 17,
                            backgroundColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : (isDark ? '#333' : '#eee'),
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                          }}>
                            {checked
                              ? <Ionicons name="checkmark" size={18} color="#fff" />
                              : <Text style={{ fontSize: 13, fontWeight: '800', color: isNext ? '#fff' : mutedText }}>{i + 1}</Text>}
                          </View>
                          <Text style={{
                            flex: 1, fontSize: 18, color: themeColors.textColor, lineHeight: 27,
                            textDecorationLine: checked ? 'line-through' : 'none',
                            opacity: checked ? 0.48 : 1,
                          }}>
                            {inst}
                          </Text>
                        </TouchableOpacity>

                        {stepIngredients.length > 0 && (
                          <View style={{ marginTop: -4, marginBottom: 12, paddingHorizontal: 2 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                              <Text style={{ color: mutedText, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                Ingredients for this step
                              </Text>
                              <TouchableOpacity onPress={showStepIngredientAccuracyInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="information-circle-outline" size={14} color={mutedText} />
                              </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                              {stepIngredients.map((ingredient, chipIndex) => (
                                <View key={`active-step-ing-${i}-${chipIndex}`} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: isDark ? '#2f2f2f' : '#fff1e8', borderWidth: 1, borderColor: isDark ? '#474747' : '#ffd5be' }}>
                                  <Text style={{ color: themeColors.textColor, fontSize: 12, fontWeight: '600' }}>{ingredient.name}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        <View style={{ marginBottom: 12 }}>
                          <TouchableOpacity
                            onPress={() => openStepPhotoCamera(i)}
                            style={{
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: themeColors.accentColor,
                              backgroundColor: isDark ? '#232323' : '#fff6ee',
                              paddingVertical: 10,
                              paddingHorizontal: 12,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                            }}
                          >
                            <Ionicons name="camera-outline" size={16} color={themeColors.accentColor} />
                            <Text style={{ color: themeColors.accentColor, fontWeight: '700' }}>
                              {stepPhotoUri ? 'Retake Step Photo' : 'Add Step Photo'}
                            </Text>
                          </TouchableOpacity>

                          {stepPhotoUri ? (
                            <View style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden' }}>
                              <Image source={{ uri: stepPhotoUri }} contentFit="cover" transition={180} style={{ width: '100%', height: 140 }} />
                            </View>
                          ) : null}
                        </View>

                        {timer && timeParsed && (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: isDark ? '#1a1a1a' : '#f3f3f3',
                            borderRadius: 16, borderTopLeftRadius: 0, borderTopRightRadius: 0,
                            paddingHorizontal: 14, paddingVertical: 10,
                            borderWidth: 1.5, borderTopWidth: 0,
                            borderColor: checked ? themeColors.accentColor : isNext ? '#FFC107' : mutedBorder,
                            marginBottom: 12,
                          }}>
                            <View style={{
                              backgroundColor: timer.running
                                ? themeColors.accentColor
                                : timer.remaining === 0
                                  ? '#ef4444'
                                  : (isDark ? '#333' : '#e8e8e8'),
                              borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, minWidth: 78, alignItems: 'center',
                            }}>
                              <Text style={{ fontSize: 17, fontWeight: '800', color: timer.running || timer.remaining === 0 ? '#fff' : themeColors.textColor, fontVariant: ['tabular-nums'] }}>
                                {fmtTime(timer.remaining)}
                              </Text>
                            </View>

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

                            <TouchableOpacity
                              onPress={() => setStepTimers(prev => {
                                const t = prev[i];
                                if (!t) return prev;
                                if (t.remaining === 0) {
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
                          </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                          <TouchableOpacity
                            onPress={() => setActiveCookStep(Math.max(0, i - 1))}
                            disabled={i === 0}
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: 'center',
                              backgroundColor: i === 0 ? (isDark ? '#2d2d2d' : '#ececec') : (isDark ? '#343434' : '#f1f1f1'),
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: i === 0 ? mutedText : themeColors.textColor }}>Previous</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setActiveCookStep(Math.min(recipe.instructions.length - 1, i + 1))}
                            disabled={i >= recipe.instructions.length - 1}
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              paddingVertical: 12,
                              alignItems: 'center',
                              backgroundColor: i >= recipe.instructions.length - 1
                                ? (isDark ? '#2d2d2d' : '#ececec')
                                : themeColors.accentColor,
                            }}
                          >
                            <Text style={{ fontWeight: '700', color: i >= recipe.instructions.length - 1 ? mutedText : '#fff' }}>
                              Next Step
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          onPress={() => setActiveCookStep(firstIncompleteStep)}
                          style={{ alignSelf: 'center', marginTop: 4, paddingHorizontal: 10, paddingVertical: 6 }}
                        >
                          <Text style={{ color: themeColors.accentColor, fontSize: 12.5, fontWeight: '700' }}>Jump to Next Incomplete</Text>
                        </TouchableOpacity>
                      </>
                    );
                  })()}
                </>
              )}
            </ScrollView>
          )}

          {/* Finish Cooking button */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: surfaceBg, borderTopWidth: 1, borderTopColor: mutedBorder,
            padding: 16, paddingBottom: Platform.OS === 'ios' ? 36 : 16,
          }}>
            {cookTab === 'steps' ? (
              <View>
                {!stepByStepStarted ? (
                  <TouchableOpacity
                    onPress={() => {
                      setStepByStepStarted(true);
                      setActiveCookStep(firstIncompleteStep);
                    }}
                    style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Start Cooking →</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={handleFinishPress}
                      style={{ backgroundColor: allStepsDone ? themeColors.accentColor : (isDark ? '#333' : '#d0d0d0'), borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                    >
                      <Text style={{ color: allStepsDone ? '#fff' : mutedText, fontWeight: '700', fontSize: 16 }}>
                        {allStepsDone ? 'Done — Log & Update Pantry' : `${stepChecked.filter(Boolean).length}/${recipe.instructions.length} steps complete`}
                      </Text>
                    </TouchableOpacity>

                    {Object.keys(stepPhotoUris).length > 0 ? (
                      <TouchableOpacity
                        onPress={() => publishCookResult()}
                        style={{ marginTop: 8, borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: themeColors.accentColor, backgroundColor: isDark ? '#252525' : '#fff6ee' }}
                      >
                        <Text style={{ color: themeColors.accentColor, fontWeight: '700' }}>Post {Object.keys(stepPhotoUris).length} step photos to Social</Text>
                      </TouchableOpacity>
                    ) : null}
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setCookTab('steps')}
                style={{ backgroundColor: themeColors.accentColor, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Review Steps →</Text>
              </TouchableOpacity>
            )}
          </View>

          {showCookRecipeModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}>
              <TouchableOpacity
                onPress={() => setShowCookRecipeModal(false)}
                activeOpacity={1}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
              />

              <View style={{
                marginTop: Platform.OS === 'ios' ? 46 : 30,
                marginHorizontal: 12,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: themeColors.backgroundColor,
                borderWidth: 1,
                borderColor: mutedBorder,
                maxHeight: '82%',
              }}>
                <View style={{
                  backgroundColor: surfaceBg, borderBottomWidth: 1, borderBottomColor: mutedBorder,
                  paddingVertical: 12, paddingHorizontal: 14,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
                }}>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: themeColors.textColor }}>Full Recipe</Text>
                  <TouchableOpacity onPress={() => setShowCookRecipeModal(false)} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: isDark ? '#333' : '#efefef' }}>
                    <Text style={{ color: themeColors.textColor, fontWeight: '700' }}>Close</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 22 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: mutedText, marginBottom: 8 }}>Ingredients</Text>
                  {recipe.ingredients.map((ing, idx) => (
                    <Text key={`full-ing-${idx}`} style={{ color: themeColors.textColor, fontSize: 15, lineHeight: 23, marginBottom: 4 }}>
                      • {getDisplayQuantityText(ing.quantity, ing.unit || "")} {ing.name}
                    </Text>
                  ))}

                  <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase', color: mutedText, marginTop: 16, marginBottom: 8 }}>Steps</Text>
                  {recipe.instructions.map((inst, idx) => (
                    <TouchableOpacity
                      key={`full-step-${idx}`}
                      onPress={() => {
                        setActiveCookStep(idx);
                        setShowCookRecipeModal(false);
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: idx === safeActiveCookStep ? themeColors.accentColor : mutedBorder,
                        backgroundColor: idx === safeActiveCookStep
                          ? (isDark ? '#233022' : '#eef9ef')
                          : (isDark ? '#242424' : '#fff'),
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: idx === safeActiveCookStep ? themeColors.accentColor : mutedText, marginBottom: 4 }}>
                        Step {idx + 1}
                      </Text>
                      <Text style={{ color: themeColors.textColor, lineHeight: 21 }}>{inst}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {showStepCameraModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: '#000' }}>
              <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
              <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 56 : 28, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Step {(stepPhotoTarget ?? safeActiveCookStep) + 1}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowStepCameraModal(false);
                    setStepPhotoTarget(null);
                  }}
                  style={{ backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <View style={{ position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 24, left: 0, right: 0, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={captureStepPhoto}
                  style={{ width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', backgroundColor: themeColors.accentColor }}
                />
              </View>
            </View>
          )}
        </View>
      </Modal>
      {/* ── end Cook Mode Modal ─────────────────────────────────────────────── */}
      <View style={styles.heroBackground}>
        {recipe.imageUrl ? (
          <Image
            source={{ uri: recipe.imageUrl }}
            contentFit="cover"
            transition={300}
            style={[styles.heroImage, { height: heroHeight + (Platform.OS === 'ios' ? 64 : 52) }]}
          />
        ) : (
          <View style={[styles.heroImage, styles.heroFallback, { height: heroHeight + (Platform.OS === 'ios' ? 64 : 52) }]}>
            <Ionicons name="restaurant-outline" size={42} color={primaryColor} />
          </View>
        )}
        <View style={styles.heroGradient} />
      </View>

      <View style={styles.topActionBar}> 
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backChip, pressed && styles.pressedScale]}
          >
            <Ionicons name="chevron-back" size={18} color={primaryColor} />
            <Text style={[styles.backButtonText, { color: primaryColor }]}>Back</Text>
          </Pressable>
        ) : <View />}
        <View style={styles.topRightActions}>
          <Pressable
            onPress={() => setShowShareModal(true)}
            style={({ pressed }) => [styles.shareChip, pressed && styles.pressedScale]}
          >
            <Ionicons name="share-social-outline" size={16} color={primaryColor} />
            <Text style={[styles.shareChipText, { color: primaryColor }]}>Share</Text>
          </Pressable>
          <Pressable
            onLongPress={handleDeleteRecipe}
            delayLongPress={500}
            onPress={startCooking}
            style={({ pressed }) => [styles.cookChip, { backgroundColor: primaryColor }, pressed && styles.pressedScale]}
          >
            <Ionicons name="flame-outline" size={16} color="#fff" />
            <Text style={styles.cookChipText}>Cook</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.foregroundScroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={primaryColor}
            progressBackgroundColor={themeColors.mode === "dark" ? "#333" : "#fff"}
          />
        }
      >
        <View style={[styles.pageWrap, { backgroundColor: 'transparent' }]}> 
          <View style={{ height: heroHeight - 36 }} />

          <View style={styles.overlaySheet}> 
            <View style={[styles.contentCard, { backgroundColor: cardTone }]}> 
              <View style={styles.headerContent}>
                <Text style={[styles.title, { color: themeColors.textColor, fontFamily: titleFont }]}>{recipe.name}</Text>
                {!!recipe.description && (
                  <Text style={[styles.description, { color: '#6F6F6F', fontFamily: bodyFont }]}>{recipe.description}</Text>
                )}
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="time-outline" size={14} color={primaryColor} />
                  <Text style={styles.metaPillText}>{recipe.cookTime ? `${recipe.cookTime} min` : 'N/A'}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="barbell-outline" size={14} color={primaryColor} />
                  <Text style={styles.metaPillText}>{recipe.difficulty || 'Standard'}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Ionicons name="flame-outline" size={14} color={primaryColor} />
                  <Text style={styles.metaPillText}>{recipe.calories ? `${recipe.calories} cal` : 'No cal'}</Text>
                </View>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#292929' : '#FFFDF9' }]}> 
                <Text style={[styles.sectionTitle, { color: themeColors.textColor, fontFamily: titleFont }]}>Ingredients</Text>
              {groupIngredients(recipe.ingredients).map(group => (
                <View key={group.category}>
                  <View style={styles.ingredientCategoryRow}>
                    <View style={[styles.ingredientCategoryDot, { backgroundColor: group.color }]} />
                    <Text style={[styles.ingredientCategoryText, { color: group.color }]}>
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
                          { borderLeftWidth: 3, borderLeftColor: group.color },
                        ]}
                      >
                        <Ionicons
                          name={completedTone ? 'checkmark-circle' : status === 'expired' ? 'close-circle' : 'ellipse'}
                          size={14}
                          color={shoppingTone ? '#1d4ed8' : completedTone ? '#166534' : status === 'expired' ? '#d32f2f' : primaryColor}
                          style={styles.ingredientBullet}
                        />
                        <View style={styles.ingredientContent}>
                          <Text style={[styles.ingredientName, { color: shoppingTone ? '#1e3a8a' : completedTone ? '#166534' : status === 'expired' ? '#d32f2f' : themeColors.textColor, textDecorationLine: completedTone || status === 'expired' ? 'line-through' : 'none', fontFamily: bodyFont }]}>
                            {getDisplayQuantityText(ingredient.quantity, ingredient.unit || "")} {ingredient.name}
                          </Text>
                          <Text style={[styles.ingredientStatus, { color: shoppingTone ? '#1d4ed8' : completedTone ? '#166534' : status === 'expired' ? '#b71c1c' : '#6F6F6F', fontFamily: bodyFont }]}>
                            {status === 'available' ? '(In Stock)' : status === 'partial' ? '(Not Enough)' : status === 'shopping' ? '(On Shopping List)' : status === 'completed' ? '(Purchased)' : status === 'expired' ? '(Expired)' : '(Missing)'}
                          </Text>
                        </View>
                        {(shoppingTone || completedTone) ? (
                          <Pressable
                            onPress={() => removeSingleIngredientFromShoppingList(ingredient, ingredientIndex)}
                            style={({ pressed }) => [styles.ingredientActionCircle, { borderColor: shoppingTone ? '#60a5fa' : '#4ade80' }, pressed && styles.pressedScale]}
                          >
                            <Ionicons name="close" size={14} color={shoppingTone ? '#1d4ed8' : '#166534'} />
                          </Pressable>
                        ) : null}
                        {(status === 'missing' || status === 'partial' || status === 'expired') ? (
                          <Pressable
                            onPress={() => addSingleIngredientToShoppingList(ingredient, ingredientIndex)}
                            style={({ pressed }) => [styles.addIngredientButton, { borderColor: primaryColor }, pressed && styles.pressedScale]}
                          >
                            <Text style={[styles.addIngredientButtonText, { color: primaryColor }]}>+</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              ))}
              </View>

              <View style={[styles.sectionCard, { backgroundColor: isDark ? '#292929' : '#FFFDF9' }]}> 
                <Text style={[styles.sectionTitle, { color: themeColors.textColor, fontFamily: titleFont }]}>Steps</Text>
              {recipe.instructions.map((instruction, index) => (
                <View key={`instruction-${index}`} style={styles.timelineRow}>
                  <View style={[styles.timelineNumberCircle, { backgroundColor: primaryColor }]}> 
                    <Text style={styles.timelineNumberText}>{index + 1}</Text>
                  </View>
                  <View style={[styles.timelineCard, { backgroundColor: isDark ? '#2a2a2a' : '#fffdf9' }]}> 
                    <Text style={[styles.instructionText, { color: themeColors.mode === "dark" ? "#ddd" : "#4A4A4A", fontFamily: bodyFont }]}>{instruction}</Text>
                  </View>
                </View>
              ))}
              </View>

              <View style={[styles.creatorCard, { backgroundColor: isDark ? '#292929' : '#FFFDF9' }]}> 
                {recipe.sourceUrl ? (
                  <>
                    <View style={[styles.creatorAvatar, { backgroundColor: accentSoft }]}> 
                      <Ionicons name="link" size={20} color={primaryColor} />
                    </View>
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: themeColors.textColor, fontFamily: titleFont }]} numberOfLines={1}>
                        Imported from website
                      </Text>
                      <Text style={[styles.creatorHandle, { color: '#6F6F6F', fontFamily: bodyFont }]} numberOfLines={1}>
                        {sourceHost}
                      </Text>
                      <Text style={[styles.creatorFollowers, { color: '#6F6F6F', fontFamily: bodyFont }]} numberOfLines={1}>
                        Original importer: {recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || recipe.creatorName || "Unknown"}
                      </Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable
                        onPress={() => {
                          if (!recipe.sourceUrl) return;
                          Linking.openURL(recipe.sourceUrl).catch(() => {
                            Alert.alert("Could not open link", "Please try again.");
                          });
                        }}
                        style={({ pressed }) => [styles.followButton, { backgroundColor: primaryColor }, pressed && styles.pressedScale]}
                      >
                        <Text style={styles.followButtonText}>Open Link</Text>
                      </Pressable>
                      {!!(recipe.originalImporterUserId || recipe.originalCreatorUserId || recipe.creatorUserId) && (
                        <Pressable
                          onPress={openImporterProfile}
                          style={({ pressed }) => [styles.followButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }, pressed && styles.pressedScale]}
                        >
                          <Text style={[styles.followButtonText, { color: isDark ? '#e0e0e0' : '#333' }]}>View Profile</Text>
                        </Pressable>
                      )}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={[styles.creatorAvatar, { backgroundColor: accentSoft }]}> 
                      <Ionicons name="person" size={20} color={primaryColor} />
                    </View>
                    <View style={styles.creatorInfo}>
                      <Text style={[styles.creatorName, { color: themeColors.textColor, fontFamily: titleFont }]} numberOfLines={1}>
                        {recipe.originalCreatorDisplayName || recipe.creatorName || 'Insert Chef'}
                      </Text>
                      <Text style={[styles.creatorHandle, { color: '#6F6F6F', fontFamily: bodyFont }]} numberOfLines={1}>
                        {recipe.creatorHandle || '@insertchef'}
                      </Text>
                      <Text style={[styles.creatorFollowers, { color: '#6F6F6F', fontFamily: bodyFont }]}>
                        Original creator
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleAddCreatorAsFriend}
                      style={({ pressed }) => [styles.followButton, { backgroundColor: primaryColor }, pressed && styles.pressedScale]}
                    >
                      <Text style={styles.followButtonText}>Add Friend</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={() => setShowShareModal(false)}>
        <View style={styles.shareModalBackdrop}>
          <View style={[styles.shareModalCard, { backgroundColor: cardTone, borderColor: mutedBorder }]}>
            <Text style={[styles.shareModalTitle, { color: themeColors.textColor }]}>Share Recipe</Text>
            <Text style={[styles.shareModalSub, { color: mutedText }]}>Choose how you want to share this recipe.</Text>

            <View style={styles.shareActionGrid}>
              <TouchableOpacity onPress={shareRecipeToSocial} style={[styles.shareOptionCard, { borderColor: mutedBorder }]}>
                <Ionicons name="planet-outline" size={18} color={themeColors.accentColor} />
                <Text style={[styles.shareOptionTitle, { color: themeColors.textColor }]}>Share to Social</Text>
                <Text style={[styles.shareOptionSub, { color: mutedText }]}>Post this recipe to your social feed.</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={shareRecipeByText} style={[styles.shareOptionCard, { borderColor: mutedBorder }]}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color={themeColors.accentColor} />
                <Text style={[styles.shareOptionTitle, { color: themeColors.textColor }]}>Share by Text</Text>
                <Text style={[styles.shareOptionSub, { color: mutedText }]}>Send a message with an app link.</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.friendShareLabel, { color: mutedText }]}>Send to Friend</Text>
            {friends.length === 0 ? (
              <View style={[styles.friendEmptyCard, { borderColor: mutedBorder }]}>
                <Text style={{ color: mutedText }}>No friends yet. Add friends from Social to share in-app.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                {friends.map((friend) => (
                  <View key={friend.id} style={[styles.friendRow, { borderColor: mutedBorder }]}> 
                    <View style={styles.friendAvatar}>
                      <Text style={styles.friendAvatarText}>{(friend.displayName || "F").slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendName, { color: themeColors.textColor }]}>{friend.displayName || "Friend"}</Text>
                      {!!friend.handle && <Text style={[styles.friendHandle, { color: mutedText }]}>{friend.handle}</Text>}
                    </View>
                    <TouchableOpacity
                      disabled={sendingToFriendId === friend.id}
                      onPress={() => sendRecipeToFriend(friend)}
                      style={[styles.friendSendButton, { backgroundColor: themeColors.accentColor }, sendingToFriendId === friend.id && { opacity: 0.65 }]}
                    >
                      <Text style={styles.friendSendButtonText}>{sendingToFriendId === friend.id ? "Sending" : "Send"}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setShowShareModal(false)} style={[styles.shareCloseButton, { borderColor: mutedBorder }]}>
              <Text style={[styles.shareCloseText, { color: mutedText }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Importer profile modal */}
      <Modal visible={showImporterProfile} transparent animationType="fade" onRequestClose={() => setShowImporterProfile(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 16 }}>
          <View style={{ maxHeight: "88%", borderRadius: 18, borderWidth: 1, borderColor: isDark ? "#3a3a3a" : "#e8e8e8", backgroundColor: isDark ? "#202020" : "#fff" }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 18 }} keyboardShouldPersistTaps="handled">
              <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700", marginBottom: 10 }}>Importer Profile</Text>

              {loadingImporterProfile || !importerProfile ? (
                <Text style={{ color: isDark ? "#aaa" : "#666" }}>Loading profile...</Text>
              ) : (
                <>
                  {/* Identity row */}
                  <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: isDark ? "#3a3a3a" : "#e8e8e8", borderRadius: 12, padding: 10, marginBottom: 12, gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: primaryColor + "22", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: primaryColor, fontSize: 18, fontWeight: "700" }}>{importerProfile.displayName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: themeColors.textColor, fontWeight: "700", fontSize: 15 }}>{importerProfile.displayName}</Text>
                      <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginTop: 1 }}>{importerProfile.handle}</Text>
                      <Text style={{ color: isDark ? "#888" : "#999", fontSize: 11, marginTop: 2 }}>{importerProfile.isFriend ? "Friend" : "Public Profile"}</Text>
                    </View>
                  </View>

                  {/* Allergies */}
                  <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 6 }}>Allergies</Text>
                  {importerProfile.allergies.length === 0 ? (
                    <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, fontSize: 13 }}>No allergies listed.</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {(importerProfile.isFriend ? importerProfile.allergies : importerProfile.allergies.slice(0, 3)).map((allergy) => (
                        <View key={`imp-allergy-${allergy}`} style={{ borderWidth: 1, borderColor: isDark ? "#444" : "#ddd", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ color: themeColors.textColor, fontWeight: "700", fontSize: 12 }}>{allergy}</Text>
                        </View>
                      ))}
                      {!importerProfile.isFriend && importerProfile.allergies.length > 3 && (
                        <View style={{ borderWidth: 1, borderColor: isDark ? "#444" : "#ddd", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12 }}>+{importerProfile.allergies.length - 3} more</Text>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 6 }}>Dietary Restrictions</Text>
                  {importerProfile.dietaryRestrictions.length === 0 ? (
                    <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, fontSize: 13 }}>No dietary restrictions listed.</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                      {importerProfile.dietaryRestrictions.map((restriction) => (
                        <View key={`imp-diet-${restriction}`} style={{ borderWidth: 1, borderColor: isDark ? "#444" : "#ddd", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                          <Text style={{ color: themeColors.textColor, fontWeight: "700", fontSize: 12 }}>{restriction}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Public recipes */}
                  <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 6 }}>Public Recipes</Text>
                  {importerProfile.publicRecipes.length === 0 ? (
                    <Text style={{ color: isDark ? "#aaa" : "#777", marginBottom: 12, fontSize: 13 }}>No public recipes yet.</Text>
                  ) : (
                    <ScrollView style={{ maxHeight: 220 }} contentContainerStyle={{ gap: 8, marginBottom: 12 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                      {importerProfile.publicRecipes.map((pr) => (
                        <TouchableOpacity
                          key={pr.id}
                          onPress={() => openImporterPublicRecipeDetail(pr)}
                          style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: isDark ? "#3a3a3a" : "#e8e8e8", borderRadius: 10, padding: 10, gap: 10 }}
                          activeOpacity={0.8}
                        >
                          {!!pr.imageUrl && <Image source={{ uri: pr.imageUrl }} contentFit="cover" style={{ width: 44, height: 44, borderRadius: 8 }} transition={120} />}
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: themeColors.textColor, fontWeight: "700" }} numberOfLines={1}>{pr.name}</Text>
                            <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 12, marginTop: 1 }}>
                              {pr.cookTime ? `${pr.cookTime} min` : "Time n/a"} · {pr.difficulty || "easy"}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={14} color={isDark ? "#aaa" : "#999"} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Add friend */}
                  {importerProfile.userId !== userId && (
                    <TouchableOpacity
                      onPress={sendFriendRequestToImporter}
                      disabled={importerProfile.isFriend || importerProfile.hasPendingRequest}
                      style={{ borderRadius: 12, borderWidth: 1, borderColor: primaryColor, backgroundColor: primaryColor + "18", paddingVertical: 12, alignItems: "center", marginBottom: 4, opacity: (importerProfile.isFriend || importerProfile.hasPendingRequest) ? 0.65 : 1 }}
                    >
                      <Text style={{ color: primaryColor, fontWeight: "700" }}>
                        {importerProfile.isFriend ? "Already Friends" : importerProfile.hasPendingRequest ? "Request Sent" : "Add Friend"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowImporterProfile(false)}
              style={{ margin: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "#4a4a4a" : "#ddd", paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: isDark ? "#bbb" : "#666", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Importer public recipe detail modal */}
      <Modal visible={!!selectedImporterRecipeDetail} transparent animationType="fade" onRequestClose={() => setSelectedImporterRecipeDetail(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 16 }}>
          <View style={{ maxHeight: "88%", borderRadius: 18, borderWidth: 1, borderColor: isDark ? "#3a3a3a" : "#e8e8e8", backgroundColor: isDark ? "#202020" : "#fff" }}>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 18 }}>
              <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700", marginBottom: 4 }}>{selectedImporterRecipeDetail?.name}</Text>
              {!!selectedImporterRecipeDetail?.description && (
                <Text style={{ color: isDark ? "#aaa" : "#666", fontSize: 13, lineHeight: 19, marginBottom: 10 }}>{selectedImporterRecipeDetail.description}</Text>
              )}
              {!!selectedImporterRecipeDetail?.imageUrl && (
                <Image source={{ uri: selectedImporterRecipeDetail.imageUrl }} contentFit="cover" style={{ width: "100%", height: 180, borderRadius: 12, marginBottom: 12 }} transition={160} />
              )}
              {!!selectedImporterRecipeDetail?.sourceUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedImporterRecipeDetail!.sourceUrl!).catch(() => Alert.alert("Could not open link"))}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12, alignSelf: "flex-start", borderWidth: 1, borderColor: isDark ? "#3a3a3a" : "#ddd", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                >
                  <Ionicons name="link-outline" size={14} color={isDark ? "#aaa" : "#666"} />
                  <Text style={{ color: isDark ? "#aaa" : "#666", fontSize: 12 }}>Open Source Link</Text>
                </TouchableOpacity>
              )}

              <Text style={{ color: themeColors.textColor, fontWeight: "700", marginBottom: 6 }}>Ingredients</Text>
              {(selectedImporterRecipeDetail?.ingredients || []).length === 0 ? (
                <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 13, marginBottom: 12 }}>No ingredients listed.</Text>
              ) : (
                (selectedImporterRecipeDetail?.ingredients || []).map((ing, idx) => {
                  const qty = `${ing.quantity ?? ""}`.trim();
                  const unit = `${ing.unit ?? ""}`.trim();
                  const prefix = [qty, unit].filter(Boolean).join(" ");
                  return (
                    <Text key={`importer-detail-ing-${idx}`} style={{ color: themeColors.textColor, fontSize: 13, marginBottom: 5 }}>
                      • {prefix ? `${prefix} ${ing.name}` : ing.name}
                    </Text>
                  );
                })
              )}

              <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 10, marginBottom: 6 }}>Steps</Text>
              {(selectedImporterRecipeDetail?.instructions || []).length === 0 ? (
                <Text style={{ color: isDark ? "#aaa" : "#777", fontSize: 13 }}>No steps listed.</Text>
              ) : (
                (selectedImporterRecipeDetail?.instructions || []).map((step, idx) => (
                  <Text key={`importer-detail-step-${idx}`} style={{ color: themeColors.textColor, fontSize: 13, lineHeight: 20, marginBottom: 6 }}>
                    {idx + 1}. {step}
                  </Text>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setSelectedImporterRecipeDetail(null)}
              style={{ margin: 12, borderRadius: 12, borderWidth: 1, borderColor: isDark ? "#4a4a4a" : "#ddd", paddingVertical: 12, alignItems: "center" }}
            >
              <Text style={{ color: isDark ? "#bbb" : "#666", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8F8",
  },
  topActionBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: Platform.OS === "ios" ? 54 : 24,
    zIndex: 30,
  },
  topRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFE8D9",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  cookChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  cookChipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  shareChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#fff3ea",
    borderWidth: 1,
    borderColor: "#ffd8bf",
  },
  shareChipText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  foregroundScroll: {
    zIndex: 10,
  },
  pageWrap: {
    paddingHorizontal: 0,
    paddingTop: 0,
    zIndex: 10,
  },
  heroBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    pointerEvents: "none",
  },
  heroWrap: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  heroImage: {
    width: "100%",
    height: 236,
  },
  heroFallback: {
    backgroundColor: "#FFE8D9",
    alignItems: "center",
    justifyContent: "center",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 84,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    marginBottom: 12,
  },
  overlaySheet: {
    zIndex: 10,
    paddingTop: 0,
    paddingBottom: 14,
    backgroundColor: "transparent",
  },
  contentCard: {
    marginHorizontal: 0,
    borderRadius: 24,
    paddingTop: 4,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.11,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.15,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
    paddingHorizontal: 16,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
    letterSpacing: 0.1,
  },
  sectionCard: {
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  ingredientCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 10,
  },
  ingredientCategoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  ingredientCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  ingredientItem: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    backgroundColor: "#fafafa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ededed",
    alignItems: "center",
  },
  ingredientAvailable: {
    backgroundColor: "#f4fbf6",
    borderLeftColor: "#28a745",
  },
  ingredientPartial: {
    backgroundColor: "#fffaf0",
    borderLeftColor: "#ffc107",
  },
  ingredientMissing: {
    backgroundColor: "#fff3f3",
    borderLeftColor: "#dc3545",
  },
  ingredientShopping: {
    backgroundColor: "#eff6ff",
    borderLeftColor: "#60a5fa",
  },
  ingredientCompleted: {
    backgroundColor: "#f1fbf4",
    borderLeftColor: "#4ade80",
  },
  ingredientBullet: {
    marginRight: 9,
  },
  ingredientContent: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
    textTransform: "capitalize",
    letterSpacing: 0.15,
  },
  ingredientStatus: {
    fontSize: 11,
    color: "#6F6F6F",
    marginTop: 2,
    letterSpacing: 0.15,
  },
  ingredientActionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  addIngredientButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 1,
    backgroundColor: "#fff",
  },
  addIngredientButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  timelineRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  timelineNumberCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginRight: 10,
  },
  timelineNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  timelineCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionText: {
    fontSize: 15,
    color: "#4A4A4A",
    lineHeight: 23,
    letterSpacing: 0.15,
  },
  creatorCard: {
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  creatorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  creatorHandle: {
    marginTop: 2,
    fontSize: 13,
  },
  creatorFollowers: {
    marginTop: 4,
    fontSize: 13,
  },
  followButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  followButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  shareModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  shareModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  shareModalSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  shareActionGrid: {
    marginTop: 12,
    gap: 8,
  },
  shareOptionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  shareOptionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  shareOptionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  friendShareLabel: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  friendEmptyCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  friendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ffefe1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  friendAvatarText: {
    color: "#d86f21",
    fontWeight: "800",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "700",
  },
  friendHandle: {
    marginTop: 1,
    fontSize: 12,
  },
  friendSendButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  friendSendButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  shareCloseButton: {
    marginTop: 12,
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  shareCloseText: {
    fontWeight: "700",
  },
});
