import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, deleteDoc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { cookHistoryCol, mealPlanDoc, mealPlansCol, nutritionEntriesCol, pantryCol, pantryDoc, recipesCol, settingsDoc, shoppingCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { estimateRecipeMacros, getNutritionFoodSuggestions, RecipeMacroSummary } from "@/screens/utils/nutritionUtils";
import { checkRecipeAvailability } from "@/screens/components/utils/ingredientUtils";
import styles from "./HomeScreen.styles";

type RecipeLite = {
  id: string;
  name: string;
  cookTime?: string | number;
  ingredients: Array<{ name: string; quantity?: string | number; unit?: string }>;
  nutritionSummary?: RecipeMacroSummary;
};

type ShoppingTodoItem = {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  completed?: boolean;
  createdAt?: number;
};

type PantryLiteItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  location: string;
  type?: string;
  dateAdded?: string;
  expirationDate?: string;
};

type MissingSuggestion = {
  key: string;
  name: string;
  quantity: string;
  unit: string;
  recipes: string[];
};

type ConsumedNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type CookHistoryLite = {
  id: string;
  recipeId?: string;
  recipeName: string;
  cookedAt: number;
  consumedServings?: number;
  consumedNutrition?: ConsumedNutrition | null;
  nutritionSummary?: RecipeMacroSummary | null;
};

type ManualNutritionEntry = {
  id: string;
  itemName: string;
  quantity: string;
  unit: string;
  createdAt: number;
  consumedNutrition: ConsumedNutrition;
};

type NutritionFeedEntry = {
  id: string;
  title: string;
  createdAt: number;
  consumedServings?: number;
  consumedNutrition: ConsumedNutrition;
  source: "cook" | "manual";
  quantityLabel?: string;
};

type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type HomeModuleKey = "overview" | "nutrition" | "plan" | "calendar";

const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: 2000,
  protein: 140,
  carbs: 220,
  fat: 70,
};

const MANUAL_NUTRITION_UNITS = ["g", "kg", "ml", "L", "oz", "lb", "cup", "tbsp", "tsp", "pcs"];

const QUICK_ADD_FOOD_CHIPS = ["banana", "egg", "chicken breast", "rice", "oats", "greek yogurt", "apple", "milk"];

const MODULE_CONFIG: Array<{ key: HomeModuleKey; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }> = [
  { key: "overview", label: "Overview", icon: "home-outline", description: "Greeting, shortcuts, and quick context" },
  { key: "nutrition", label: "Nutrition", icon: "fitness-outline", description: "Calories, macros, and meal log" },
  { key: "plan", label: "Today", icon: "calendar-outline", description: "Planned recipes and errands" },
  { key: "calendar", label: "Calendar", icon: "grid-outline", description: "Month view and recipe planner" },
];

const QUICK_AMOUNT_BY_UNIT: Record<string, string[]> = {
  g: ["50", "100", "150", "200"],
  kg: ["0.25", "0.5", "1"],
  ml: ["100", "250", "500"],
  l: ["0.25", "0.5", "1"],
  oz: ["4", "6", "8"],
  lb: ["0.5", "1", "2"],
  cup: ["0.5", "1", "2"],
  tbsp: ["1", "2", "4"],
  tsp: ["1", "2", "3"],
  pcs: ["1", "2", "3"],
};

const PIECE_UNITS = new Set(["pcs", "pc", "piece", "pieces", "unit", "units", "qty", "whole", "clove", "cloves", "slice", "slices"]);

const normalizeFoodName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const parseTrackingAmount = (value?: string | number) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  const text = String(value).trim().toLowerCase();
  if (!text) return 0;

  const fractionMatch = text.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = Number(fractionMatch[1]);
    const numerator = Number(fractionMatch[2]);
    const denominator = Number(fractionMatch[3]);
    return denominator ? whole + numerator / denominator : whole;
  }

  const simpleFractionMatch = text.match(/^(\d+)\/(\d+)$/);
  if (simpleFractionMatch) {
    const numerator = Number(simpleFractionMatch[1]);
    const denominator = Number(simpleFractionMatch[2]);
    return denominator ? numerator / denominator : 0;
  }

  const numericMatch = text.match(/-?\d*\.?\d+/);
  return numericMatch ? Number(numericMatch[0]) : 0;
};

const normalizeTrackingUnit = (value?: string) => String(value || "").trim().toLowerCase();

const toComparableQuantity = (quantity: number, unit: string): { amount: number; unit: string } | null => {
  const normalizedUnit = normalizeTrackingUnit(unit);
  if (!Number.isFinite(quantity) || quantity <= 0 || !normalizedUnit) return null;

  if (["g", "gram", "grams"].includes(normalizedUnit)) return { amount: quantity, unit: "g" };
  if (["kg", "kilogram", "kilograms"].includes(normalizedUnit)) return { amount: quantity * 1000, unit: "g" };
  if (["mg", "milligram", "milligrams"].includes(normalizedUnit)) return { amount: quantity / 1000, unit: "g" };
  if (["oz", "ounce", "ounces"].includes(normalizedUnit)) return { amount: quantity * 28.349523125, unit: "g" };
  if (["lb", "lbs", "pound", "pounds"].includes(normalizedUnit)) return { amount: quantity * 453.59237, unit: "g" };

  if (["ml", "milliliter", "milliliters"].includes(normalizedUnit)) return { amount: quantity, unit: "ml" };
  if (["l", "liter", "liters"].includes(normalizedUnit)) return { amount: quantity * 1000, unit: "ml" };
  if (["cup", "cups"].includes(normalizedUnit)) return { amount: quantity * 240, unit: "ml" };
  if (["tbsp", "tablespoon", "tablespoons"].includes(normalizedUnit)) return { amount: quantity * 15, unit: "ml" };
  if (["tsp", "teaspoon", "teaspoons"].includes(normalizedUnit)) return { amount: quantity * 5, unit: "ml" };

  if (PIECE_UNITS.has(normalizedUnit)) return { amount: quantity, unit: "pcs" };

  return { amount: quantity, unit: normalizedUnit };
};

const inferPantryType = (itemName: string): string => {
  const name = normalizeFoodName(itemName);
  if (/beef|chicken|pork|lamb|fish|salmon|shrimp|steak|turkey|bacon|sausage/.test(name)) return "meat";
  if (/milk|cheese|yogurt|cream|butter/.test(name)) return "dairy";
  if (/apple|banana|orange|tomato|lettuce|carrot|broccoli|spinach|potato|onion|garlic|pepper|fruit|vegetable/.test(name)) return "produce";
  if (/frozen|ice cream|fries|pizza/.test(name)) return "frozen";
  if (/bread|bagel|muffin|cake|cookie/.test(name)) return "bakery";
  if (/juice|soda|coffee|tea|water|drink/.test(name)) return "beverages";
  return "pantry";
};

const inferPantryLocation = (type: string): string => {
  if (type === "frozen") return "Freezer";
  if (type === "produce" || type === "dairy" || type === "meat" || type === "beverages") return "Fridge";
  if (type === "bakery") return "Counter";
  return "Pantry";
};

const inferExpirationDays = (type: string): number => {
  if (type === "meat") return 3;
  if (type === "produce") return 7;
  if (type === "dairy") return 14;
  if (type === "bakery") return 5;
  if (type === "frozen") return 90;
  if (type === "beverages") return 30;
  return 180;
};

const addDaysToDateKey = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

interface HomeScreenProps {
  theme?: ThemeColors;
  userId?: string | null;
  userDisplayName?: string;
  onOpenRecipe?: (recipeId: string) => void;
  onOpenShopping?: () => void;
  onOpenSocial?: () => void;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const parseDateKey = (dateKey: string) => {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw) - 1;
  const day = Number(dayRaw);
  return new Date(year, month, day);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function HomeScreen({ theme, userId, userDisplayName, onOpenRecipe, onOpenShopping, onOpenSocial }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  const [recipes, setRecipes] = useState<RecipeLite[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingTodoItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryLiteItem[]>([]);
  const [cookEntries, setCookEntries] = useState<CookHistoryLite[]>([]);
  const [manualNutritionEntries, setManualNutritionEntries] = useState<ManualNutritionEntry[]>([]);
  const [nutritionTargets, setNutritionTargets] = useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);
  const [showNutritionTargetsModal, setShowNutritionTargetsModal] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [targetDraft, setTargetDraft] = useState({
    calories: String(DEFAULT_NUTRITION_TARGETS.calories),
    protein: String(DEFAULT_NUTRITION_TARGETS.protein),
    carbs: String(DEFAULT_NUTRITION_TARGETS.carbs),
    fat: String(DEFAULT_NUTRITION_TARGETS.fat),
  });
  const [foodDraft, setFoodDraft] = useState({
    name: "",
    quantity: "100",
    unit: "g",
  });
  const [packageDraft, setPackageDraft] = useState({
    quantity: "",
    unit: "g",
  });
  const [foodPreview, setFoodPreview] = useState<RecipeMacroSummary | null>(null);
  const [foodPreviewLoading, setFoodPreviewLoading] = useState(false);
  const [plansByDate, setPlansByDate] = useState<Record<string, string[]>>({});
  const [visibleMonth, setVisibleMonth] = useState(normalizeMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");
  const [visibleModules, setVisibleModules] = useState<Record<HomeModuleKey, boolean>>({
    overview: true,
    nutrition: true,
    plan: true,
    calendar: true,
  });
  const [showModuleEditor, setShowModuleEditor] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const unsubscribeRecipes = onSnapshot(recipesCol(userId), (snapshot) => {
      const nextRecipes = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: String(docSnap.data().name || "Untitled Recipe"),
        cookTime: docSnap.data().cookTime,
        ingredients: Array.isArray(docSnap.data().ingredients)
          ? docSnap.data().ingredients
              .map((ingredient: any) => ({
                name: String(ingredient?.name || "").trim(),
                quantity: ingredient?.quantity,
                unit: ingredient?.unit,
              }))
              .filter((ingredient: { name: string }) => ingredient.name.length > 0)
          : [],
      }));
      setRecipes(nextRecipes);
    });

    const unsubscribePlans = onSnapshot(mealPlansCol(userId), (snapshot) => {
      const nextPlans: Record<string, string[]> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const ids = Array.isArray(data.recipeIds) ? data.recipeIds.filter((id: unknown): id is string => typeof id === "string") : [];
        nextPlans[docSnap.id] = ids;
      });
      setPlansByDate(nextPlans);
    });

    const unsubscribeShopping = onSnapshot(shoppingCol(userId), (snapshot) => {
      const nextItems = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ShoppingTodoItem, "id">),
      }));
      setShoppingItems(nextItems);
    });

    const unsubscribePantry = onSnapshot(pantryCol(userId), (snapshot) => {
      const nextPantry = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        name: String(docSnap.data().name || "").trim(),
        quantity: Number(docSnap.data().quantity) || 0,
        unit: String(docSnap.data().unit || "qty"),
        location: String(docSnap.data().location || "Pantry"),
        type: typeof docSnap.data().type === "string" ? docSnap.data().type : undefined,
        dateAdded: typeof docSnap.data().dateAdded === "string" ? docSnap.data().dateAdded : undefined,
        expirationDate: typeof docSnap.data().expirationDate === "string" ? docSnap.data().expirationDate : undefined,
      })).filter((item) => item.name.length > 0);
      setPantryItems(nextPantry);
    });

    const unsubscribeCookHistory = onSnapshot(cookHistoryCol(userId), (snapshot) => {
      const nextEntries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          recipeId: data.recipeId,
          recipeName: String(data.recipeName || "Meal"),
          cookedAt: Number(data.cookedAt) || 0,
          consumedServings: typeof data.consumedServings === "number" ? data.consumedServings : 1,
          consumedNutrition: data.consumedNutrition || null,
          nutritionSummary: data.nutritionSummary || null,
        } satisfies CookHistoryLite;
      }).sort((a, b) => b.cookedAt - a.cookedAt);
      setCookEntries(nextEntries);
    });

    const unsubscribeNutritionEntries = onSnapshot(nutritionEntriesCol(userId), (snapshot) => {
      const nextEntries = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          itemName: String(data.itemName || "Food"),
          quantity: String(data.quantity || ""),
          unit: String(data.unit || ""),
          createdAt: Number(data.createdAt) || 0,
          consumedNutrition: {
            calories: Number(data.consumedNutrition?.calories) || 0,
            protein: Number(data.consumedNutrition?.protein) || 0,
            carbs: Number(data.consumedNutrition?.carbs) || 0,
            fat: Number(data.consumedNutrition?.fat) || 0,
            fiber: Number(data.consumedNutrition?.fiber) || 0,
          },
        } satisfies ManualNutritionEntry;
      }).sort((a, b) => b.createdAt - a.createdAt);
      setManualNutritionEntries(nextEntries);
    });

    const unsubscribeNutritionSettings = onSnapshot(settingsDoc(userId, "preferences"), (docSnap) => {
      const data = docSnap.data() as any;
      const targets = data?.nutritionTargets;
      if (!targets) {
        setNutritionTargets(DEFAULT_NUTRITION_TARGETS);
        return;
      }

      setNutritionTargets({
        calories: Number(targets.calories) || DEFAULT_NUTRITION_TARGETS.calories,
        protein: Number(targets.protein) || DEFAULT_NUTRITION_TARGETS.protein,
        carbs: Number(targets.carbs) || DEFAULT_NUTRITION_TARGETS.carbs,
        fat: Number(targets.fat) || DEFAULT_NUTRITION_TARGETS.fat,
      });
    });

    return () => {
      unsubscribeRecipes();
      unsubscribePlans();
      unsubscribeShopping();
      unsubscribePantry();
      unsubscribeCookHistory();
      unsubscribeNutritionEntries();
      unsubscribeNutritionSettings();
    };
  }, [userId]);

  const recipeMap = useMemo(() => {
    return recipes.reduce<Record<string, RecipeLite>>((acc, recipe) => {
      acc[recipe.id] = recipe;
      return acc;
    }, {});
  }, [recipes]);

  const greeting = useMemo(() => getGreeting(), []);
  const firstName = useMemo(() => {
    if (!userDisplayName) return "Chef";
    return userDisplayName.trim().split(/\s+/)[0] || "Chef";
  }, [userDisplayName]);

  const selectedPlanIds = plansByDate[selectedDate] || [];
  const selectedPlannedRecipes = selectedPlanIds
    .map((recipeId) => recipeMap[recipeId])
    .filter((recipe): recipe is RecipeLite => Boolean(recipe));

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(visibleMonth);
  }, [visibleMonth]);

  const todayKey = toDateKey(new Date());
  const todayDateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(new Date());
  }, []);

  const todayPlannedRecipes = useMemo(() => {
    const todaysIds = plansByDate[todayKey] || [];
    return todaysIds
      .map((recipeId) => recipeMap[recipeId])
      .filter((recipe): recipe is RecipeLite => Boolean(recipe));
  }, [plansByDate, recipeMap, todayKey]);

  const pendingShoppingItems = useMemo(() => {
    return shoppingItems
      .filter((item) => !item.completed)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [shoppingItems]);

  const shoppingNameSet = useMemo(() => {
    return new Set(
      pendingShoppingItems
        .map((item) => (item.name || "").toLowerCase().trim())
        .filter((name) => name.length > 0)
    );
  }, [pendingShoppingItems]);

  const todaysTodoItems = useMemo(() => {
    const planned = todayPlannedRecipes.slice(0, 2).map((recipe) => ({
      id: `recipe-${recipe.id}`,
      icon: "restaurant-outline" as const,
      title: `Cook ${recipe.name}`,
      meta: recipe.cookTime ? `${recipe.cookTime} min` : "Meal plan",
    }));

    const shopping = pendingShoppingItems.slice(0, 3).map((item) => {
      const amount = [item.quantity, item.unit].filter(Boolean).join(" ").trim();
      return {
        id: `shopping-${item.id}`,
        icon: "cart-outline" as const,
        title: item.name,
        meta: amount.length > 0 ? `Buy ${amount}` : "Shopping list",
      };
    });

    return [...planned, ...shopping].slice(0, 5);
  }, [pendingShoppingItems, todayPlannedRecipes]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const leadingBlankCount = firstDay.getDay();

    const cells: Array<{ key: string; dateKey?: string; dayNumber?: number }> = [];
    for (let i = 0; i < leadingBlankCount; i += 1) {
      cells.push({ key: `blank-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
      cells.push({
        key: `day-${day}`,
        dateKey: toDateKey(date),
        dayNumber: day,
      });
    }
    return cells;
  }, [visibleMonth]);

  const filteredRecipes = useMemo(() => {
    const query = recipeSearch.trim().toLowerCase();
    if (!query) return recipes;
    return recipes.filter((recipe) => recipe.name.toLowerCase().includes(query));
  }, [recipeSearch, recipes]);

  const todayCookEntries = useMemo(() => {
    return cookEntries.filter((entry) => entry.cookedAt > 0 && toDateKey(new Date(entry.cookedAt)) === todayKey);
  }, [cookEntries, todayKey]);

  const todayManualEntries = useMemo(() => {
    return manualNutritionEntries.filter((entry) => entry.createdAt > 0 && toDateKey(new Date(entry.createdAt)) === todayKey);
  }, [manualNutritionEntries, todayKey]);

  const todayNutritionFeed = useMemo(() => {
    const cookFeed: NutritionFeedEntry[] = todayCookEntries.map((entry) => ({
      id: entry.id,
      title: entry.recipeName,
      createdAt: entry.cookedAt,
      consumedServings: entry.consumedServings || 1,
      consumedNutrition: entry.consumedNutrition || {
        calories: Number(entry.nutritionSummary?.perServing?.calories) || 0,
        protein: Number(entry.nutritionSummary?.perServing?.protein) || 0,
        carbs: Number(entry.nutritionSummary?.perServing?.carbs) || 0,
        fat: Number(entry.nutritionSummary?.perServing?.fat) || 0,
        fiber: Number(entry.nutritionSummary?.perServing?.fiber) || 0,
      },
      source: "cook",
    }));

    const manualFeed: NutritionFeedEntry[] = todayManualEntries.map((entry) => ({
      id: entry.id,
      title: entry.itemName,
      createdAt: entry.createdAt,
      consumedNutrition: entry.consumedNutrition,
      source: "manual",
      quantityLabel: [entry.quantity, entry.unit].filter(Boolean).join(" ").trim(),
    }));

    return [...cookFeed, ...manualFeed].sort((a, b) => b.createdAt - a.createdAt);
  }, [todayCookEntries, todayManualEntries]);

  const todayNutrition = useMemo(() => {
    return todayNutritionFeed.reduce(
      (acc, entry) => {
        const consumed = entry.consumedNutrition;

        if (!consumed) return acc;

        return {
          calories: acc.calories + (Number(consumed.calories) || 0),
          protein: acc.protein + (Number(consumed.protein) || 0),
          carbs: acc.carbs + (Number(consumed.carbs) || 0),
          fat: acc.fat + (Number(consumed.fat) || 0),
          fiber: acc.fiber + (Number(consumed.fiber) || 0),
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
  }, [todayNutritionFeed]);

  const recentNutritionMeals = useMemo(() => todayNutritionFeed.slice(0, 6), [todayNutritionFeed]);

  const recentManualFoods = useMemo(() => {
    const seen = new Set<string>();
    return manualNutritionEntries
      .filter((entry) => entry.itemName.trim().length > 0)
      .filter((entry) => {
        const key = `${entry.itemName.trim().toLowerCase()}::${entry.unit.trim().toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [manualNutritionEntries]);

  const suggestedFoods = useMemo(() => {
    const query = foodDraft.name.trim();
    if (!query) return [];
    return getNutritionFoodSuggestions(query, 6);
  }, [foodDraft.name]);

  const quickAmounts = useMemo(() => {
    return QUICK_AMOUNT_BY_UNIT[foodDraft.unit.trim().toLowerCase()] || ["1", "2", "3"];
  }, [foodDraft.unit]);

  const pantryMatch = useMemo(() => {
    const targetName = normalizeFoodName(foodDraft.name);
    if (!targetName) return null;
    return pantryItems.find((item) => normalizeFoodName(item.name) === targetName) || null;
  }, [foodDraft.name, pantryItems]);

  const packageRemainingPreview = useMemo(() => {
    const usedComparable = toComparableQuantity(parseTrackingAmount(foodDraft.quantity), foodDraft.unit);
    const packageComparable = toComparableQuantity(parseTrackingAmount(packageDraft.quantity), packageDraft.unit);

    if (!usedComparable || !packageComparable || usedComparable.unit !== packageComparable.unit) {
      return null;
    }

    return Number((packageComparable.amount - usedComparable.amount).toFixed(2));
  }, [foodDraft.quantity, foodDraft.unit, packageDraft.quantity, packageDraft.unit]);

  const calorieProgress = Math.min(todayNutrition.calories / Math.max(nutritionTargets.calories, 1), 1);
  const proteinProgress = Math.min(todayNutrition.protein / Math.max(nutritionTargets.protein, 1), 1);
  const carbsProgress = Math.min(todayNutrition.carbs / Math.max(nutritionTargets.carbs, 1), 1);
  const fatProgress = Math.min(todayNutrition.fat / Math.max(nutritionTargets.fat, 1), 1);

  useEffect(() => {
    const itemName = foodDraft.name.trim();
    const quantity = foodDraft.quantity.trim();
    const unit = foodDraft.unit.trim();

    if (!showAddFoodModal || !itemName || !quantity || !unit) {
      setFoodPreview(null);
      setFoodPreviewLoading(false);
      return;
    }

    let cancelled = false;
    setFoodPreviewLoading(true);

    const timeoutId = setTimeout(() => {
      void estimateRecipeMacros([{ name: itemName, quantity, unit }], "1")
        .then((summary) => {
          if (cancelled) return;
          setFoodPreview(summary.calories > 0 ? summary : null);
        })
        .catch(() => {
          if (!cancelled) setFoodPreview(null);
        })
        .finally(() => {
          if (!cancelled) setFoodPreviewLoading(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [foodDraft.name, foodDraft.quantity, foodDraft.unit, showAddFoodModal]);

  useEffect(() => {
    if (!showAddFoodModal) return;
    setPackageDraft((prev) => {
      if (prev.quantity.trim().length > 0) return prev;
      const normalizedFoodUnit = foodDraft.unit.trim();
      if (!normalizedFoodUnit || prev.unit === normalizedFoodUnit) return prev;
      return { ...prev, unit: normalizedFoodUnit };
    });
  }, [foodDraft.unit, showAddFoodModal]);

  const openNutritionTargetsModal = () => {
    setTargetDraft({
      calories: String(nutritionTargets.calories),
      protein: String(nutritionTargets.protein),
      carbs: String(nutritionTargets.carbs),
      fat: String(nutritionTargets.fat),
    });
    setShowNutritionTargetsModal(true);
  };

  const openAddFoodModal = () => {
    setFoodDraft({ name: "", quantity: "100", unit: "g" });
    setPackageDraft({ quantity: "", unit: "g" });
    setFoodPreview(null);
    setShowAddFoodModal(true);
  };

  const applyFoodPreset = (name: string, defaultUnit?: string, quantity?: string) => {
    const nextUnit = defaultUnit || "g";
    setFoodDraft((prev) => ({
      name,
      quantity: quantity || prev.quantity || "100",
      unit: defaultUnit || prev.unit || "g",
    }));
    setPackageDraft((prev) => ({
      quantity: prev.quantity,
      unit: prev.quantity.trim().length > 0 ? prev.unit : nextUnit,
    }));
  };

  const saveNutritionTargets = async () => {
    if (!userId) return;

    const nextTargets = {
      calories: Math.max(Number(targetDraft.calories) || DEFAULT_NUTRITION_TARGETS.calories, 1),
      protein: Math.max(Number(targetDraft.protein) || DEFAULT_NUTRITION_TARGETS.protein, 1),
      carbs: Math.max(Number(targetDraft.carbs) || DEFAULT_NUTRITION_TARGETS.carbs, 1),
      fat: Math.max(Number(targetDraft.fat) || DEFAULT_NUTRITION_TARGETS.fat, 1),
    } satisfies NutritionTargets;

    try {
      await setDoc(settingsDoc(userId, "preferences"), { nutritionTargets: nextTargets }, { merge: true });
      setShowNutritionTargetsModal(false);
    } catch {
      Alert.alert("Error", "Could not save nutrition targets.");
    }
  };

  const saveManualFoodEntry = async () => {
    if (!userId) return;

    const itemName = foodDraft.name.trim();
    const quantity = foodDraft.quantity.trim();
    const unit = foodDraft.unit.trim();
    const packageQuantity = packageDraft.quantity.trim();
    const packageUnit = packageDraft.unit.trim();

    if (!itemName || !quantity || !unit) {
      Alert.alert("Missing info", "Enter a food name, amount, and unit.");
      return;
    }

    const trackedAmount = parseTrackingAmount(quantity);
    if (!Number.isFinite(trackedAmount) || trackedAmount <= 0) {
      Alert.alert("Invalid amount", "Enter a valid amount to log.");
      return;
    }

    const consumedComparable = toComparableQuantity(trackedAmount, unit);
    if (!consumedComparable) {
      Alert.alert("Unsupported unit", "Try a simple unit like g, oz, ml, cup, or pcs.");
      return;
    }

    if (!pantryMatch && packageQuantity) {
      const packageAmount = parseTrackingAmount(packageQuantity);
      const packageComparable = toComparableQuantity(packageAmount, packageUnit);
      if (!packageComparable || packageComparable.unit !== consumedComparable.unit) {
        Alert.alert("Package size mismatch", "Use a package amount with a compatible unit so pantry can subtract what you log.");
        return;
      }
      if (packageComparable.amount < consumedComparable.amount) {
        Alert.alert("Package too small", "The package amount should be at least as large as what you are logging.");
        return;
      }
    }

    try {
      const nutritionSummary = await estimateRecipeMacros([
        {
          name: itemName,
          quantity,
          unit,
        },
      ], "1");

      if (!nutritionSummary.calories) {
        Alert.alert("No nutrition found", "Try a simpler food name like banana, rice, chicken breast, or milk.");
        return;
      }

      if (pantryMatch) {
        const pantryComparable = toComparableQuantity(Number(pantryMatch.quantity) || 0, pantryMatch.unit);
        if (pantryComparable && pantryComparable.unit === consumedComparable.unit) {
          const remainingComparable = Number((pantryComparable.amount - consumedComparable.amount).toFixed(2));
          if (remainingComparable <= 0) {
            await deleteDoc(pantryDoc(userId, pantryMatch.id));
          } else {
            const remainingRawQuantity = remainingComparable / (pantryComparable.amount / Math.max(Number(pantryMatch.quantity) || 1, 1));
            await updateDoc(pantryDoc(userId, pantryMatch.id), {
              quantity: Number(remainingRawQuantity.toFixed(2)),
            });
          }
        }
      } else if (packageQuantity) {
        const packageAmount = parseTrackingAmount(packageQuantity);
        const packageComparable = toComparableQuantity(packageAmount, packageUnit);
        if (packageComparable) {
          const remainingComparable = Number((packageComparable.amount - consumedComparable.amount).toFixed(2));
          if (remainingComparable > 0) {
            const itemType = inferPantryType(itemName);
            await addDoc(pantryCol(userId), {
              name: itemName,
              type: itemType,
              quantity: Number(remainingComparable.toFixed(2)),
              unit: packageComparable.unit,
              location: inferPantryLocation(itemType),
              dateAdded: toDateKey(new Date()),
              expirationDate: addDaysToDateKey(inferExpirationDays(itemType)),
              userId,
              createdAt: Date.now(),
            });
          }
        }
      }

      await addDoc(nutritionEntriesCol(userId), {
        itemName,
        quantity,
        unit,
        consumedNutrition: {
          calories: nutritionSummary.calories,
          protein: nutritionSummary.protein,
          carbs: nutritionSummary.carbs,
          fat: nutritionSummary.fat,
          fiber: nutritionSummary.fiber,
        },
        nutritionSummary,
        source: "manual",
        createdAt: Date.now(),
        userId,
      });

      setFoodDraft({ name: "", quantity: "100", unit: "g" });
      setPackageDraft({ quantity: "", unit: "g" });
      setShowAddFoodModal(false);
    } catch {
      Alert.alert("Error", "Could not add this food entry right now.");
    }
  };

  const selectedDateMissingSuggestions = useMemo(() => {
    const byName = new Map<string, MissingSuggestion>();

    selectedPlannedRecipes.forEach((recipe) => {
      const ingredientNames = recipe.ingredients
        .map((ingredient) => ingredient.name?.trim())
        .filter((name): name is string => Boolean(name));

      if (ingredientNames.length === 0) return;

      const availability = checkRecipeAvailability(
        ingredientNames,
        pantryItems.map((item) => ({ name: item.name }))
      );

      availability.missing.forEach((missing) => {
        const ingredientMeta = recipe.ingredients.find(
          (ingredient) => ingredient.name.trim().toLowerCase() === missing.ingredient.trim().toLowerCase()
        );

        const key = missing.ingredient.trim().toLowerCase();
        if (!key) return;

        const existing = byName.get(key);
        if (!existing) {
          byName.set(key, {
            key,
            name: missing.ingredient.trim(),
            quantity: String(ingredientMeta?.quantity ?? "1"),
            unit: String(ingredientMeta?.unit ?? "qty"),
            recipes: [recipe.name],
          });
          return;
        }

        if (!existing.recipes.includes(recipe.name)) {
          existing.recipes.push(recipe.name);
        }
      });
    });

    return Array.from(byName.values());
  }, [pantryItems, selectedPlannedRecipes]);

  const addMissingItemToShopping = async (item: MissingSuggestion) => {
    if (!userId) return;
    if (shoppingNameSet.has(item.name.toLowerCase().trim())) {
      Alert.alert("Already on list", `${item.name} is already in your shopping list.`);
      return;
    }

    try {
      await addDoc(shoppingCol(userId), {
        name: item.name,
        quantity: item.quantity || "1",
        unit: item.unit || "qty",
        completed: false,
        userId,
        createdAt: Date.now(),
        source: "recipe",
      });
    } catch {
      Alert.alert("Error", "Could not add this item to shopping list.");
    }
  };

  const addAllMissingToShopping = async () => {
    if (!userId) return;
    const toAdd = selectedDateMissingSuggestions.filter(
      (item) => !shoppingNameSet.has(item.name.toLowerCase().trim())
    );

    if (toAdd.length === 0) {
      Alert.alert("All set", "All missing ingredients are already on your shopping list.");
      return;
    }

    try {
      await Promise.all(
        toAdd.map((item) =>
          addDoc(shoppingCol(userId), {
            name: item.name,
            quantity: item.quantity || "1",
            unit: item.unit || "qty",
            completed: false,
            userId,
            createdAt: Date.now(),
            source: "recipe",
          })
        )
      );
      Alert.alert("Added", `${toAdd.length} missing item(s) added to shopping list.`);
    } catch {
      Alert.alert("Error", "Could not add all missing ingredients.");
    }
  };

  const persistSelectedDatePlan = async (nextRecipeIds: string[]) => {
    if (!userId) return;
    if (nextRecipeIds.length === 0) {
      await deleteDoc(mealPlanDoc(userId, selectedDate)).catch(() => undefined);
      return;
    }

    await setDoc(
      mealPlanDoc(userId, selectedDate),
      {
        date: selectedDate,
        recipeIds: nextRecipeIds,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  };

  const toggleRecipeForSelectedDay = async (recipeId: string) => {
    const current = plansByDate[selectedDate] || [];
    const next = current.includes(recipeId)
      ? current.filter((id) => id !== recipeId)
      : [...current, recipeId];

    setPlansByDate((prev) => ({ ...prev, [selectedDate]: next }));
    await persistSelectedDatePlan(next);
  };

  const removeRecipeFromSelectedDay = async (recipeId: string) => {
    const current = plansByDate[selectedDate] || [];
    const next = current.filter((id) => id !== recipeId);
    setPlansByDate((prev) => ({ ...prev, [selectedDate]: next }));
    await persistSelectedDatePlan(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundColor, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={[styles.welcomeCard, { backgroundColor: themeColors.mode === "dark" ? "#262626" : "#fff", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
          <View style={styles.dashboardHeaderRow}>
            <View style={styles.dashboardHeaderCopy}>
              <Text style={[styles.welcomeEyebrow, { color: themeColors.mode === "dark" ? "#9d9d9d" : "#8a8a8a" }]}>Home dashboard</Text>
              <Text style={[styles.welcomeTitle, { color: themeColors.textColor }]}>{greeting}, {firstName}</Text>
              <Text style={[styles.welcomeSubtitle, { color: themeColors.mode === "dark" ? "#b0b0b0" : "#666" }]}>A modular space for planning meals, tracking nutrition, and keeping your week moving.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowModuleEditor(true)}
              style={[styles.moduleEditorButton, { borderColor: themeColors.mode === "dark" ? "#414141" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#303030" : "#fafafa" }]}
            >
              <Ionicons name="options-outline" size={15} color={themeColors.accentColor} />
              <Text style={[styles.quickActionText, { color: themeColors.textColor }]}>Customize</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              onPress={onOpenShopping}
              style={[styles.quickActionButton, { borderColor: themeColors.mode === "dark" ? "#414141" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#303030" : "#fafafa" }]}
            >
              <Ionicons name="cart-outline" size={15} color={themeColors.accentColor} />
              <Text style={[styles.quickActionText, { color: themeColors.textColor }]}>Shopping</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onOpenSocial}
              style={[styles.quickActionButton, { borderColor: themeColors.mode === "dark" ? "#414141" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#303030" : "#fafafa" }]}
            >
              <Ionicons name="people-outline" size={15} color={themeColors.accentColor} />
              <Text style={[styles.quickActionText, { color: themeColors.textColor }]}>Social</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.moduleBadgeRow}>
            {MODULE_CONFIG.filter((module) => visibleModules[module.key]).map((module) => (
              <View key={module.key} style={[styles.moduleBadge, { borderColor: themeColors.mode === "dark" ? "#3f3f3f" : "#e7e7e7", backgroundColor: themeColors.mode === "dark" ? "#2f2f2f" : "#f7f7f7" }]}>
                <Ionicons name={module.icon} size={12} color={themeColors.accentColor} />
                <Text style={[styles.moduleBadgeText, { color: themeColors.textColor }]}>{module.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {visibleModules.nutrition ? (
        <View style={[styles.nutritionCard, { backgroundColor: themeColors.mode === "dark" ? "#242424" : "#fff", borderColor: themeColors.mode === "dark" ? "#393939" : "#ececec" }]}>
          <View style={styles.nutritionHeaderRow}>
            <View>
              <Text style={[styles.nutritionEyebrow, { color: themeColors.mode === "dark" ? "#9d9d9d" : "#8a8a8a" }]}>Nutrition</Text>
              <Text style={[styles.nutritionTitle, { color: themeColors.textColor }]}>Today&apos;s Intake</Text>
            </View>
            <View style={styles.nutritionHeaderActions}>
              <TouchableOpacity style={[styles.nutritionTargetButton, { borderColor: themeColors.mode === "dark" ? "#414141" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#303030" : "#fafafa" }]} onPress={openAddFoodModal}>
                <Ionicons name="add-outline" size={14} color={themeColors.accentColor} />
                <Text style={[styles.nutritionTargetButtonText, { color: themeColors.textColor }]}>Add Food</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.nutritionTargetButton, { borderColor: themeColors.mode === "dark" ? "#414141" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#303030" : "#fafafa" }]} onPress={openNutritionTargetsModal}>
                <Ionicons name="options-outline" size={14} color={themeColors.accentColor} />
                <Text style={[styles.nutritionTargetButtonText, { color: themeColors.textColor }]}>Targets</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.calorieHeroRow}>
            <View style={[styles.calorieHeroBlock, styles.calorieHeroPrimaryBlock]}>
              <Text style={[styles.calorieHeroValue, { color: themeColors.textColor }]}>{Math.round(todayNutrition.calories)}</Text>
              <Text style={[styles.calorieHeroLabel, { color: themeColors.mode === "dark" ? "#a8a8a8" : "#6f6f6f" }]}>Calories eaten</Text>
            </View>
            <View style={[styles.calorieHeroBlock, styles.calorieHeroSecondaryBlock]}>
              <Text style={[styles.calorieHeroValue, { color: themeColors.accentColor }]}>{Math.max(Math.round(nutritionTargets.calories - todayNutrition.calories), 0)}</Text>
              <Text style={[styles.calorieHeroLabel, { color: themeColors.mode === "dark" ? "#a8a8a8" : "#6f6f6f" }]}>Remaining</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: themeColors.mode === "dark" ? "#313131" : "#edf1f4" }]}>
            <View style={[styles.progressFill, { width: `${calorieProgress * 100}%`, backgroundColor: themeColors.accentColor }]} />
          </View>
          <Text style={[styles.progressCaption, { color: themeColors.mode === "dark" ? "#a1a1a1" : "#767676" }]}>
            Goal {nutritionTargets.calories} cal • {recentNutritionMeals.length} meal log{recentNutritionMeals.length === 1 ? "" : "s"} today
          </Text>

          <View style={styles.macroStack}>
            {[
              { key: "Protein", value: todayNutrition.protein, target: nutritionTargets.protein, progress: proteinProgress, color: "#E17A2E" },
              { key: "Carbs", value: todayNutrition.carbs, target: nutritionTargets.carbs, progress: carbsProgress, color: "#3A7BDE" },
              { key: "Fat", value: todayNutrition.fat, target: nutritionTargets.fat, progress: fatProgress, color: "#4FAF8A" },
            ].map((macro) => (
              <View key={macro.key} style={styles.macroRow}>
                <View style={styles.macroLabelRow}>
                  <Text style={[styles.macroLabel, { color: themeColors.textColor }]}>{macro.key}</Text>
                  <Text style={[styles.macroValue, { color: themeColors.mode === "dark" ? "#b0b0b0" : "#666" }]}>{Math.round(macro.value)} / {macro.target}g</Text>
                </View>
                <View style={[styles.progressTrack, styles.macroTrack, { backgroundColor: themeColors.mode === "dark" ? "#313131" : "#edf1f4" }]}>
                  <View style={[styles.progressFill, { width: `${macro.progress * 100}%`, backgroundColor: macro.color }]} />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.nutritionMealSection}>
            <Text style={[styles.nutritionSectionTitle, { color: themeColors.textColor }]}>Meal Log</Text>
            {recentNutritionMeals.length > 0 ? (
              recentNutritionMeals.map((entry) => {
                const consumed = entry.consumedNutrition;
                return (
                  <View key={entry.id} style={[styles.nutritionMealRow, { borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#eceff3", backgroundColor: themeColors.mode === "dark" ? "#2d2d2d" : "#f8f9fb" }]}>
                    <View style={styles.nutritionMealBody}>
                      <Text style={[styles.nutritionMealTitle, { color: themeColors.textColor }]} numberOfLines={1}>{entry.title}</Text>
                      <Text style={[styles.nutritionMealMeta, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#707070" }]}>
                        {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} • {entry.source === "cook" ? `${entry.consumedServings || 1} serving` : (entry.quantityLabel || "Manual entry")}
                      </Text>
                    </View>
                    <Text style={[styles.nutritionMealCalories, { color: themeColors.accentColor }]}>{Math.round(Number(consumed?.calories || 0))} cal</Text>
                  </View>
                );
              })
            ) : (
              <Text style={[styles.todoEmpty, { color: themeColors.mode === "dark" ? "#9c9c9c" : "#808080" }]}>Finish cooking a recipe to start your calorie and macro log.</Text>
            )}
          </View>
        </View>
        ) : null}

        {visibleModules.plan ? (
          <View style={[styles.todayCard, { backgroundColor: themeColors.mode === "dark" ? "#242424" : "#fff", borderColor: themeColors.mode === "dark" ? "#383838" : "#ececec" }]}>
            <View style={styles.todayTopRow}>
              <Text style={[styles.todayEyebrow, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#8b8b8b" }]}>{todayDateLabel}</Text>
              <View style={[styles.todayStatChip, { backgroundColor: themeColors.accentColor + (themeColors.mode === "dark" ? "33" : "18") }]}>
                <Text style={[styles.todayStatText, { color: themeColors.accentColor }]}>{pendingShoppingItems.length} shopping left</Text>
              </View>
            </View>

            <Text style={[styles.todayTitle, { color: themeColors.textColor }]}>Today&apos;s Plan & Todo</Text>
            <Text style={[styles.todaySubtitle, { color: themeColors.mode === "dark" ? "#a9a9a9" : "#666" }]}>Your planned recipes and errands for today in one place.</Text>

            <View style={styles.todoSection}>
              {todaysTodoItems.length > 0 ? (
                todaysTodoItems.map((todo) => (
                  <View
                    key={todo.id}
                    style={[
                      styles.todoItem,
                      {
                        backgroundColor: themeColors.mode === "dark" ? "#2d2d2d" : "#f8f9fb",
                        borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#eceff3",
                      },
                    ]}
                  >
                    <View style={[styles.todoItemIcon, { backgroundColor: themeColors.accentColor + (themeColors.mode === "dark" ? "2E" : "1C") }]}>
                      <Ionicons name={todo.icon} size={14} color={themeColors.accentColor} />
                    </View>
                    <View style={styles.todoItemBody}>
                      <Text style={[styles.todoItemTitle, { color: themeColors.textColor }]} numberOfLines={1}>{todo.title}</Text>
                      <Text style={[styles.todoItemMeta, { color: themeColors.mode === "dark" ? "#8f8f8f" : "#7a7a7a" }]}>{todo.meta}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={[styles.todoEmpty, { color: themeColors.mode === "dark" ? "#9c9c9c" : "#808080" }]}>No tasks yet. Add recipes in your calendar or shopping items to build today.</Text>
              )}
            </View>
          </View>
        ) : null}

        {visibleModules.calendar ? (
          <View style={[styles.calendarCard, { backgroundColor: themeColors.mode === "dark" ? "#242424" : "#fff", borderColor: themeColors.mode === "dark" ? "#393939" : "#ececec" }]}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity
                style={[styles.calendarNavButton, { backgroundColor: themeColors.mode === "dark" ? "#303030" : "#f4f4f4" }]}
                onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              >
                <Ionicons name="chevron-back" size={16} color={themeColors.textColor} />
              </TouchableOpacity>

              <Text style={[styles.calendarMonthLabel, { color: themeColors.textColor }]}>{monthLabel}</Text>

              <TouchableOpacity
                style={[styles.calendarNavButton, { backgroundColor: themeColors.mode === "dark" ? "#303030" : "#f4f4f4" }]}
                onPress={() => setVisibleMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              >
                <Ionicons name="chevron-forward" size={16} color={themeColors.textColor} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <Text key={label} style={[styles.weekdayLabel, { color: themeColors.mode === "dark" ? "#9f9f9f" : "#8b8b8b" }]}>{label}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((cell) => {
                if (!cell.dateKey || !cell.dayNumber) {
                  return <View key={cell.key} style={styles.dayCellBlank} />;
                }
                const isSelected = cell.dateKey === selectedDate;
                const isToday = cell.dateKey === todayKey;
                const plannedCount = (plansByDate[cell.dateKey] || []).length;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: isSelected ? themeColors.accentColor : "transparent",
                        borderColor: isToday ? themeColors.accentColor : (themeColors.mode === "dark" ? "#3a3a3a" : "#ededed"),
                      },
                    ]}
                    onPress={() => setSelectedDate(cell.dateKey!)}
                  >
                    <Text style={[styles.dayCellText, { color: isSelected ? "#fff" : themeColors.textColor }]}>{cell.dayNumber}</Text>
                    {plannedCount > 0 && (
                      <View style={[styles.dayCountBadge, { backgroundColor: isSelected ? "rgba(255,255,255,0.28)" : themeColors.accentColor + "28" }]}>
                        <Text style={[styles.dayCountText, { color: isSelected ? "#fff" : themeColors.accentColor }]}>{plannedCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.selectedDateHeader}>
              <Text style={[styles.selectedDateTitle, { color: themeColors.textColor }]}>
                Plan for {parseDateKey(selectedDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </Text>
              <TouchableOpacity
                style={[styles.addPlanButton, { backgroundColor: themeColors.accentColor }]}
                onPress={() => setShowPlannerModal(true)}
              >
                <Ionicons name="add" size={14} color="#fff" />
                <Text style={styles.addPlanButtonText}>Add Recipe</Text>
              </TouchableOpacity>
            </View>

            {selectedPlannedRecipes.length > 0 ? (
              selectedPlannedRecipes.map((recipe) => (
                <View
                  key={recipe.id}
                  style={[styles.planItem, { backgroundColor: themeColors.mode === "dark" ? "#2d2d2d" : "#f7f8fa", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#eceff3" }]}
                >
                  <TouchableOpacity style={styles.planItemMain} onPress={() => onOpenRecipe?.(recipe.id)}>
                    <Ionicons name="restaurant-outline" size={16} color={themeColors.accentColor} />
                    <View style={styles.planItemBody}>
                      <Text style={[styles.planItemTitle, { color: themeColors.textColor }]} numberOfLines={1}>{recipe.name}</Text>
                      <Text style={[styles.planItemMeta, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#7c7c7c" }]}>
                        {recipe.cookTime ? `${recipe.cookTime} min` : "Planned"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void removeRecipeFromSelectedDay(recipe.id)}>
                    <Ionicons name="close-circle" size={20} color={themeColors.mode === "dark" ? "#9d9d9d" : "#8f8f8f"} />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyPlanText, { color: themeColors.mode === "dark" ? "#a1a1a1" : "#7d7d7d" }]}>No recipes planned for this day yet.</Text>
            )}

            {selectedPlannedRecipes.length > 0 && (
              <View style={[styles.missingCard, { borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec", backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fbfcfd" }]}>
                <View style={styles.missingHeaderRow}>
                  <View style={styles.missingTitleWrap}>
                    <Ionicons name="alert-circle-outline" size={16} color={themeColors.accentColor} />
                    <Text style={[styles.missingTitle, { color: themeColors.textColor }]}>Ingredient Check</Text>
                  </View>
                  {selectedDateMissingSuggestions.length > 0 && (
                    <TouchableOpacity style={[styles.addAllMissingButton, { backgroundColor: themeColors.accentColor }]} onPress={() => void addAllMissingToShopping()}>
                      <Text style={styles.addAllMissingText}>Add All Missing</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {selectedDateMissingSuggestions.length === 0 ? (
                  <Text style={[styles.missingEmpty, { color: themeColors.mode === "dark" ? "#a4a4a4" : "#6e6e6e" }]}>All ingredients are available in your pantry for this day.</Text>
                ) : (
                  selectedDateMissingSuggestions.map((item) => {
                    const shoppingAlreadyHasItem = shoppingNameSet.has(item.name.toLowerCase().trim());
                    return (
                      <View key={item.key} style={[styles.missingItemRow, { borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e9edf2" }]}>
                        <View style={styles.missingItemBody}>
                          <Text style={[styles.missingItemName, { color: themeColors.textColor }]}>{item.name}</Text>
                          <Text style={[styles.missingItemMeta, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#6f6f6f" }]}>
                            {item.quantity} {item.unit} • {item.recipes.slice(0, 2).join(", ")}
                          </Text>
                        </View>
                        <TouchableOpacity
                          disabled={shoppingAlreadyHasItem}
                          onPress={() => void addMissingItemToShopping(item)}
                          style={[
                            styles.addMissingButton,
                            {
                              backgroundColor: shoppingAlreadyHasItem
                                ? (themeColors.mode === "dark" ? "#404040" : "#dfe3e8")
                                : themeColors.accentColor,
                            },
                          ]}
                        >
                          <Text style={styles.addMissingText}>{shoppingAlreadyHasItem ? "Added" : "Add"}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={showModuleEditor} transparent animationType="fade" onRequestClose={() => setShowModuleEditor(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModuleEditor(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => undefined} style={[styles.modalCard, { backgroundColor: themeColors.mode === "dark" ? "#232323" : "#fff", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textColor }]}>Customize dashboard</Text>
              <TouchableOpacity onPress={() => setShowModuleEditor(false)}>
                <Ionicons name="close" size={18} color={themeColors.mode === "dark" ? "#b8b8b8" : "#7f7f7f"} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: themeColors.mode === "dark" ? "#a0a0a0" : "#727272" }]}>Choose which panels appear on your home screen.</Text>
            {MODULE_CONFIG.map((module) => {
              const enabled = visibleModules[module.key];
              return (
                <TouchableOpacity key={module.key} onPress={() => toggleModule(module.key)} style={[styles.modulePickerRow, { borderColor: themeColors.mode === "dark" ? "#3e3e3e" : "#ececec", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fafafa" }]}>
                  <View style={styles.modulePickerTextWrap}>
                    <View style={styles.modulePickerIconWrap}>
                      <Ionicons name={module.icon} size={14} color={enabled ? themeColors.accentColor : (themeColors.mode === "dark" ? "#9a9a9a" : "#8a8a8a")} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modulePickerTitle, { color: themeColors.textColor }]}>{module.label}</Text>
                      <Text style={[styles.modulePickerDesc, { color: themeColors.mode === "dark" ? "#9d9d9d" : "#7a7a7a" }]}>{module.description}</Text>
                    </View>
                  </View>
                  <View style={[styles.modulePickerBadge, { backgroundColor: enabled ? themeColors.accentColor : (themeColors.mode === "dark" ? "#3a3a3a" : "#e6e6e6") }]}>
                    <Text style={[styles.modulePickerBadgeText, { color: enabled ? "#fff" : (themeColors.mode === "dark" ? "#d4d4d4" : "#666") }]}>{enabled ? "Shown" : "Hidden"}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showPlannerModal} transparent animationType="fade" onRequestClose={() => setShowPlannerModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPlannerModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => undefined} style={[styles.modalCard, { backgroundColor: themeColors.mode === "dark" ? "#232323" : "#fff", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textColor }]}>Add recipes to {selectedDate}</Text>
              <TouchableOpacity onPress={() => setShowPlannerModal(false)}>
                <Ionicons name="close" size={18} color={themeColors.mode === "dark" ? "#b8b8b8" : "#7f7f7f"} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}>
              <Ionicons name="search" size={14} color={themeColors.mode === "dark" ? "#a1a1a1" : "#999"} />
              <TextInput
                value={recipeSearch}
                onChangeText={setRecipeSearch}
                placeholder="Search recipes"
                placeholderTextColor={themeColors.mode === "dark" ? "#8f8f8f" : "#aaa"}
                style={[styles.searchInput, { color: themeColors.textColor }]}
              />
            </View>

            <ScrollView contentContainerStyle={styles.modalList}>
              {filteredRecipes.map((recipe) => {
                const selected = selectedPlanIds.includes(recipe.id);
                return (
                  <TouchableOpacity
                    key={recipe.id}
                    style={[
                      styles.modalRecipeRow,
                      {
                        borderColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#3d3d3d" : "#ececec"),
                        backgroundColor: selected ? themeColors.accentColor + (themeColors.mode === "dark" ? "30" : "16") : (themeColors.mode === "dark" ? "#2b2b2b" : "#fff"),
                      },
                    ]}
                    onPress={() => void toggleRecipeForSelectedDay(recipe.id)}
                  >
                    <Text style={[styles.modalRecipeText, { color: themeColors.textColor }]} numberOfLines={1}>{recipe.name}</Text>
                    <Ionicons name={selected ? "checkmark-circle" : "add-circle-outline"} size={18} color={selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#aaa" : "#888")} />
                  </TouchableOpacity>
                );
              })}
              {filteredRecipes.length === 0 && (
                <Text style={[styles.modalEmpty, { color: themeColors.mode === "dark" ? "#9b9b9b" : "#7f7f7f" }]}>No recipes match this search.</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showNutritionTargetsModal} transparent animationType="fade" onRequestClose={() => setShowNutritionTargetsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNutritionTargetsModal(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => undefined} style={[styles.modalCard, { backgroundColor: themeColors.mode === "dark" ? "#232323" : "#fff", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textColor }]}>Nutrition Targets</Text>
              <TouchableOpacity onPress={() => setShowNutritionTargetsModal(false)}>
                <Ionicons name="close" size={18} color={themeColors.mode === "dark" ? "#b8b8b8" : "#7f7f7f"} />
              </TouchableOpacity>
            </View>

            {[
              { key: "calories", label: "Calories" },
              { key: "protein", label: "Protein (g)" },
              { key: "carbs", label: "Carbs (g)" },
              { key: "fat", label: "Fat (g)" },
            ].map((field) => (
              <View key={field.key} style={styles.targetFieldWrap}>
                <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>{field.label}</Text>
                <TextInput
                  value={targetDraft[field.key as keyof typeof targetDraft]}
                  onChangeText={(value) => setTargetDraft((prev) => ({ ...prev, [field.key]: value.replace(/[^0-9.]/g, "") }))}
                  keyboardType="numeric"
                  style={[styles.targetFieldInput, { color: themeColors.textColor, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}
                />
              </View>
            ))}

            <View style={styles.targetActionRow}>
              <TouchableOpacity style={[styles.targetActionButton, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fff" }]} onPress={() => setShowNutritionTargetsModal(false)}>
                <Text style={[styles.targetActionText, { color: themeColors.textColor }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.targetActionButton, { borderColor: themeColors.accentColor, backgroundColor: themeColors.accentColor }]} onPress={() => void saveNutritionTargets()}>
                <Text style={styles.targetPrimaryActionText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showAddFoodModal} transparent animationType="fade" onRequestClose={() => setShowAddFoodModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddFoodModal(false)} />
          <View style={[styles.modalCard, styles.foodModalCard, { backgroundColor: themeColors.mode === "dark" ? "#232323" : "#fff", borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <Text style={[styles.modalTitle, { color: themeColors.textColor }]}>Quick Add Food</Text>
                <Text style={[styles.modalSubtitle, { color: themeColors.mode === "dark" ? "#a0a0a0" : "#727272" }]}>Search a simple food, choose a portion, then log it.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddFoodModal(false)}>
                <Ionicons name="close" size={18} color={themeColors.mode === "dark" ? "#b8b8b8" : "#7f7f7f"} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.foodModalScroll}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.foodModalContent}
            >
              <View style={styles.targetFieldWrap}>
                <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>Food</Text>
                <View style={[styles.searchWrap, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}>
                  <Ionicons name="search" size={14} color={themeColors.mode === "dark" ? "#a1a1a1" : "#999"} />
                  <TextInput
                    value={foodDraft.name}
                    onChangeText={(value) => setFoodDraft((prev) => ({ ...prev, name: value }))}
                    placeholder="Search banana, rice, eggs, chicken..."
                    placeholderTextColor={themeColors.mode === "dark" ? "#8f8f8f" : "#aaa"}
                    style={[styles.searchInput, { color: themeColors.textColor }]}
                  />
                </View>
              </View>

              <View style={styles.discoveryPanel}>
                {foodDraft.name.trim().length > 0 && suggestedFoods.length > 0 ? (
                  <View style={styles.quickSection}>
                    <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Suggestions</Text>
                    {suggestedFoods.map((suggestion) => (
                      <TouchableOpacity
                        key={suggestion.name}
                        style={[styles.suggestionRow, { borderColor: themeColors.mode === "dark" ? "#3d3d3d" : "#ececec", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fbfbfb" }]}
                        onPress={() => applyFoodPreset(suggestion.name, suggestion.defaultUnit, suggestion.defaultUnit === "g" ? "100" : "1")}
                      >
                        <View style={styles.suggestionBody}>
                          <Text style={[styles.suggestionTitle, { color: themeColors.textColor }]}>{suggestion.name}</Text>
                          <Text style={[styles.suggestionMeta, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#6f6f6f" }]}>Best starter unit: {suggestion.defaultUnit}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={themeColors.mode === "dark" ? "#a6a6a6" : "#8a8a8a"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <>
                    {recentManualFoods.length > 0 && (
                      <View style={styles.quickSection}>
                        <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Recent Foods</Text>
                        <View style={styles.quickChipWrap}>
                          {recentManualFoods.map((entry) => (
                            <TouchableOpacity
                              key={entry.id}
                              style={[styles.quickChip, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fff" }]}
                              onPress={() => applyFoodPreset(entry.itemName, entry.unit || "g", entry.quantity || "1")}
                            >
                              <Text style={[styles.quickChipText, { color: themeColors.textColor }]}>{entry.itemName}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.quickSection}>
                      <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Popular Quick Adds</Text>
                      <View style={styles.quickChipWrap}>
                        {QUICK_ADD_FOOD_CHIPS.map((foodName) => (
                          <TouchableOpacity
                            key={foodName}
                            style={[styles.quickChip, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fff" }]}
                            onPress={() => applyFoodPreset(foodName)}
                          >
                            <Text style={[styles.quickChipText, { color: themeColors.textColor }]}>{foodName}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>

              <View style={styles.manualFoodRow}>
                <View style={[styles.targetFieldWrap, styles.manualFoodAmountWrap]}>
                  <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>Amount</Text>
                  <TextInput
                    value={foodDraft.quantity}
                    onChangeText={(value) => setFoodDraft((prev) => ({ ...prev, quantity: value.replace(/[^0-9./ ]/g, "") }))}
                    keyboardType="numeric"
                    style={[styles.targetFieldInput, { color: themeColors.textColor, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}
                  />
                </View>
                <View style={[styles.targetFieldWrap, styles.manualFoodUnitWrap]}>
                  <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>Unit</Text>
                  <TextInput
                    value={foodDraft.unit}
                    onChangeText={(value) => setFoodDraft((prev) => ({ ...prev, unit: value }))}
                    placeholder="g"
                    placeholderTextColor={themeColors.mode === "dark" ? "#8f8f8f" : "#aaa"}
                    style={[styles.targetFieldInput, { color: themeColors.textColor, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}
                  />
                </View>
              </View>

              <View style={styles.quickSection}>
                <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Portion Shortcuts</Text>
                <View style={styles.quickChipWrap}>
                  {quickAmounts.map((amount) => {
                    const selected = foodDraft.quantity.trim() === amount;
                    return (
                      <TouchableOpacity
                        key={amount}
                        style={[
                          styles.quickChip,
                          {
                            borderColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#444" : "#ddd"),
                            backgroundColor: selected ? themeColors.accentColor + (themeColors.mode === "dark" ? "33" : "16") : (themeColors.mode === "dark" ? "#2b2b2b" : "#fff"),
                          },
                        ]}
                        onPress={() => setFoodDraft((prev) => ({ ...prev, quantity: amount }))}
                      >
                        <Text style={[styles.quickChipText, { color: selected ? themeColors.accentColor : themeColors.textColor }]}>{amount} {foodDraft.unit}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.quickSection}>
                <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Units</Text>
                <View style={styles.unitChipRow}>
                  {MANUAL_NUTRITION_UNITS.map((unit) => {
                    const selected = foodDraft.unit.toLowerCase() === unit.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={unit}
                        style={[
                          styles.unitChip,
                          {
                            borderColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#444" : "#ddd"),
                            backgroundColor: selected ? themeColors.accentColor + (themeColors.mode === "dark" ? "33" : "16") : (themeColors.mode === "dark" ? "#2a2a2a" : "#fff"),
                          },
                        ]}
                        onPress={() => setFoodDraft((prev) => ({ ...prev, unit }))}
                      >
                        <Text style={[styles.unitChipText, { color: selected ? themeColors.accentColor : themeColors.textColor }]}>{unit}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.pantryTrackingCard, { borderColor: themeColors.mode === "dark" ? "#3b3b3b" : "#e6eaef", backgroundColor: themeColors.mode === "dark" ? "#292929" : "#f7f9fb" }]}>
                <View style={styles.pantryTrackingHeader}>
                  <Text style={[styles.quickSectionTitle, { color: themeColors.textColor }]}>Pantry Tracking</Text>
                  <Ionicons name={pantryMatch ? "checkmark-circle" : "cube-outline"} size={16} color={themeColors.accentColor} />
                </View>

                {pantryMatch ? (
                  <>
                    <Text style={[styles.pantryTrackingStatus, { color: themeColors.textColor }]}>{pantryMatch.name} is already in your pantry.</Text>
                    <Text style={[styles.pantryTrackingMeta, { color: themeColors.mode === "dark" ? "#a2a2a2" : "#6f6f6f" }]}>This log will subtract from {pantryMatch.quantity} {pantryMatch.unit} in {pantryMatch.location || "Pantry"}.</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.pantryTrackingStatus, { color: themeColors.textColor }]}>Not in pantry yet.</Text>
                    <Text style={[styles.pantryTrackingMeta, { color: themeColors.mode === "dark" ? "#a2a2a2" : "#6f6f6f" }]}>Add the package amount from the label and the app will store the remainder after this log.</Text>

                    <View style={styles.manualFoodRow}>
                      <View style={[styles.targetFieldWrap, styles.manualFoodAmountWrap]}>
                        <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>Package Amount</Text>
                        <TextInput
                          value={packageDraft.quantity}
                          onChangeText={(value) => setPackageDraft((prev) => ({ ...prev, quantity: value.replace(/[^0-9./ ]/g, "") }))}
                          keyboardType="numeric"
                          placeholder="Optional"
                          placeholderTextColor={themeColors.mode === "dark" ? "#8f8f8f" : "#aaa"}
                          style={[styles.targetFieldInput, { color: themeColors.textColor, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}
                        />
                      </View>
                      <View style={[styles.targetFieldWrap, styles.manualFoodUnitWrap]}>
                        <Text style={[styles.targetFieldLabel, { color: themeColors.textColor }]}>Pkg Unit</Text>
                        <TextInput
                          value={packageDraft.unit}
                          onChangeText={(value) => setPackageDraft((prev) => ({ ...prev, unit: value }))}
                          placeholder="g"
                          placeholderTextColor={themeColors.mode === "dark" ? "#8f8f8f" : "#aaa"}
                          style={[styles.targetFieldInput, { color: themeColors.textColor, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2e2e2e" : "#fafafa" }]}
                        />
                      </View>
                    </View>

                    <Text style={[styles.pantryTrackingMeta, { color: themeColors.mode === "dark" ? "#a2a2a2" : "#6f6f6f" }]}>
                      {packageDraft.quantity.trim().length > 0 && packageRemainingPreview !== null
                        ? packageRemainingPreview > 0
                          ? `After logging, pantry will keep about ${Number(packageRemainingPreview.toFixed(1))} ${toComparableQuantity(parseTrackingAmount(packageDraft.quantity), packageDraft.unit)?.unit || packageDraft.unit}.`
                          : "This log uses the whole package."
                        : "Leave blank if you only want to log calories without changing pantry."}
                    </Text>
                  </>
                )}
              </View>

              <View style={[styles.previewCard, { borderColor: themeColors.mode === "dark" ? "#3b3b3b" : "#e6eaef", backgroundColor: themeColors.mode === "dark" ? "#292929" : "#f7f9fb" }]}>
                <Text style={[styles.previewEyebrow, { color: themeColors.mode === "dark" ? "#a0a0a0" : "#7a7a7a" }]}>Estimate Preview</Text>
                {foodPreviewLoading ? (
                  <Text style={[styles.previewCalories, { color: themeColors.textColor }]}>Checking nutrition...</Text>
                ) : foodPreview ? (
                  <>
                    <Text style={[styles.previewCalories, { color: themeColors.textColor }]}>{Math.round(foodPreview.calories)} cal</Text>
                    <Text style={[styles.previewMacros, { color: themeColors.mode === "dark" ? "#b0b0b0" : "#616161" }]}>
                      P {Math.round(foodPreview.protein)}g • C {Math.round(foodPreview.carbs)}g • F {Math.round(foodPreview.fat)}g
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.previewMacros, { color: themeColors.mode === "dark" ? "#a0a0a0" : "#6f6f6f" }]}>Use a simple food and a realistic portion to see the calories before you log it.</Text>
                )}
              </View>

              <Text style={[styles.manualFoodHint, { color: themeColors.mode === "dark" ? "#9a9a9a" : "#6f6f6f" }]}>Tip: weights like g or oz usually give the best estimate.</Text>
            </ScrollView>
            <View style={[styles.foodModalFooter, { borderTopColor: themeColors.mode === "dark" ? "#3a3a3a" : "#ececec" }]}>
              <View style={styles.targetActionRow}>
                <TouchableOpacity style={[styles.targetActionButton, { borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", backgroundColor: themeColors.mode === "dark" ? "#2b2b2b" : "#fff" }]} onPress={() => setShowAddFoodModal(false)}>
                  <Text style={[styles.targetActionText, { color: themeColors.textColor }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.targetActionButton, { borderColor: themeColors.accentColor, backgroundColor: themeColors.accentColor }]} onPress={() => void saveManualFoodEntry()}>
                  <Text style={styles.targetPrimaryActionText}>Log Food</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
