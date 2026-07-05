import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, deleteDoc, onSnapshot, setDoc } from "firebase/firestore";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { mealPlanDoc, mealPlansCol, pantryCol, recipesCol, shoppingCol } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { checkRecipeAvailability } from "@/screens/components/utils/ingredientUtils";
import styles from "./HomeScreen.styles";

type RecipeLite = {
  id: string;
  name: string;
  cookTime?: string | number;
  ingredients: Array<{ name: string; quantity?: string | number; unit?: string }>;
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
};

type MissingSuggestion = {
  key: string;
  name: string;
  quantity: string;
  unit: string;
  recipes: string[];
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
  const [plansByDate, setPlansByDate] = useState<Record<string, string[]>>({});
  const [visibleMonth, setVisibleMonth] = useState(normalizeMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [showPlannerModal, setShowPlannerModal] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");

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
      })).filter((item) => item.name.length > 0);
      setPantryItems(nextPantry);
    });

    return () => {
      unsubscribeRecipes();
      unsubscribePlans();
      unsubscribeShopping();
      unsubscribePantry();
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
          <Text style={[styles.welcomeEyebrow, { color: themeColors.mode === "dark" ? "#9d9d9d" : "#8a8a8a" }]}>Home</Text>
          <Text style={[styles.welcomeTitle, { color: themeColors.textColor }]}>{greeting}, {firstName}</Text>
          <Text style={[styles.welcomeSubtitle, { color: themeColors.mode === "dark" ? "#b0b0b0" : "#666" }]}>Plan what to cook with a simple calendar and keep your week easy to follow.</Text>

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
        </View>

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
      </ScrollView>

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
    </View>
  );
}
