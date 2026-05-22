/**
 * Recipe List Screen - Displays all recipes (user's and public)
 * Supports filtering by dietary tags and search by title/ingredients
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Animated, TextInput, Modal } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { onSnapshot, addDoc, deleteDoc, setDoc, serverTimestamp, updateDoc, doc, query, orderBy, limit, getDoc, collection, getDocs, where } from "firebase/firestore";
import { friendRequestsCol, friendsCol, outgoingFriendRequestsCol, recipeSharesCol, recipesCol, recipesDoc, publicRecipeDoc, userDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getAuth } from "firebase/auth";
import { ThemeColors } from "@/screens/settings/ThemeCustomizerScreen";
import { RECIPE_CATEGORY_OPTIONS, RecipeBrowseCategory, getRecipeBrowseCategory, matchesSearch } from "@/screens/utils/categorization";
import styles from "./RecipeListScreen.styles";
import RecipeFormScreen from "./RecipeFormScreen";

// Dietary restrictions with their allowed ingredients
const DIETARY_RESTRICTIONS: Record<string, { name: string; allowedIngredients: string[] }> = {
  vegan: {
    name: "Vegan",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds"
    ]
  },
  vegetarian: {
    name: "Vegetarian",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds",
      "eggs", "cheese", "parmesan cheese", "milk", "butter", "yogurt"
    ]
  },
  glutenfree: {
    name: "Gluten-Free",
    allowedIngredients: [
      "rice", "sugar", "salt", "pepper", "black pepper", "olive oil",
      "oil", "garlic", "onion", "tomato", "canned tomato", "bell pepper",
      "basil", "lettuce", "lemon", "vegetable", "carrot", "broccoli",
      "spinach", "mushroom", "bean", "chickpea", "eggs", "cheese",
      "parmesan cheese", "milk", "butter", "yogurt", "chicken", "chicken breast",
      "salmon", "fish", "beef", "ground beef", "meat", "soy sauce", "vinegar"
    ]
  },
  dairyfree: {
    name: "Dairy-Free",
    allowedIngredients: [
      "pasta", "rice", "flour", "sugar", "salt", "pepper", "black pepper",
      "olive oil", "oil", "garlic", "onion", "tomato", "canned tomato",
      "bell pepper", "basil", "lettuce", "lemon", "vegetable", "carrot",
      "broccoli", "spinach", "mushroom", "bean", "chickpea", "tofu",
      "soy sauce", "vinegar", "herbs", "spices", "nuts", "seeds",
      "chicken", "chicken breast", "salmon", "fish", "beef", "ground beef", "meat", "eggs"
    ]
  }
};

type Recipe = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: unknown;
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: unknown;
  servings: string | number;
  cookTime: string | number;
  difficulty: string;
  visibility?: "private" | "public";
  ingredients: Array<{ id?: number; name: string; quantity: string; unit: string }>;
  instructions: string[];
};

type SharedRecipeInvite = {
  id: string;
  fromUserId: string;
  fromDisplayName?: string;
  recipeOwnerId?: string;
  recipeId?: string;
  recipeName: string;
  recipeImageUrl?: string;
  recipeDescription?: string;
  recipeCookTime?: string | number;
  recipeServings?: string | number;
  recipeDifficulty?: string;
  recipeIngredientsDetailed?: Array<{ name: string; quantity?: string | number; unit?: string }>;
  recipeInstructions?: string[];
  ingredients?: Array<{ name: string; quantity?: string | number; unit?: string }>;
  instructions?: string[];
  description?: string;
  imageUrl?: string;
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: unknown;
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: unknown;
  status?: string;
};

type ImporterProfilePreview = {
  userId: string;
  displayName: string;
  handle: string;
  allergies: string[];
  publicRecipes: Array<{
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    sourceUrl?: string;
    ingredients?: Array<{ name: string; quantity?: string | number; unit?: string }>;
    instructions?: string[];
    cookTime?: string | number;
    difficulty?: string;
  }>;
};

interface RecipeListScreenProps {
  onRecipeSelect?: (recipeId: string) => void;
  theme?: ThemeColors;
  userAllergies?: string[];
  showRecipeForm?: boolean;
  setShowRecipeForm?: (show: boolean) => void;
  onBackToAddChoice?: () => void;
}

export default function RecipeListScreen({ onRecipeSelect, theme, userAllergies = [], showRecipeForm = false, setShowRecipeForm = () => {}, onBackToAddChoice }: RecipeListScreenProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>([]);
  const [filterByAllergies, setFilterByAllergies] = useState(false);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<RecipeBrowseCategory>("all");
  const [toast, setToast] = useState<{ message: string; success: boolean } | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [pendingShares, setPendingShares] = useState<SharedRecipeInvite[]>([]);
  const [selectedShare, setSelectedShare] = useState<SharedRecipeInvite | null>(null);
  const [shareActionBusyId, setShareActionBusyId] = useState<string | null>(null);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());
  const [showImporterProfileModal, setShowImporterProfileModal] = useState(false);
  const [loadingImporterProfile, setLoadingImporterProfile] = useState(false);
  const [selectedImporterProfile, setSelectedImporterProfile] = useState<ImporterProfilePreview | null>(null);
  const [selectedImporterRecipe, setSelectedImporterRecipe] = useState<ImporterProfilePreview["publicRecipes"][number] | null>(null);
  const recipeSearchInputRef = useRef<any>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleRecipeSearchChange = (value: string) => {
    setSearchQuery(value);
    requestAnimationFrame(() => {
      recipeSearchInputRef.current?.focus?.();
    });
  };

  const showToast = (message: string, success: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, success });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";

  const themeColors = theme || {
    mode: "light",
    textColor: "#333",
    accentColor: "#4CAF50",
    backgroundColor: "#f5f5f5",
  };

  // Load recipes from Firestore with real-time listener
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = onSnapshot(recipesCol(userId), (snapshot) => {
      const firestoreRecipes = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
        imageUrl: doc.data().imageUrl || "",
        sourceUrl: doc.data().sourceUrl || "",
        originType: doc.data().originType,
        originalCreatorUserId: doc.data().originalCreatorUserId,
        originalCreatorDisplayName: doc.data().originalCreatorDisplayName,
        originalCreatedAt: doc.data().originalCreatedAt,
        originalImporterUserId: doc.data().originalImporterUserId,
        originalImporterDisplayName: doc.data().originalImporterDisplayName,
        originalImportedAt: doc.data().originalImportedAt,
        servings: doc.data().servings,
        cookTime: doc.data().cookTime,
        difficulty: doc.data().difficulty,
        visibility: doc.data().visibility || "private",
        ingredients: doc.data().ingredients,
        instructions: doc.data().instructions,
      } as Recipe));
      
      setRecipeList(firestoreRecipes);
    }, (error) => {
      console.error("Error loading recipes:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const unsubFriends = onSnapshot(friendsCol(userId), (snapshot) => {
      setFriendIds(new Set(snapshot.docs.map((docSnap) => docSnap.id)));
    });

    const unsubOutgoing = onSnapshot(outgoingFriendRequestsCol(userId), (snapshot) => {
      setOutgoingIds(new Set(snapshot.docs.map((docSnap) => docSnap.id)));
    });

    return () => {
      unsubFriends();
      unsubOutgoing();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const sharesQuery = query(recipeSharesCol(userId), orderBy("createdAt", "desc"), limit(40));
    const unsubscribe = onSnapshot(sharesQuery, (snapshot) => {
      const mapped = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<SharedRecipeInvite, "id">) }))
        .filter((share) => (share.status || "pending") === "pending");
      setPendingShares(mapped);
    }, (error) => {
      console.error("Error loading shared recipes:", error);
    });

    return () => unsubscribe();
  }, [userId]);

  // Check if a recipe matches all selected dietary restrictions
  const recipeMatchesDiets = (recipe: Recipe, dietKeys: string[]): boolean => {
    if (dietKeys.length === 0) return true;

    return dietKeys.every((dietKey) => {
      const diet = DIETARY_RESTRICTIONS[dietKey];
      if (!diet) return true;

      return recipe.ingredients.every((ingredient) => {
        const ingredientName = ingredient.name.toLowerCase().trim();
        return diet.allowedIngredients.some((allowed) => ingredientName.includes(allowed));
      });
    });
  };

  // Check if a recipe is safe for user allergies
  const recipeSafeForAllergies = (recipe: Recipe): boolean => {
    if (userAllergies.length === 0) return true;

    return recipe.ingredients.every((ingredient) => {
      const ingredientName = ingredient.name.toLowerCase().trim();
      return !userAllergies.some((allergen) => ingredientName.includes(allergen.toLowerCase()));
    });
  };

  const filteredRecipes = useMemo(() => {
    let next = selectedDiets.length > 0
      ? recipeList.filter((recipe) => recipeMatchesDiets(recipe, selectedDiets))
      : recipeList;

    if (filterByAllergies && userAllergies.length > 0) {
      next = next.filter((recipe) => recipeSafeForAllergies(recipe));
    }

    next = next.filter((recipe) => {
      const derivedCategory = getRecipeBrowseCategory({
        name: recipe.name,
        description: recipe.description,
        ingredients: recipe.ingredients,
      });

      const categoryMatches = selectedCategory === "all" || derivedCategory === selectedCategory;
      const searchMatches = matchesSearch(
        [
          recipe.name,
          recipe.description || "",
          recipe.difficulty,
          recipe.cookTime,
          recipe.servings,
          ...recipe.ingredients.map((ingredient) => ingredient.name),
          derivedCategory,
        ],
        searchQuery
      );

      return categoryMatches && searchMatches;
    });

    return next;
  }, [filterByAllergies, recipeList, searchQuery, selectedCategory, selectedDiets, userAllergies]);

  const getSourceHost = (url?: string) => {
    if (!url) return "";
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const getOriginAttribution = (recipe: Recipe) => {
    const isImported = recipe.originType === "imported" || !!recipe.sourceUrl;
    if (isImported) {
      const importer = recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || "Unknown";
      return `Imported by ${importer}`;
    }
    const creator = recipe.originalCreatorDisplayName || recipe.originalImporterDisplayName || "Unknown";
    return `Created by ${creator}`;
  };

  const openImporterProfile = async (recipe: Recipe) => {
    const importerUserId = recipe.originalImporterUserId || recipe.originalCreatorUserId || "";
    if (!importerUserId) {
      Alert.alert("Profile unavailable", "No importer profile is available for this recipe.");
      return;
    }

    setShowImporterProfileModal(true);
    setLoadingImporterProfile(true);
    try {
      const profileSnap = await getDoc(userDoc(importerUserId));
      const profileData = profileSnap.data() as { displayName?: string; email?: string; allergies?: unknown[] } | undefined;
      const displayName = profileData?.displayName || profileData?.email?.split("@")[0] || recipe.originalImporterDisplayName || recipe.originalCreatorDisplayName || "Insert User";
      const handle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`;
      const allergies = Array.isArray(profileData?.allergies)
        ? profileData.allergies.filter((value): value is string => typeof value === "string")
        : [];

      const publicRecipesSnap = await getDocs(query(collection(db, "publicRecipes"), where("ownerId", "==", importerUserId), limit(12)));
      const publicRecipes = publicRecipesSnap.docs.map((docSnap) => {
        const data = docSnap.data() as {
          name?: string;
          description?: string;
          imageUrl?: string;
          sourceUrl?: string;
          ingredients?: Array<{ name: string; quantity?: string | number; unit?: string }>;
          instructions?: string[];
          cookTime?: string | number;
          difficulty?: string;
        };
        return {
          id: docSnap.id,
          name: data.name || "Recipe",
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          sourceUrl: data.sourceUrl || "",
          ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
          instructions: Array.isArray(data.instructions) ? data.instructions : [],
          cookTime: data.cookTime,
          difficulty: data.difficulty,
        };
      });

      setSelectedImporterProfile({
        userId: importerUserId,
        displayName,
        handle,
        allergies,
        publicRecipes,
      });
    } catch (error) {
      console.error("Importer profile load failed:", error);
      Alert.alert("Profile unavailable", "Could not load this profile right now.");
    } finally {
      setLoadingImporterProfile(false);
    }
  };

  const sendFriendRequestToImporter = async () => {
    if (!selectedImporterProfile?.userId || !userId) return;
    const targetUserId = selectedImporterProfile.userId;
    if (targetUserId === userId) {
      Alert.alert("This is you", "You cannot add yourself as a friend.");
      return;
    }
    if (friendIds.has(targetUserId)) {
      Alert.alert("Already friends", `You are already connected with ${selectedImporterProfile.displayName}.`);
      return;
    }
    if (outgoingIds.has(targetUserId)) {
      Alert.alert("Request pending", "You already sent a friend request.");
      return;
    }

    const senderDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert User";
    const senderHandleRoot = senderDisplayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser";

    try {
      await setDoc(doc(friendRequestsCol(targetUserId), userId), {
        fromUserId: userId,
        fromDisplayName: senderDisplayName,
        fromHandle: `@${senderHandleRoot}`,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(outgoingFriendRequestsCol(userId), targetUserId), {
        toUserId: targetUserId,
        toDisplayName: selectedImporterProfile.displayName,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Friend request sent", `Request sent to ${selectedImporterProfile.displayName}.`);
    } catch (error) {
      console.error("Friend request failed:", error);
      Alert.alert("Request failed", "Could not send friend request right now.");
    }
  };


  const handleRecipeSaved = async (newRecipe: any) => {
    try {
      const currentDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert Chef";
      const sourceUrl = newRecipe.sourceUrl || "";
      const originType: "created" | "imported" = sourceUrl ? "imported" : "created";
      const recipeDocRef = await addDoc(recipesCol(userId), {
        userId,
        name: newRecipe.name,
        description: newRecipe.description || "",
        imageUrl: newRecipe.imageUrl || "",
        sourceUrl,
        servings: newRecipe.servings,
        cookTime: newRecipe.cookTime,
        difficulty: newRecipe.difficulty,
        visibility: newRecipe.visibility || "private",
        ingredients: newRecipe.ingredients,
        instructions: newRecipe.instructions,
        originType,
        originalCreatorUserId: newRecipe.originalCreatorUserId || userId,
        originalCreatorDisplayName: newRecipe.originalCreatorDisplayName || currentDisplayName,
        originalCreatedAt: newRecipe.originalCreatedAt || serverTimestamp(),
        originalImporterUserId: sourceUrl ? (newRecipe.originalImporterUserId || userId) : (newRecipe.originalImporterUserId || ""),
        originalImporterDisplayName: sourceUrl ? (newRecipe.originalImporterDisplayName || currentDisplayName) : (newRecipe.originalImporterDisplayName || ""),
        originalImportedAt: sourceUrl ? (newRecipe.originalImportedAt || serverTimestamp()) : (newRecipe.originalImportedAt || null),
        createdAt: serverTimestamp(),
      });
      if ((newRecipe.visibility || "private") === "public") {
        await setDoc(publicRecipeDoc(recipeDocRef.id), {
          recipeId: recipeDocRef.id,
          ownerId: userId,
          ownerName: auth.currentUser?.displayName || auth.currentUser?.email || "Insert Chef",
          ownerHandle: auth.currentUser?.email || "",
          name: newRecipe.name,
          description: newRecipe.description || "",
          imageUrl: newRecipe.imageUrl || "",
          sourceUrl,
          servings: newRecipe.servings,
          cookTime: newRecipe.cookTime,
          difficulty: newRecipe.difficulty,
          visibility: "public",
          ingredients: newRecipe.ingredients,
          instructions: newRecipe.instructions,
          originType,
          originalCreatorUserId: newRecipe.originalCreatorUserId || userId,
          originalCreatorDisplayName: newRecipe.originalCreatorDisplayName || currentDisplayName,
          originalCreatedAt: newRecipe.originalCreatedAt || serverTimestamp(),
          originalImporterUserId: sourceUrl ? (newRecipe.originalImporterUserId || userId) : (newRecipe.originalImporterUserId || ""),
          originalImporterDisplayName: sourceUrl ? (newRecipe.originalImporterDisplayName || currentDisplayName) : (newRecipe.originalImporterDisplayName || ""),
          originalImportedAt: sourceUrl ? (newRecipe.originalImportedAt || serverTimestamp()) : (newRecipe.originalImportedAt || null),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
      setShowRecipeForm(false);
      showToast(`"${newRecipe.name}" saved!`, true);
    } catch (error) {
      showToast("Failed to save recipe. Try again.", false);
    }
  };

  const syncPublicRecipe = async (recipeId: string, recipeData: any) => {
    if ((recipeData.visibility || "private") === "public") {
      const currentDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert Chef";
      const sourceUrl = recipeData.sourceUrl || "";
      const originType: "created" | "imported" = recipeData.originType || (sourceUrl ? "imported" : "created");
      await setDoc(publicRecipeDoc(recipeId), {
        recipeId,
        ownerId: userId,
        ownerName: auth.currentUser?.displayName || auth.currentUser?.email || "Insert Chef",
        ownerHandle: auth.currentUser?.email || "",
        name: recipeData.name,
        description: recipeData.description || "",
        imageUrl: recipeData.imageUrl || "",
        sourceUrl,
        servings: recipeData.servings,
        cookTime: recipeData.cookTime,
        difficulty: recipeData.difficulty,
        visibility: "public",
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        originType,
        originalCreatorUserId: recipeData.originalCreatorUserId || userId,
        originalCreatorDisplayName: recipeData.originalCreatorDisplayName || currentDisplayName,
        originalCreatedAt: recipeData.originalCreatedAt || serverTimestamp(),
        originalImporterUserId: sourceUrl ? (recipeData.originalImporterUserId || userId) : (recipeData.originalImporterUserId || ""),
        originalImporterDisplayName: sourceUrl ? (recipeData.originalImporterDisplayName || currentDisplayName) : (recipeData.originalImporterDisplayName || ""),
        originalImportedAt: sourceUrl ? (recipeData.originalImportedAt || serverTimestamp()) : (recipeData.originalImportedAt || null),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return;
    }

    await deleteDoc(publicRecipeDoc(recipeId)).catch(() => undefined);
  };

  const getShareMatchedAllergies = (share: SharedRecipeInvite) => {
    if (!userAllergies.length) return [] as string[];
    const ingredientNames = (share.recipeIngredientsDetailed || []).map((ingredient) => ingredient.name || "").join(" ").toLowerCase();
    return userAllergies.filter((allergy) => ingredientNames.includes(String(allergy).toLowerCase()));
  };

  const markShareStatus = async (shareId: string, status: "accepted" | "denied") => {
    await updateDoc(doc(recipeSharesCol(userId), shareId), {
      status,
      decidedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const acceptSharedRecipe = async (share: SharedRecipeInvite) => {
    if (!userId || !share?.id || shareActionBusyId) return;
    setShareActionBusyId(share.id);
    try {
      let description = share.recipeDescription || share.description || "";
      let imageUrl = share.recipeImageUrl || share.imageUrl || "";
      let sourceUrl = share.sourceUrl || "";
      let servings: string | number = share.recipeServings || "";
      let cookTime: string | number = share.recipeCookTime || "";
      let difficulty = share.recipeDifficulty || "easy";

      let ingredients = (share.recipeIngredientsDetailed || share.ingredients || []).map((ingredient, index) => ({
        id: index + 1,
        name: ingredient.name || "",
        quantity: String(ingredient.quantity ?? ""),
        unit: String(ingredient.unit ?? ""),
      })).filter((ingredient) => ingredient.name.trim().length > 0);

      let instructions = Array.isArray(share.recipeInstructions || share.instructions)
        ? (share.recipeInstructions || share.instructions || []).filter((step) => typeof step === "string" && step.trim().length > 0)
        : [];

      // Backfill missing payload from source recipe when older/incomplete share docs are accepted.
      if ((ingredients.length === 0 || instructions.length === 0 || !description) && share.recipeOwnerId && share.recipeId) {
        const sourceSnap = await getDoc(recipesDoc(share.recipeOwnerId, share.recipeId));
        if (sourceSnap.exists()) {
          const src = sourceSnap.data() as any;
          if (!description) description = src.description || "";
          if (!imageUrl) imageUrl = src.imageUrl || "";
          if (!sourceUrl) sourceUrl = src.sourceUrl || "";
          if (!servings) servings = src.servings || "";
          if (!cookTime) cookTime = src.cookTime || "";
          if (!difficulty) difficulty = src.difficulty || "easy";

          if (ingredients.length === 0 && Array.isArray(src.ingredients)) {
            ingredients = src.ingredients
              .map((ingredient: any, index: number) => ({
                id: index + 1,
                name: ingredient?.name || "",
                quantity: String(ingredient?.quantity ?? ""),
                unit: String(ingredient?.unit ?? ""),
              }))
              .filter((ingredient: { name: string }) => ingredient.name.trim().length > 0);
          }

          if (instructions.length === 0 && Array.isArray(src.instructions)) {
            instructions = src.instructions.filter((step: unknown): step is string => typeof step === "string" && step.trim().length > 0);
          }
        }
      }

      const currentDisplayName = auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Insert Chef";
      const sourceUrlForRecipe = sourceUrl || "";
      const originType: "created" | "imported" = share.originType || (sourceUrlForRecipe ? "imported" : "created");
      const originalCreatorUserId = share.originalCreatorUserId || share.recipeOwnerId || share.fromUserId || "";
      const originalCreatorDisplayName = share.originalCreatorDisplayName || share.fromDisplayName || "Insert Chef";
      const originalImporterUserId = originType === "imported"
        ? (share.originalImporterUserId || share.recipeOwnerId || share.fromUserId || "")
        : "";
      const originalImporterDisplayName = originType === "imported"
        ? (share.originalImporterDisplayName || share.fromDisplayName || "Insert Chef")
        : "";

      await addDoc(recipesCol(userId), {
        userId,
        name: share.recipeName || "Shared Recipe",
        description,
        imageUrl,
        sourceUrl,
        servings,
        cookTime,
        difficulty,
        visibility: "private",
        ingredients,
        instructions,
        originType,
        originalCreatorUserId,
        originalCreatorDisplayName,
        originalCreatedAt: share.originalCreatedAt || serverTimestamp(),
        originalImporterUserId,
        originalImporterDisplayName,
        originalImportedAt: originType === "imported" ? (share.originalImportedAt || serverTimestamp()) : null,
        importedFromShare: true,
        sharedByUserId: share.fromUserId || "",
        sharedByDisplayName: share.fromDisplayName || "",
        sharedAt: serverTimestamp(),
      });

      await markShareStatus(share.id, "accepted");
      setSelectedShare(null);
      showToast(`Added "${share.recipeName}" to your recipes.`, true);
    } catch (error) {
      console.error("Accept shared recipe failed:", error);
      showToast("Could not add shared recipe right now.", false);
    } finally {
      setShareActionBusyId(null);
    }
  };

  const denySharedRecipe = async (share: SharedRecipeInvite) => {
    if (!userId || !share?.id || shareActionBusyId) return;
    setShareActionBusyId(share.id);
    try {
      await markShareStatus(share.id, "denied");
      if (selectedShare?.id === share.id) setSelectedShare(null);
      showToast("Shared recipe request denied.", true);
    } catch (error) {
      console.error("Deny shared recipe failed:", error);
      showToast("Could not deny request right now.", false);
    } finally {
      setShareActionBusyId(null);
    }
  };

  const handleDeleteRecipeFromList = (recipe: Recipe) => {
    Alert.alert(
      "Delete Recipe",
      `Delete "${recipe.name}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(recipesDoc(userId, recipe.id));
            await deleteDoc(publicRecipeDoc(recipe.id)).catch(() => undefined);
            showToast(`"${recipe.name}" deleted.`, true);
          } catch {
            showToast("Failed to delete.", false);
          }
        }},
      ]
    );
  };

  return (
    <>
      <RecipeFormScreen
        visible={showRecipeForm}
        editRecipeId={editingRecipe?.id}
        initialData={editingRecipe ? {
          name: editingRecipe.name,
          description: editingRecipe.description || "",
          imageUrl: editingRecipe.imageUrl || "",
          sourceUrl: editingRecipe.sourceUrl || "",
          servings: String(editingRecipe.servings || ""),
          cookTime: String(editingRecipe.cookTime || ""),
          difficulty: editingRecipe.difficulty || "easy",
          visibility: editingRecipe.visibility || "private",
          ingredients: editingRecipe.ingredients.map((ing, i) => ({ id: i + 1, name: ing.name, quantity: String(ing.quantity || "1"), unit: ing.unit || "" })),
          instructions: editingRecipe.instructions.length > 0 ? editingRecipe.instructions : [""],
        } : undefined}
        onRecipeSaved={editingRecipe ? async (savedRecipe) => {
          try {
            await syncPublicRecipe(editingRecipe.id, savedRecipe);
          } catch {
            showToast("Recipe saved, but public sharing could not be updated.", false);
          }
          showToast(`"${editingRecipe.name}" updated!`, true);
          setEditingRecipe(null);
          setShowRecipeForm(false);
        } : handleRecipeSaved}
        onCancel={() => { setEditingRecipe(null); setShowRecipeForm(false); }}
        onBack={editingRecipe ? undefined : onBackToAddChoice}
        theme={themeColors}
        existingRecipeNames={editingRecipe ? [] : recipeList.map(r => r.name)}
      />
    <ScrollView style={[styles.container, { backgroundColor: themeColors.backgroundColor }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.header}>
        <Text style={[styles.title, { color: themeColors.textColor }]}>Recipes</Text>
      </View>

      {pendingShares.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: themeColors.accentColor + "55", backgroundColor: themeColors.mode === "dark" ? "#243024" : "#edf8ef", padding: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="mail-unread-outline" size={17} color={themeColors.accentColor} />
              <Text style={{ color: themeColors.textColor, fontWeight: "700" }}>Shared Recipes</Text>
            </View>
            <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: themeColors.accentColor, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{pendingShares.length}</Text>
            </View>
          </View>

          {pendingShares.slice(0, 3).map((share) => {
            const matchedAllergies = getShareMatchedAllergies(share);
            return (
              <View key={share.id} style={{ borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#395239" : "#cde9d0", borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: themeColors.mode === "dark" ? "#1d281d" : "#fff" }}>
                <Text style={{ color: themeColors.textColor, fontWeight: "700" }} numberOfLines={1}>{share.recipeName || "Shared recipe"}</Text>
                <Text style={{ color: themeColors.mode === "dark" ? "#b8b8b8" : "#6f6f6f", marginTop: 2 }} numberOfLines={1}>
                  From {share.fromDisplayName || "a friend"}
                </Text>
                {matchedAllergies.length > 0 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <Text style={{ color: "#c62828", fontWeight: "700", flex: 1 }} numberOfLines={2}>
                      Allergy match: {matchedAllergies.join(", ")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => Alert.alert(
                        "Allergy warning note",
                        "This allergy match is based on ingredient-name text and may not be 100% exact. Always verify full ingredients before cooking."
                      )}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="information-circle-outline" size={14} color="#c62828" />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedShare(share)}
                    style={{ borderRadius: 8, borderWidth: 1, borderColor: themeColors.accentColor, paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <Text style={{ color: themeColors.accentColor, fontWeight: "700" }}>Review</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={shareActionBusyId === share.id}
                    onPress={() => acceptSharedRecipe(share)}
                    style={{ borderRadius: 8, backgroundColor: themeColors.accentColor, paddingHorizontal: 10, paddingVertical: 7, opacity: shareActionBusyId === share.id ? 0.7 : 1 }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{shareActionBusyId === share.id ? "Adding..." : "Accept"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={shareActionBusyId === share.id}
                    onPress={() => denySharedRecipe(share)}
                    style={{ borderRadius: 8, borderWidth: 1, borderColor: "#ef9a9a", paddingHorizontal: 10, paddingVertical: 7 }}
                  >
                    <Text style={{ color: "#c62828", fontWeight: "700" }}>Deny</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {pendingShares.length > 3 && (
            <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 2 }}>
              +{pendingShares.length - 3} more pending shares
            </Text>
          )}
        </View>
      )}

      <View style={[styles.searchSection, { borderBottomColor: themeColors.mode === "dark" ? "#333" : "#ececec" }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: themeColors.mode === "dark" ? "#2a2a2a" : "#fff", borderColor: themeColors.mode === "dark" ? "#444" : "#e3e3e3" }]}>
          <Text style={[styles.searchIcon, { color: themeColors.mode === "dark" ? "#888" : "#999" }]}>⌕</Text>
          <TextInput
            ref={recipeSearchInputRef}
            style={[styles.searchInput, { color: themeColors.textColor }]}
            placeholder="Search recipes, ingredients, difficulty..."
            placeholderTextColor={themeColors.mode === "dark" ? "#777" : "#aaa"}
            value={searchQuery}
            onChangeText={handleRecipeSearchChange}
            blurOnSubmit={false}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchButton}>
              <Text style={[styles.clearSearchText, { color: themeColors.mode === "dark" ? "#bbb" : "#888" }]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={[styles.sectionLabel, { color: themeColors.mode === "dark" ? "#cfcfcf" : "#6c6c6c" }]}>Meal Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {RECIPE_CATEGORY_OPTIONS.map((category) => {
            const selected = selectedCategory === category.key;
            return (
              <TouchableOpacity
                key={category.key}
                onPress={() => setSelectedCategory(category.key)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: selected ? themeColors.accentColor : (themeColors.mode === "dark" ? "#2a2a2a" : "#f5f5f5"),
                    borderColor: "transparent",
                  },
                ]}
              >
                {selected && <Ionicons name="checkmark-circle" size={14} color="#fff" style={{ marginRight: 4 }} />}
                <Text style={[styles.categoryChipText, { color: selected ? "#fff" : themeColors.textColor, fontWeight: selected ? "700" : "500" }]}>{category.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 16, color: themeColors.mode === "dark" ? "#cfcfcf" : "#6c6c6c" }]}>Dietary Preferences</Text>
      {/* Dietary Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={[
            styles.filterButton,
            selectedDiets.length === 0 && { backgroundColor: themeColors.accentColor },
            selectedDiets.length === 0 && { borderColor: themeColors.accentColor },
            selectedDiets.length > 0 && { backgroundColor: "transparent", borderColor: "#ccc" }
          ]}
          onPress={() => setSelectedDiets([])}
        >
          <Text style={[styles.filterButtonText, selectedDiets.length === 0 && { color: "#fff" }, selectedDiets.length > 0 && { color: themeColors.textColor }]}>
            All Diets
          </Text>
        </TouchableOpacity>

        {Object.entries(DIETARY_RESTRICTIONS).map(([key, diet]) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.filterButton,
              selectedDiets.includes(key) && { backgroundColor: themeColors.accentColor },
              selectedDiets.includes(key) && { borderColor: themeColors.accentColor },
              !selectedDiets.includes(key) && { backgroundColor: "transparent", borderColor: "#ccc" }
            ]}
            onPress={() => {
              if (selectedDiets.includes(key)) {
                setSelectedDiets(selectedDiets.filter(d => d !== key));
              } else {
                setSelectedDiets([...selectedDiets, key]);
              }
            }}
          >
            <Text style={[styles.filterButtonText, selectedDiets.includes(key) && { color: "#fff" }, !selectedDiets.includes(key) && { color: themeColors.textColor }]}>
              {diet.name}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Allergies Filter Button */}
        {userAllergies.length > 0 && (
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterByAllergies && { backgroundColor: "#ff6b6b" },
              filterByAllergies && { borderColor: "#ff6b6b" },
              !filterByAllergies && { backgroundColor: "transparent", borderColor: "#ccc" }
            ]}
            onPress={() => setFilterByAllergies(!filterByAllergies)}
          >
            <Text style={[styles.filterButtonText, filterByAllergies && { color: "#fff" }, !filterByAllergies && { color: themeColors.textColor }]}>
              Safe 🚫
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: themeColors.textColor }]}>
            {selectedDiets.length > 0 || selectedCategory !== "all" || searchQuery ? "No recipes match this search" : "No recipes yet"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedDiets.length > 0 || selectedCategory !== "all" || searchQuery ? "Try another category, adjust the search, or remove a filter" : "Add your first recipe to get started"}
          </Text>
        </View>
      ) : (
        filteredRecipes.map((recipe) => (
          <TouchableOpacity 
            key={recipe.id} 
            style={[styles.recipeCard, { backgroundColor: themeColors.mode === "dark" ? "#333" : "#fff" }]}
            onPress={() => onRecipeSelect?.(recipe.id)}
            onLongPress={() => Alert.alert(
              recipe.name || "Recipe",
              "What would you like to do?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Edit Recipe", onPress: () => { setEditingRecipe(recipe); setShowRecipeForm(true); } },
                { text: "Delete Recipe", style: "destructive", onPress: () => handleDeleteRecipeFromList(recipe) },
              ]
            )}
            delayLongPress={400}
          >
            <View style={styles.recipeTopRow}>
              {recipe.imageUrl ? (
                <Image
                  source={{ uri: recipe.imageUrl }}
                  contentFit="cover"
                  transition={280}
                  style={styles.recipeThumb}
                />
              ) : (
                <View style={[styles.recipeThumb, styles.recipeThumbFallback, { backgroundColor: themeColors.mode === "dark" ? "#3a342f" : "#FFE8D9" }]}>
                  <Ionicons name="restaurant-outline" size={20} color={themeColors.accentColor} />
                </View>
              )}
              <View style={styles.recipeTopContent}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <Text style={[styles.recipeName, { color: themeColors.textColor, flex: 1 }]} numberOfLines={2}>{recipe.name}</Text>
                  <Ionicons name="ellipsis-horizontal" size={16} color={themeColors.mode === "dark" ? "#666" : "#ccc"} style={{ marginTop: 2, marginLeft: 8 }} />
                </View>
                {recipe.description && (
                  <Text style={[styles.recipeDescription, { color: themeColors.textColor }]} numberOfLines={3}>{recipe.description}</Text>
                )}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <View style={[styles.recipeMetaChip, { backgroundColor: themeColors.mode === "dark" ? "#2c2535" : "#f3efff" }]}>
                    <Text style={[styles.recipeMetaChipText, { color: themeColors.accentColor }]}>{recipe.visibility || "private"}</Text>
                  </View>
                  {!!recipe.sourceUrl && (
                    <View style={[styles.recipeMetaChip, { backgroundColor: themeColors.mode === "dark" ? "#2a3439" : "#eef8ff" }]}>
                      <Text style={[styles.recipeMetaChipText, { color: themeColors.mode === "dark" ? "#8fd6ff" : "#0d6ea8" }]} numberOfLines={1}>
                        Source: {getSourceHost(recipe.sourceUrl)}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => openImporterProfile(recipe)}
                    style={[styles.recipeMetaChip, { backgroundColor: themeColors.mode === "dark" ? "#342a2a" : "#fff2ef" }]}
                  >
                    <Text style={[styles.recipeMetaChipText, { color: themeColors.mode === "dark" ? "#ffb39f" : "#a8432d" }]} numberOfLines={1}>
                      {getOriginAttribution(recipe)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.recipeMetaRow}>
              <View style={[styles.recipeMetaChip, { backgroundColor: themeColors.mode === "dark" ? "#243326" : "#edf8ef" }]}>
                <Text style={[styles.recipeMetaChipText, { color: themeColors.accentColor }]}>
                  {RECIPE_CATEGORY_OPTIONS.find((option) => option.key === getRecipeBrowseCategory({ name: recipe.name, description: recipe.description, ingredients: recipe.ingredients }))?.label ?? "Dinner"}
                </Text>
              </View>
            </View>
            <View style={styles.recipeInfo}>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Cook: {recipe.cookTime ? `${recipe.cookTime} min` : "--"}</Text>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Servings: {recipe.servings || "--"}</Text>
              <Text style={[styles.infoText, { color: themeColors.textColor }]}>Difficulty: {recipe.difficulty}</Text>
            </View>
            <Text style={[styles.ingredients, { color: themeColors.textColor }]}>
              Ingredients: {recipe.ingredients.length} items
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>

    <Modal visible={!!selectedShare} transparent animationType="fade" onRequestClose={() => setSelectedShare(null)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 16 }}>
        <View style={{ maxHeight: "88%", borderRadius: 16, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#202020" : "#fff" }}>
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
            <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700" }}>
              {selectedShare?.recipeName || "Shared recipe"}
            </Text>
            <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 4 }}>
              Shared by {selectedShare?.fromDisplayName || "a friend"}
            </Text>
            <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 3 }}>
              {selectedShare?.originType === "imported"
                ? `Original importer: ${selectedShare?.originalImporterDisplayName || selectedShare?.fromDisplayName || "Unknown"}`
                : `Original creator: ${selectedShare?.originalCreatorDisplayName || selectedShare?.fromDisplayName || "Unknown"}`}
            </Text>
            {!!selectedShare?.sourceUrl && (
              <Text style={{ color: themeColors.accentColor, marginTop: 3 }} numberOfLines={1}>
                Source: {selectedShare.sourceUrl}
              </Text>
            )}

            {!!selectedShare?.recipeImageUrl && (
              <Image source={{ uri: selectedShare.recipeImageUrl }} contentFit="cover" transition={200} style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 12 }} />
            )}

            {!!selectedShare?.recipeDescription && (
              <Text style={{ color: themeColors.textColor, marginTop: 12, lineHeight: 20 }}>
                {selectedShare.recipeDescription}
              </Text>
            )}

            {(() => {
              const matched = selectedShare ? getShareMatchedAllergies(selectedShare) : [];
              if (matched.length === 0) return null;
              return (
                <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: "#f4b5b5", backgroundColor: "#fff5f5", padding: 10 }}>
                  <Text style={{ color: "#b71c1c", fontWeight: "800" }}>Allergy warning</Text>
                  <Text style={{ color: "#b71c1c", marginTop: 4 }}>
                    This recipe may contain: {matched.join(", ")}
                  </Text>
                </View>
              );
            })()}

            <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Ingredients</Text>
            {(selectedShare?.recipeIngredientsDetailed || []).length === 0 ? (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No ingredient list included.</Text>
            ) : (
              (selectedShare?.recipeIngredientsDetailed || []).map((ingredient, index) => {
                const lowerName = String(ingredient.name || "").toLowerCase();
                const allergyHit = userAllergies.some((allergy) => lowerName.includes(String(allergy).toLowerCase()));
                return (
                  <View key={`${ingredient.name}-${index}`} style={{ borderRadius: 8, borderWidth: 1, borderColor: allergyHit ? "#ef9a9a" : (themeColors.mode === "dark" ? "#3a3a3a" : "#ececec"), backgroundColor: allergyHit ? "#fff5f5" : "transparent", paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 }}>
                    <Text style={{ color: allergyHit ? "#b71c1c" : themeColors.textColor, fontWeight: allergyHit ? "700" : "500" }}>
                      {String(ingredient.quantity ?? "")} {String(ingredient.unit ?? "")} {ingredient.name}
                    </Text>
                  </View>
                );
              })
            )}

            <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Steps</Text>
            {(selectedShare?.recipeInstructions || []).length === 0 ? (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No steps included.</Text>
            ) : (
              (selectedShare?.recipeInstructions || []).map((step, index) => (
                <View key={`step-${index}`} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ color: themeColors.accentColor, fontWeight: "800", marginRight: 8 }}>{index + 1}.</Text>
                  <Text style={{ color: themeColors.textColor, flex: 1, lineHeight: 20 }}>{step}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: themeColors.mode === "dark" ? "#343434" : "#ededed" }}>
            <TouchableOpacity onPress={() => setSelectedShare(null)} style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#ddd", paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: themeColors.mode === "dark" ? "#bbb" : "#666", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={shareActionBusyId === selectedShare?.id}
              onPress={() => selectedShare && denySharedRecipe(selectedShare)}
              style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#ef9a9a", paddingVertical: 11, alignItems: "center" }}
            >
              <Text style={{ color: "#c62828", fontWeight: "700" }}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={shareActionBusyId === selectedShare?.id}
              onPress={() => selectedShare && acceptSharedRecipe(selectedShare)}
              style={{ flex: 1, borderRadius: 10, backgroundColor: themeColors.accentColor, paddingVertical: 11, alignItems: "center", opacity: shareActionBusyId === selectedShare?.id ? 0.75 : 1 }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {shareActionBusyId === selectedShare?.id ? "Adding..." : "Confirm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal visible={showImporterProfileModal} transparent animationType="fade" onRequestClose={() => setShowImporterProfileModal(false)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 16 }}>
        <View style={{ maxHeight: "88%", borderRadius: 16, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#202020" : "#fff" }}>
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
            <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700" }}>Importer Profile</Text>

            {!selectedImporterProfile || loadingImporterProfile ? (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 10 }}>Loading profile...</Text>
            ) : (
              <>
                <Text style={{ color: themeColors.textColor, marginTop: 10, fontSize: 16, fontWeight: "700" }}>{selectedImporterProfile.displayName}</Text>
                <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 2 }}>{selectedImporterProfile.handle}</Text>

                <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Allergies</Text>
                {selectedImporterProfile.allergies.length === 0 ? (
                  <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No allergies listed.</Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {selectedImporterProfile.allergies.map((allergy) => (
                      <View key={`${selectedImporterProfile.userId}-${allergy}`} style={{ borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#444" : "#ddd", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: themeColors.textColor, fontWeight: "700", fontSize: 12 }}>{allergy}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Public Recipes</Text>
                {selectedImporterProfile.publicRecipes.length === 0 ? (
                  <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No public recipes available.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {selectedImporterProfile.publicRecipes.map((publicRecipe) => (
                      <TouchableOpacity
                        key={publicRecipe.id}
                        onPress={() => {
                          setShowImporterProfileModal(false);
                          setTimeout(() => setSelectedImporterRecipe(publicRecipe), 120);
                        }}
                        style={{ borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e8e8e8", borderRadius: 10, padding: 10, flexDirection: "row", alignItems: "center" }}
                      >
                        {!!publicRecipe.imageUrl && (
                          <Image source={{ uri: publicRecipe.imageUrl }} contentFit="cover" style={{ width: 46, height: 46, borderRadius: 8, marginRight: 10 }} transition={120} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: themeColors.textColor, fontWeight: "700" }} numberOfLines={1}>{publicRecipe.name}</Text>
                          <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 2 }} numberOfLines={1}>
                            {publicRecipe.cookTime ? `${publicRecipe.cookTime} min` : "Time n/a"} • {publicRecipe.difficulty || "easy"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={themeColors.mode === "dark" ? "#aaa" : "#666"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {selectedImporterProfile.userId !== userId && (
                  <TouchableOpacity
                    onPress={sendFriendRequestToImporter}
                    disabled={friendIds.has(selectedImporterProfile.userId) || outgoingIds.has(selectedImporterProfile.userId)}
                    style={{ borderRadius: 10, borderWidth: 1, borderColor: themeColors.accentColor, backgroundColor: themeColors.accentColor + "18", paddingVertical: 11, alignItems: "center", marginTop: 14, opacity: (friendIds.has(selectedImporterProfile.userId) || outgoingIds.has(selectedImporterProfile.userId)) ? 0.7 : 1 }}
                  >
                    <Text style={{ color: themeColors.accentColor, fontWeight: "700" }}>
                      {friendIds.has(selectedImporterProfile.userId)
                        ? "Already Friends"
                        : outgoingIds.has(selectedImporterProfile.userId)
                          ? "Request Sent"
                          : "Add Friend"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: themeColors.mode === "dark" ? "#343434" : "#ededed" }}>
            <TouchableOpacity onPress={() => setShowImporterProfileModal(false)} style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#ddd", paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: themeColors.mode === "dark" ? "#bbb" : "#666", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal visible={!!selectedImporterRecipe} transparent animationType="fade" onRequestClose={() => setSelectedImporterRecipe(null)}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 16 }}>
        <View style={{ maxHeight: "88%", borderRadius: 16, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#3a3a3a" : "#e8e8e8", backgroundColor: themeColors.mode === "dark" ? "#202020" : "#fff" }}>
          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 18 }}>
            <Text style={{ color: themeColors.textColor, fontSize: 18, fontWeight: "700" }}>{selectedImporterRecipe?.name || "Public recipe"}</Text>
            {!!selectedImporterRecipe?.description && (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666", marginTop: 8, lineHeight: 20 }}>{selectedImporterRecipe.description}</Text>
            )}

            {!!selectedImporterRecipe?.imageUrl && (
              <Image source={{ uri: selectedImporterRecipe.imageUrl }} contentFit="cover" transition={160} style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 12 }} />
            )}

            <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Ingredients</Text>
            {(selectedImporterRecipe?.ingredients || []).length === 0 ? (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No ingredients listed.</Text>
            ) : (
              (selectedImporterRecipe?.ingredients || []).map((ingredient, index) => {
                const qty = `${ingredient.quantity ?? ""}`.trim();
                const unit = `${ingredient.unit ?? ""}`.trim();
                const prefix = [qty, unit].filter(Boolean).join(" ");
                return (
                  <Text key={`importer-recipe-ingredient-${index}`} style={{ color: themeColors.textColor, marginBottom: 6 }}>
                    • {prefix ? `${prefix} ${ingredient.name}` : ingredient.name}
                  </Text>
                );
              })
            )}

            <Text style={{ color: themeColors.textColor, fontWeight: "700", marginTop: 14, marginBottom: 8 }}>Steps</Text>
            {(selectedImporterRecipe?.instructions || []).length === 0 ? (
              <Text style={{ color: themeColors.mode === "dark" ? "#aaa" : "#666" }}>No steps listed.</Text>
            ) : (
              (selectedImporterRecipe?.instructions || []).map((step, index) => (
                <Text key={`importer-recipe-step-${index}`} style={{ color: themeColors.textColor, marginBottom: 6, lineHeight: 20 }}>
                  {index + 1}. {step}
                </Text>
              ))
            )}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: themeColors.mode === "dark" ? "#343434" : "#ededed" }}>
            <TouchableOpacity onPress={() => setSelectedImporterRecipe(null)} style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: themeColors.mode === "dark" ? "#4a4a4a" : "#ddd", paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: themeColors.mode === "dark" ? "#bbb" : "#666", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}
