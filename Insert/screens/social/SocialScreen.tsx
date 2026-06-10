import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getAuth } from "firebase/auth";
import { onSnapshot, orderBy, query, limit, updateDoc, arrayUnion, arrayRemove, collection, getDocs, where, setDoc, doc, serverTimestamp, addDoc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { pantryCol, socialPostsCol, socialPostDoc, friendsCol, friendRequestsCol, outgoingFriendRequestsCol, recipeSharesCol, recipesCol, recipesDoc } from "@/screens/firebaseAuthLoginRegister/firebase/userDataService";
import { getSourceHost } from "@/screens/utils/urlUtils";
import styles from "./SocialScreen.styles";

type ThemeColors = {
  mode: "light" | "dark" | "custom";
  textColor: string;
  accentColor: string;
  backgroundColor: string;
};

type SocialPostItem = {
  id: string;
  userId: string;
  recipeOwnerId?: string;
  userDisplayName: string;
  userHandle: string;
  recipeId: string;
  recipeName: string;
  recipeImageUrl?: string;
  note?: string;
  ingredients: string[];
  recipeIngredientsDetailed?: { name: string; quantity?: string; unit?: string }[];
  recipeInstructions?: string[];
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: number | { seconds: number; nanoseconds: number };
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: number | { seconds: number; nanoseconds: number };
  cookedAt?: number | { seconds: number; nanoseconds: number };
  sharedAt?: number | { seconds: number; nanoseconds: number };
  stepPhotos: Array<{ stepIndex: number; url?: string; uri?: string; imageUrl?: string }>;
  likes: string[];
};

type PantryItem = {
  name?: string;
  type?: string;
};

type Liker = {
  userId: string;
  displayName: string;
  handle: string;
};

type SocialComment = {
  id: string;
  userId: string;
  userDisplayName: string;
  userHandle: string;
  text: string;
  createdAt?: number | { seconds: number; nanoseconds: number };
  updatedAt?: number | { seconds: number; nanoseconds: number };
  editedAt?: number | { seconds: number; nanoseconds: number };
  isEdited?: boolean;
};

type UserProfilePreview = {
  userId: string;
  displayName: string;
  handle: string;
  allergies: string[];
  publicRecipes: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    cookTime?: string | number;
    difficulty?: string;
    description?: string;
    sourceUrl?: string;
    ingredients?: { name: string; quantity?: string | number; unit?: string }[];
    instructions?: string[];
  }>;
  sharedRecently: Array<{ id: string; recipeName: string; createdAt?: number | { seconds: number; nanoseconds: number } }>;
  socialPostCount: number;
};

type PublicRecipePreview = {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
  sourceUrl?: string;
  cookTime?: string | number;
  difficulty?: string;
  ingredients?: { name: string; quantity?: string | number; unit?: string }[];
  instructions?: string[];
};

interface SocialScreenProps {
  theme: ThemeColors;
  currentUserDisplayName?: string;
  currentUserEmail?: string;
}

export default function SocialScreen({ theme, currentUserDisplayName, currentUserEmail }: SocialScreenProps) {
  const auth = getAuth();
  const userId = auth.currentUser?.uid || "";
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendInput, setFriendInput] = useState("");
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedRecipePost, setSelectedRecipePost] = useState<SocialPostItem | null>(null);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesForPost, setLikesForPost] = useState<SocialPostItem | null>(null);
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsForPost, setCommentsForPost] = useState<SocialPostItem | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [commentActionBusyId, setCommentActionBusyId] = useState<string | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [savingRecipePostId, setSavingRecipePostId] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfilePreview | null>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [selectedPublicRecipe, setSelectedPublicRecipe] = useState<PublicRecipePreview | null>(null);

  useEffect(() => {
    const postsQ = query(socialPostsCol(), orderBy("createdAt", "desc"), limit(40));
    const unsubPosts = onSnapshot(postsQ, (snapshot) => {
      const mapped = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SocialPostItem, "id">) }));
      setPosts(mapped);
    });

    if (!userId) {
      return () => unsubPosts();
    }

    const unsubPantry = onSnapshot(pantryCol(userId), (snapshot) => {
      setPantryItems(snapshot.docs.map((d) => d.data() as PantryItem));
    });

    const unsubFriends = onSnapshot(friendsCol(userId), (snapshot) => {
      setFriendIds(new Set(snapshot.docs.map((d) => d.id)));
    });

    const unsubOutgoing = onSnapshot(outgoingFriendRequestsCol(userId), (snapshot) => {
      setOutgoingIds(new Set(snapshot.docs.map((d) => d.id)));
    });

    return () => {
      unsubPosts();
      unsubPantry();
      unsubFriends();
      unsubOutgoing();
    };
  }, [userId]);

  useEffect(() => {
    if (posts.length === 0) {
      setCommentCounts({});
      return;
    }

    const unsubscribes = posts.map((post) => {
      return onSnapshot(collection(db, "socialPosts", post.id, "comments"), (snapshot) => {
        setCommentCounts((prev) => ({ ...prev, [post.id]: snapshot.size }));
      });
    });

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [posts]);

  const pantryTokens = useMemo(() => {
    return pantryItems
      .flatMap((item) => [item.name || "", item.type || ""])
      .map((value) => value.toLowerCase().trim())
      .filter(Boolean);
  }, [pantryItems]);

  const isDark = theme.mode === "dark";
  const cardBg = isDark ? "#232323" : "#fff";
  const muted = isDark ? "#9a9a9a" : "#6e6e6e";
  const border = isDark ? "#353535" : "#ececec";
  const socialBlue = "#3A7BDE";
  const socialRose = "#C1557A";
  const socialSage = "#4FAF8A";

  const withAlpha = (hex: string, alpha: string) => {
    if (!hex || hex[0] !== "#" || hex.length !== 7) return hex;
    return `${hex}${alpha}`;
  };

  const accentSoftBg = withAlpha(theme.accentColor, isDark ? "26" : "16");
  const accentSoftBorder = withAlpha(theme.accentColor, isDark ? "70" : "3D");
  const blueSoftBg = withAlpha(socialBlue, isDark ? "24" : "14");
  const blueSoftBorder = withAlpha(socialBlue, isDark ? "70" : "40");
  const roseSoftBg = withAlpha(socialRose, isDark ? "24" : "14");
  const roseSoftBorder = withAlpha(socialRose, isDark ? "70" : "40");
  const sageSoftBg = withAlpha(socialSage, isDark ? "24" : "14");
  const sageSoftBorder = withAlpha(socialSage, isDark ? "70" : "40");

  const toMillis = (value?: number | { seconds: number; nanoseconds: number } | null): number | null => {
    if (!value) return null;
    if (typeof value === "number") return value;
    if (typeof value === "object" && typeof value.seconds === "number") return value.seconds * 1000;
    return null;
  };

  const formatTimestamp = (value?: number | { seconds: number; nanoseconds: number } | null): string | null => {
    const ms = toMillis(value);
    if (!ms) return null;
    return new Date(ms).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCookability = (ingredients: string[]) => {
    if (!ingredients?.length || pantryTokens.length === 0) {
      return { ready: false, missing: ingredients?.length || 0 };
    }

    const missing = ingredients.filter((ing) => {
      const needle = (ing || "").toLowerCase().trim();
      if (!needle) return false;
      return !pantryTokens.some((token) => token.includes(needle) || needle.includes(token));
    }).length;

    return { ready: missing === 0, missing };
  };

  const toggleLike = async (post: SocialPostItem) => {
    if (!userId) return;
    const liked = post.likes?.includes(userId);
    await updateDoc(socialPostDoc(post.id), {
      likes: liked ? arrayRemove(userId) : arrayUnion(userId),
    });
  };

  const openRecipeCard = (post: SocialPostItem) => {
    setSelectedRecipePost(post);
    setShowRecipeModal(true);
  };

  const getRecipeIngredientsForModal = (post: SocialPostItem | null): string[] => {
    if (!post) return [];
    if (post.recipeIngredientsDetailed?.length) {
      return post.recipeIngredientsDetailed.map((ing) => {
        const qty = `${ing.quantity || ""}`.trim();
        const unit = (ing.unit || "").trim();
        const prefix = [qty, unit].filter(Boolean).join(" ");
        return prefix ? `${prefix} ${ing.name}` : ing.name;
      });
    }
    return post.ingredients || [];
  };

  const getRecipeInstructionsForModal = (post: SocialPostItem | null): string[] => {
    if (!post) return [];
    if (post.recipeInstructions?.length) return post.recipeInstructions;
    if (post.stepPhotos?.length) {
      return post.stepPhotos
        .slice()
        .sort((a, b) => a.stepIndex - b.stepIndex)
        .map((step) => `Step ${step.stepIndex + 1} photo`);
    }
    return [];
  };

  const getRecipeTimestampLabel = (post: SocialPostItem | null): string => {
    if (!post) return "";
    const cooked = formatTimestamp(post.cookedAt);
    const shared = formatTimestamp(post.sharedAt);
    const parts = [];
    if (cooked) parts.push(`Cooked ${cooked}`);
    if (shared) parts.push(`Shared ${shared}`);
    return parts.join(" • ");
  };

  const getAttributionLabel = (post: SocialPostItem): string => {
    if (post.originType === "imported" || post.sourceUrl) {
      const importer = post.originalImporterDisplayName || post.originalCreatorDisplayName || post.userDisplayName || "Unknown";
      const host = getSourceHost(post.sourceUrl);
      return host ? `Original importer: ${importer} • Source: ${host}` : `Original importer: ${importer}`;
    }
    return `Original creator: ${post.originalCreatorDisplayName || post.userDisplayName || "Unknown"}`;
  };

  const notifyRecipeSaved = async (targetUserId: string, recipeId: string, recipeName: string) => {
    if (!userId || !targetUserId || targetUserId === userId) return;

    const actorName = currentUserDisplayName || auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "Someone";

    try {
      await addDoc(collection(db, "users", targetUserId, "notifications"), {
        type: "recipe_saved",
        actorUserId: userId,
        actorDisplayName: actorName,
        recipeId,
        recipeName,
        message: `${actorName} saved your recipe \"${recipeName}\".`,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      // Do not fail recipe save when notification write is blocked/intermittent.
      console.error("Recipe save notification failed:", err);
    }
  };

  const saveRecipeFromPost = async (post: SocialPostItem) => {
    if (!userId || savingRecipePostId) return;
    setSavingRecipePostId(post.id);
    try {
      let resolvedSourceUrl = post.sourceUrl || "";
      if (!resolvedSourceUrl && post.recipeId) {
        // Public recipe mirror is readable for authenticated users and avoids private recipe permission errors.
        const publicRecipeSnap = await getDoc(doc(db, "publicRecipes", post.recipeId));
        if (publicRecipeSnap.exists()) {
          const publicData = publicRecipeSnap.data() as { sourceUrl?: string };
          resolvedSourceUrl = publicData.sourceUrl || "";
        } else if (post.recipeOwnerId && post.recipeOwnerId === userId) {
          const sourceSnap = await getDoc(recipesDoc(post.recipeOwnerId, post.recipeId));
          if (sourceSnap.exists()) {
            const sourceData = sourceSnap.data() as { sourceUrl?: string };
            resolvedSourceUrl = sourceData.sourceUrl || "";
          }
        }
      }

      const ingredients = (post.recipeIngredientsDetailed || []).map((ingredient, index) => ({
        id: index + 1,
        name: ingredient.name || "",
        quantity: String(ingredient.quantity ?? ""),
        unit: String(ingredient.unit ?? ""),
      })).filter((ingredient) => ingredient.name.trim().length > 0);

      const instructions = Array.isArray(post.recipeInstructions)
        ? post.recipeInstructions.filter((step) => typeof step === "string" && step.trim().length > 0)
        : [];

      await addDoc(recipesCol(userId), {
        userId,
        name: post.recipeName || "Social Recipe",
        description: post.note || "",
        imageUrl: post.recipeImageUrl || "",
        sourceUrl: resolvedSourceUrl,
        servings: "",
        cookTime: "",
        difficulty: "easy",
        visibility: "private",
        ingredients,
        instructions,
        originType: post.originType || (resolvedSourceUrl ? "imported" : "created"),
        originalCreatorUserId: post.originalCreatorUserId || post.recipeOwnerId || post.userId || "",
        originalCreatorDisplayName: post.originalCreatorDisplayName || post.userDisplayName || "Unknown",
        originalCreatedAt: post.originalCreatedAt || Date.now(),
        originalImporterUserId: resolvedSourceUrl ? (post.originalImporterUserId || post.recipeOwnerId || post.userId || "") : "",
        originalImporterDisplayName: resolvedSourceUrl ? (post.originalImporterDisplayName || post.originalCreatorDisplayName || post.userDisplayName || "Unknown") : "",
        originalImportedAt: resolvedSourceUrl ? (post.originalImportedAt || Date.now()) : null,
        importedFromSocial: true,
        socialPostId: post.id,
        createdAt: serverTimestamp(),
      });

      const notificationTargets = new Set<string>([
        post.userId || "",
        post.recipeOwnerId || "",
        post.originalCreatorUserId || "",
      ]);
      await Promise.all(
        Array.from(notificationTargets)
          .filter((targetId) => !!targetId && targetId !== userId)
          .map((targetId) => notifyRecipeSaved(targetId, post.recipeId || post.id, post.recipeName || "Recipe"))
      );

      Alert.alert("Saved", `Added \"${post.recipeName}\" to your Kitchen recipes.`);
    } catch (err) {
      console.error("Save from social failed:", err);
      Alert.alert("Save failed", "Could not save this recipe right now.");
    } finally {
      setSavingRecipePostId(null);
    }
  };

  const openUserProfile = async (targetUserId: string, fallbackDisplayName?: string, fallbackHandle?: string) => {
    if (!targetUserId) return;
    setShowUserModal(true);
    setLoadingUserProfile(true);

    const initialName = fallbackDisplayName || "Insert User";
    const initialHandle = fallbackHandle || `@${initialName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`;
    setSelectedUserProfile({
      userId: targetUserId,
      displayName: initialName,
      handle: initialHandle,
      allergies: [],
      publicRecipes: [],
        sharedRecently: [],
      socialPostCount: 0,
    });

    try {
      const profileSnap = await getDoc(doc(db, "users", targetUserId));
      const profileData = profileSnap.data() as { displayName?: string; email?: string; allergies?: unknown[] } | undefined;
      const displayName = profileData?.displayName || profileData?.email?.split("@")[0] || initialName;
      const handle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`;
      const allergies = Array.isArray(profileData?.allergies)
        ? profileData!.allergies.filter((value): value is string => typeof value === "string")
        : [];

      const publicRecipesSnap = await getDocs(query(collection(db, "publicRecipes"), where("ownerId", "==", targetUserId), limit(8)));
      const publicRecipes = publicRecipesSnap.docs.map((recipeDoc) => {
        const recipeData = recipeDoc.data() as {
          name?: string;
          imageUrl?: string;
          cookTime?: string | number;
          difficulty?: string;
          description?: string;
          sourceUrl?: string;
          ingredients?: { name: string; quantity?: string | number; unit?: string }[];
          instructions?: string[];
        };
        return {
          id: recipeDoc.id,
          name: recipeData.name || "Recipe",
          imageUrl: recipeData.imageUrl || "",
          cookTime: recipeData.cookTime,
          difficulty: recipeData.difficulty,
          description: recipeData.description || "",
          sourceUrl: recipeData.sourceUrl || "",
          ingredients: Array.isArray(recipeData.ingredients) ? recipeData.ingredients : [],
          instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
        };
      });

      const sharedRecently = friendIds.has(targetUserId) && userId
        ? (await getDocs(query(recipeSharesCol(userId), where("fromUserId", "==", targetUserId), limit(10)))).docs
            .map((shareDoc) => {
              const shareData = shareDoc.data() as { recipeName?: string; createdAt?: number | { seconds: number; nanoseconds: number } };
              return { id: shareDoc.id, recipeName: shareData.recipeName || "Shared recipe", createdAt: shareData.createdAt };
            })
            .sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0))
        : [];

      const postsSnap = await getDocs(query(socialPostsCol(), where("userId", "==", targetUserId), limit(40)));

      setSelectedUserProfile({
        userId: targetUserId,
        displayName,
        handle,
        allergies,
        publicRecipes,
        sharedRecently,
        socialPostCount: postsSnap.size,
      });
    } catch (err) {
      console.error("Failed to load user profile:", err);
    } finally {
      setLoadingUserProfile(false);
    }
  };

  const openPublicRecipePreview = async (recipe: PublicRecipePreview) => {
    // Close the user profile modal first — Android cannot stack two Modals simultaneously.
    // We save a ref so we can reopen it when the recipe detail is dismissed.
    const wasProfileOpen = showUserModal;
    if (wasProfileOpen) setShowUserModal(false);

    const applyRecipe = (resolved: PublicRecipePreview) => {
      if (wasProfileOpen) {
        // Small delay on Android to let the first modal finish dismissing before opening the next.
        setTimeout(() => setSelectedPublicRecipe(resolved), 120);
      } else {
        setSelectedPublicRecipe(resolved);
      }
    };

    try {
      const latestSnap = await getDoc(doc(db, "publicRecipes", recipe.id));
      if (latestSnap.exists()) {
        const latestData = latestSnap.data() as {
          name?: string;
          imageUrl?: string;
          cookTime?: string | number;
          difficulty?: string;
          description?: string;
          sourceUrl?: string;
          ingredients?: { name: string; quantity?: string | number; unit?: string }[];
          instructions?: string[];
        };
        applyRecipe({
          id: recipe.id,
          name: latestData.name || recipe.name,
          imageUrl: latestData.imageUrl || recipe.imageUrl || "",
          cookTime: latestData.cookTime ?? recipe.cookTime,
          difficulty: latestData.difficulty || recipe.difficulty,
          description: latestData.description || recipe.description || "",
          sourceUrl: latestData.sourceUrl || recipe.sourceUrl || "",
          ingredients: Array.isArray(latestData.ingredients) ? latestData.ingredients : (recipe.ingredients || []),
          instructions: Array.isArray(latestData.instructions) ? latestData.instructions : (recipe.instructions || []),
        });
        return;
      }
    } catch (error) {
      console.error("Failed to refresh public recipe preview:", error);
    }

    applyRecipe(recipe);
  };

  const openLikesModal = async (post: SocialPostItem) => {
    setLikesForPost(post);
    setShowLikesModal(true);
    setLoadingLikers(true);
    try {
      const ids = post.likes || [];
      if (ids.length === 0) {
        setLikers([]);
        return;
      }

      const profileSnaps = await Promise.all(ids.map((id) => getDoc(doc(db, "users", id))));
      const mapped = profileSnaps.map((snap, index) => {
        const data = snap.data() as { displayName?: string; email?: string } | undefined;
        const displayName = data?.displayName || data?.email?.split("@")[0] || "Insert User";
        const handle = `@${displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`;
        return { userId: ids[index], displayName, handle };
      });
      setLikers(mapped);
    } catch (err) {
      console.error("Failed to load likes:", err);
      Alert.alert("Could not load likes", "Please try again.");
      setLikers([]);
    } finally {
      setLoadingLikers(false);
    }
  };

  const openCommentsModal = (post: SocialPostItem) => {
    setCommentsForPost(post);
    setShowCommentsModal(true);
  };

  useEffect(() => {
    if (!showCommentsModal || !commentsForPost?.id) {
      setComments([]);
      return;
    }

    const commentsQ = query(collection(db, "socialPosts", commentsForPost.id, "comments"), orderBy("createdAt", "asc"), limit(120));
    const unsubscribe = onSnapshot(commentsQ, (snapshot) => {
      const mapped = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SocialComment, "id">) }));
      setComments(mapped);
    });

    return () => unsubscribe();
  }, [showCommentsModal, commentsForPost?.id]);

  const addComment = async () => {
    if (!commentsForPost?.id || !userId || sendingComment) return;
    const text = commentInput.trim();
    if (!text) return;

    setSendingComment(true);
    try {
      const email = currentUserEmail || auth.currentUser?.email || "";
      const displayName = currentUserDisplayName || auth.currentUser?.displayName || email.split("@")[0] || "Insert User";
      const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser";

      await addDoc(collection(db, "socialPosts", commentsForPost.id, "comments"), {
        userId,
        userDisplayName: displayName,
        userHandle: `@${handleRoot}`,
        text,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isEdited: false,
      });

      setCommentInput("");
    } catch (err) {
      console.error("Comment failed:", err);
      Alert.alert("Comment failed", "Could not post your comment right now.");
    } finally {
      setSendingComment(false);
    }
  };

  const beginEditComment = (comment: SocialComment) => {
    if (comment.userId !== userId) return;
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || "");
  };

  const saveEditedComment = async (comment: SocialComment) => {
    if (!commentsForPost?.id || !userId || comment.userId !== userId || !editingCommentId) return;
    const nextText = editingCommentText.trim();
    if (!nextText) {
      Alert.alert("Empty comment", "Comment text cannot be empty.");
      return;
    }

    setCommentActionBusyId(comment.id);
    try {
      await updateDoc(doc(db, "socialPosts", commentsForPost.id, "comments", comment.id), {
        text: nextText,
        updatedAt: serverTimestamp(),
        editedAt: serverTimestamp(),
        isEdited: true,
      });
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (err) {
      console.error("Edit comment failed:", err);
      Alert.alert("Edit failed", "Could not update your comment right now.");
    } finally {
      setCommentActionBusyId(null);
    }
  };

  const deleteComment = (comment: SocialComment) => {
    if (!commentsForPost?.id || !userId || comment.userId !== userId) return;

    Alert.alert(
      "Delete comment",
      "Delete this comment? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setCommentActionBusyId(comment.id);
            try {
              await deleteDoc(doc(db, "socialPosts", commentsForPost.id, "comments", comment.id));
            } catch (err) {
              console.error("Delete comment failed:", err);
              Alert.alert("Delete failed", "Could not delete your comment right now.");
            } finally {
              setCommentActionBusyId(null);
            }
          },
        },
      ]
    );
  };

  const savePublicRecipeToKitchen = async (recipe: PublicRecipePreview) => {
    if (!userId || !selectedUserProfile) return;

    try {
      await addDoc(recipesCol(userId), {
        userId,
        name: recipe.name || "Public Recipe",
        description: recipe.description || "",
        imageUrl: recipe.imageUrl || "",
        sourceUrl: recipe.sourceUrl || "",
        servings: "",
        cookTime: recipe.cookTime || "",
        difficulty: recipe.difficulty || "easy",
        visibility: "private",
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ingredient, index) => ({
          id: index + 1,
          name: ingredient.name || "",
          quantity: String(ingredient.quantity ?? ""),
          unit: String(ingredient.unit ?? ""),
        })) : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
        originType: recipe.sourceUrl ? "imported" : "created",
        originalCreatorUserId: selectedUserProfile.userId,
        originalCreatorDisplayName: selectedUserProfile.displayName,
        originalCreatedAt: Date.now(),
        originalImporterUserId: recipe.sourceUrl ? selectedUserProfile.userId : "",
        originalImporterDisplayName: recipe.sourceUrl ? selectedUserProfile.displayName : "",
        originalImportedAt: recipe.sourceUrl ? Date.now() : null,
        importedFromPublicProfile: true,
        createdAt: serverTimestamp(),
      });

      await notifyRecipeSaved(selectedUserProfile.userId, recipe.id, recipe.name);

      Alert.alert("Saved", `Added \"${recipe.name}\" to your recipes.`);
    } catch (err) {
      console.error("Save public recipe failed:", err);
      Alert.alert("Save failed", "Could not save this public recipe right now.");
    }
  };

  const sendFriendRequest = async (targetUserId: string, targetDisplayName?: string) => {
    if (!userId || !targetUserId || targetUserId === userId) return;
    if (friendIds.has(targetUserId)) {
      Alert.alert("Already friends", `You are already connected with ${targetDisplayName || "this user"}.`);
      return;
    }
    if (outgoingIds.has(targetUserId)) {
      Alert.alert("Request pending", "You already sent a friend request.");
      return;
    }

    const email = currentUserEmail || auth.currentUser?.email || "";
    const displayName = currentUserDisplayName || auth.currentUser?.displayName || email.split("@")[0] || "Insert User";
    const handleRoot = displayName.toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser";

    await setDoc(doc(friendRequestsCol(targetUserId), userId), {
      fromUserId: userId,
      fromDisplayName: displayName,
      fromHandle: `@${handleRoot}`,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    await setDoc(doc(outgoingFriendRequestsCol(userId), targetUserId), {
      toUserId: targetUserId,
      toDisplayName: targetDisplayName || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });

    Alert.alert("Friend request sent", `Request sent to ${targetDisplayName || "user"}.`);
  };

  const confirmDeletePost = (post: SocialPostItem) => {
    if (!userId || post.userId !== userId) return;
    Alert.alert(
      "Delete post",
      `Delete your post for ${post.recipeName}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(socialPostDoc(post.id));
            } catch (err) {
              console.error("Delete post failed:", err);
              Alert.alert("Delete failed", "Could not delete this post right now.");
            }
          },
        },
      ]
    );
  };

  const handleAddFriendFromInput = async () => {
    if (!userId || sendingFriendRequest) return;
    const raw = friendInput.trim();
    if (!raw) {
      Alert.alert("Add friend", "Enter an email or @name.");
      return;
    }

    setSendingFriendRequest(true);
    try {
      let targetId = "";
      let targetName = "";

      const asEmail = raw.includes("@");
      if (asEmail) {
        const emailQuery = query(collection(db, "users"), where("email", "==", raw.toLowerCase()), limit(1));
        const emailSnap = await getDocs(emailQuery);
        if (!emailSnap.empty) {
          const docSnap = emailSnap.docs[0];
          targetId = docSnap.id;
          targetName = (docSnap.data().displayName as string) || "";
        }
      }

      if (!targetId) {
        const lookup = raw.replace(/^@/, "").toLowerCase();
        const usersSnap = await getDocs(query(collection(db, "users"), limit(80)));
        const found = usersSnap.docs.find((d) => {
          const data = d.data() as { displayName?: string; email?: string };
          const name = (data.displayName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const emailName = (data.email || "").split("@")[0]?.toLowerCase() || "";
          return name === lookup || emailName === lookup;
        });
        if (found) {
          targetId = found.id;
          targetName = ((found.data() as { displayName?: string }).displayName) || "";
        }
      }

      if (!targetId) {
        Alert.alert("User not found", "No matching user was found for that email or handle.");
        return;
      }

      await sendFriendRequest(targetId, targetName);
      setFriendInput("");
      setShowAddFriendModal(false);
    } catch (err) {
      console.error("Failed to add friend:", err);
      Alert.alert("Request failed", "Could not send friend request right now.");
    } finally {
      setSendingFriendRequest(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View style={[styles.headerRow, { backgroundColor: cardBg, borderColor: border }]}>
        <Text style={[styles.title, { color: theme.textColor }]}>Social</Text>
        <Text style={[styles.subtitle, { color: muted }]}>See what people cooked and what you can make right now.</Text>

        <View style={styles.headerFeatureRow}>
          <TouchableOpacity
            onPress={() => setShowAddFriendModal(true)}
            style={[styles.addFriendButton, { borderColor: socialSage, backgroundColor: sageSoftBg }]}
          >
            <Ionicons name="person-add-outline" size={14} color={socialSage} />
            <Text style={[styles.addFriendText, { color: socialSage }]}>Add Friend</Text>
          </TouchableOpacity>

          <View style={[styles.tag, { backgroundColor: accentSoftBg, borderColor: accentSoftBorder, borderWidth: 1 }]}>
            <Text style={[styles.tagText, { color: theme.accentColor }]}>Pantry-Aware Feed</Text>
          </View>

          <View style={[styles.tag, { backgroundColor: blueSoftBg, borderColor: blueSoftBorder, borderWidth: 1 }]}>
            <Text style={[styles.tagText, { color: socialBlue }]}>{posts.length} posts</Text>
          </View>
        </View>
      </View>

      {posts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: border }]}>
          <Ionicons name="sparkles-outline" size={22} color={theme.accentColor} />
          <Text style={[styles.emptyTitle, { color: theme.textColor }]}>No posts yet</Text>
          <Text style={[styles.emptySub, { color: muted }]}>Cook a recipe with step photos and post your result to kick off the feed.</Text>
        </View>
      ) : (
        posts.map((post) => {
          const cookability = getCookability(post.ingredients || []);
          const liked = !!post.likes?.includes(userId);
          const likeCount = post.likes?.length || 0;
          const sortedStepPhotos = (post.stepPhotos || [])
            .map((photo) => ({
              stepIndex: Number(photo.stepIndex || 0),
              url: (photo.url || photo.uri || photo.imageUrl || "").trim(),
            }))
            .filter((photo) => photo.url.length > 0)
            .sort((a, b) => a.stepIndex - b.stepIndex);
          const hasRecipeImage = !!post.recipeImageUrl;
          const hasStepPhotos = sortedStepPhotos.length > 0;
          const resolvedPostDisplayName = post.userId === userId
            ? (currentUserDisplayName || post.userDisplayName || "Cook")
            : (post.userDisplayName || "Cook");
          const resolvedPostHandle = post.userId === userId
            ? `@${(currentUserDisplayName || post.userDisplayName || "insertuser").toLowerCase().replace(/[^a-z0-9]/g, "") || "insertuser"}`
            : (post.userHandle || "@cook");

          return (
            <View key={post.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.cardHead}>
                <TouchableOpacity
                  onPress={() => openUserProfile(post.userId, resolvedPostDisplayName, resolvedPostHandle)}
                  style={styles.userPressArea}
                  activeOpacity={0.8}
                >
                  <View style={[styles.avatar, { backgroundColor: accentSoftBg }]}>
                    <Text style={[styles.avatarText, { color: theme.accentColor }]}>{(resolvedPostDisplayName || "U").slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.user, { color: theme.textColor }]}>{resolvedPostDisplayName}</Text>
                    <Text style={[styles.handle, { color: muted }]}>{resolvedPostHandle}</Text>
                  </View>
                </TouchableOpacity>
                <View style={[styles.readyBadge, { backgroundColor: cookability.ready ? "#e9f9ee" : "#fff6e8" }]}>
                  <Text style={[styles.readyText, { color: cookability.ready ? "#1f7a3c" : "#b76a00" }]}>
                    {cookability.ready ? "Cookable Now" : `Missing ${cookability.missing}`}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => openRecipeCard(post)} activeOpacity={0.75}>
                <Text style={[styles.recipeTitle, { color: theme.textColor }]}>{post.recipeName}</Text>
              </TouchableOpacity>
              {post.note ? <Text style={[styles.note, { color: muted }]}>{post.note}</Text> : null}
              <Text style={[styles.note, { color: muted, marginBottom: 8 }]}>{getAttributionLabel(post)}</Text>

              <View style={styles.timestampRow}>
                {formatTimestamp(post.cookedAt) ? (
                  <View style={[styles.timestampPill, { borderColor: blueSoftBorder, backgroundColor: blueSoftBg }]}>
                    <Ionicons name="restaurant-outline" size={12} color={socialBlue} />
                    <Text style={[styles.timestampText, { color: socialBlue }]}>Cooked {formatTimestamp(post.cookedAt)}</Text>
                  </View>
                ) : null}
                {formatTimestamp(post.sharedAt) ? (
                  <View style={[styles.timestampPill, { borderColor: accentSoftBorder, backgroundColor: accentSoftBg }]}>
                    <Ionicons name="share-social-outline" size={12} color={theme.accentColor} />
                    <Text style={[styles.timestampText, { color: theme.accentColor }]}>Shared {formatTimestamp(post.sharedAt)}</Text>
                  </View>
                ) : null}
              </View>

              {hasRecipeImage ? (
                <Image source={{ uri: post.recipeImageUrl }} contentFit="cover" style={styles.cover} transition={180} />
              ) : null}

              {hasStepPhotos ? (
                <>
                  <View style={styles.snippetTitleRow}>
                    <Ionicons name="images-outline" size={13} color={muted} />
                    <Text style={[styles.snippetTitle, { color: muted }]}>Step snippets</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                    {sortedStepPhotos.map((photo) => (
                      <View
                        key={`${post.id}-step-${photo.stepIndex}`}
                        style={[styles.photoCard, hasRecipeImage && styles.photoCardSmall]}
                      >
                        <Image
                          source={{ uri: photo.url }}
                          contentFit="cover"
                          style={[styles.photo, hasRecipeImage && styles.photoSmall]}
                          transition={180}
                        />
                        <View style={styles.photoLabelWrap}>
                          <Text style={styles.photoLabel}>Step {photo.stepIndex + 1}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => toggleLike(post)}
                  onLongPress={() => openLikesModal(post)}
                  delayLongPress={220}
                  style={[styles.actionButton, { borderColor: roseSoftBorder, backgroundColor: liked ? roseSoftBg : "transparent" }]}
                >
                  <Ionicons name={liked ? "heart" : "heart-outline"} size={15} color={liked ? "#e64b5d" : muted} />
                  <Text style={[styles.actionText, { color: muted }]}>{likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openCommentsModal(post)} style={[styles.actionButton, { borderColor: blueSoftBorder, backgroundColor: blueSoftBg }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={15} color={socialBlue} />
                  <Text style={[styles.actionText, { color: socialBlue }]}>Comments {commentCounts[post.id] || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => saveRecipeFromPost(post)}
                  disabled={savingRecipePostId === post.id}
                  style={[styles.actionButton, { borderColor: accentSoftBorder, backgroundColor: accentSoftBg }, savingRecipePostId === post.id && { opacity: 0.6 }]}
                >
                  <Ionicons name="download-outline" size={15} color={theme.accentColor} />
                  <Text style={[styles.actionText, { color: theme.accentColor }]}>{savingRecipePostId === post.id ? "Saving" : "Save"}</Text>
                </TouchableOpacity>
                {post.userId !== userId && (
                  <TouchableOpacity
                    onPress={() => sendFriendRequest(post.userId, post.userDisplayName)}
                    disabled={friendIds.has(post.userId) || outgoingIds.has(post.userId)}
                    style={[
                      styles.actionButton,
                      { borderColor: sageSoftBorder, backgroundColor: sageSoftBg },
                      (friendIds.has(post.userId) || outgoingIds.has(post.userId)) && { opacity: 0.6 },
                    ]}
                  >
                    <Ionicons name="person-add-outline" size={15} color={socialSage} />
                    <Text style={[styles.actionText, { color: socialSage }]}>
                      {friendIds.has(post.userId) ? "Friends" : outgoingIds.has(post.userId) ? "Requested" : "Add Friend"}
                    </Text>
                  </TouchableOpacity>
                )}
                {post.userId === userId && (
                  <TouchableOpacity
                    onPress={() => confirmDeletePost(post)}
                    style={[styles.actionButton, { borderColor: border }]}
                  >
                    <Ionicons name="trash-outline" size={15} color={muted} />
                    <Text style={[styles.actionText, { color: muted }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      <Modal visible={showAddFriendModal} transparent animationType="fade" onRequestClose={() => setShowAddFriendModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Add Friend</Text>
            <Text style={[styles.modalSubtitle, { color: muted }]}>Use email or @name to send a friend request.</Text>
            <TextInput
              value={friendInput}
              onChangeText={setFriendInput}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="name@email.com or @chefname"
              placeholderTextColor={muted}
              style={[styles.modalInput, { color: theme.textColor, borderColor: border, backgroundColor: isDark ? "#1b1b1b" : "#fff" }]}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowAddFriendModal(false)} style={[styles.modalButton, { borderColor: border }]}> 
                <Text style={[styles.modalButtonText, { color: muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddFriendFromInput} style={[styles.modalButton, { borderColor: theme.accentColor, backgroundColor: theme.accentColor + "18" }]}>
                <Text style={[styles.modalButtonText, { color: theme.accentColor }]}>{sendingFriendRequest ? "Sending..." : "Send Request"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showRecipeModal} transparent animationType="fade" onRequestClose={() => setShowRecipeModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>{selectedRecipePost?.recipeName || "Recipe"}</Text>
            {!!selectedRecipePost?.note && <Text style={[styles.modalSubtitle, { color: muted }]}>{selectedRecipePost.note}</Text>}
            {!!selectedRecipePost && (
              <Text style={[styles.modalSubtitle, { color: muted, marginTop: 4 }]}>{getAttributionLabel(selectedRecipePost)}</Text>
            )}

            {selectedRecipePost?.recipeImageUrl ? (
              <Image source={{ uri: selectedRecipePost.recipeImageUrl }} contentFit="cover" style={styles.modalRecipeImage} transition={180} />
            ) : selectedRecipePost?.stepPhotos?.length ? (
              <Image source={{ uri: selectedRecipePost.stepPhotos[0].url }} contentFit="cover" style={styles.modalRecipeImage} transition={180} />
            ) : null}

            <Text style={[styles.modalMeta, { color: muted }]}>
              {(selectedRecipePost?.ingredients?.length || 0)} ingredients • {(selectedRecipePost?.stepPhotos?.length || 0)} step photos
            </Text>

            {!!getRecipeTimestampLabel(selectedRecipePost) && (
              <Text style={[styles.modalTimestampLine, { color: muted }]}>{getRecipeTimestampLabel(selectedRecipePost)}</Text>
            )}

            {!!selectedRecipePost?.sourceUrl && (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedRecipePost.sourceUrl) return;
                  Linking.openURL(selectedRecipePost.sourceUrl).catch(() => {
                    Alert.alert("Could not open source", "Please try again.");
                  });
                }}
                style={[styles.actionButton, { borderColor: border, alignSelf: "flex-start", marginBottom: 10 }]}
              >
                <Ionicons name="link-outline" size={15} color={muted} />
                <Text style={[styles.actionText, { color: muted }]}>Open Source Link</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              <Text style={[styles.modalSectionTitle, { color: theme.textColor }]}>Ingredients</Text>
              {getRecipeIngredientsForModal(selectedRecipePost).length === 0 ? (
                <Text style={[styles.modalLoadingText, { color: muted }]}>No ingredients on this post.</Text>
              ) : (
                getRecipeIngredientsForModal(selectedRecipePost).map((ingredient, index) => (
                  <Text key={`modal-ingredient-${index}`} style={[styles.modalBulletText, { color: theme.textColor }]}>• {ingredient}</Text>
                ))
              )}

              <Text style={[styles.modalSectionTitle, { color: theme.textColor, marginTop: 10 }]}>Instructions</Text>
              {getRecipeInstructionsForModal(selectedRecipePost).length === 0 ? (
                <Text style={[styles.modalLoadingText, { color: muted }]}>No full instructions available for this post yet.</Text>
              ) : (
                getRecipeInstructionsForModal(selectedRecipePost).map((instruction, index) => (
                  <Text key={`modal-instruction-${index}`} style={[styles.modalInstructionText, { color: theme.textColor }]}>{index + 1}. {instruction}</Text>
                ))
              )}
            </ScrollView>

            <TouchableOpacity onPress={() => setShowRecipeModal(false)} style={[styles.modalButton, { borderColor: border }]}>
              <Text style={[styles.modalButtonText, { color: muted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showLikesModal} transparent animationType="fade" onRequestClose={() => setShowLikesModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Liked By</Text>
            <Text style={[styles.modalSubtitle, { color: muted }]}>{likesForPost?.recipeName || "Post"}</Text>

            {loadingLikers ? (
              <Text style={[styles.modalLoadingText, { color: muted }]}>Loading likes...</Text>
            ) : likers.length === 0 ? (
              <Text style={[styles.modalLoadingText, { color: muted }]}>No likes yet.</Text>
            ) : (
              <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                {likers.map((liker) => (
                  <View key={liker.userId} style={[styles.modalListItem, { borderColor: border }]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{liker.displayName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.user, { color: theme.textColor }]}>{liker.displayName}</Text>
                      <Text style={[styles.handle, { color: muted }]}>{liker.handle}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={() => setShowLikesModal(false)} style={[styles.modalButton, { borderColor: border }]}>
              <Text style={[styles.modalButtonText, { color: muted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCommentsModal} transparent animationType="fade" onRequestClose={() => setShowCommentsModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>Comments</Text>
            <Text style={[styles.modalSubtitle, { color: muted }]}>{commentsForPost?.recipeName || "Post"}</Text>

            <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
              {comments.length === 0 ? (
                <Text style={[styles.modalLoadingText, { color: muted }]}>No comments yet. Start the conversation.</Text>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentItem, { borderColor: border }]}> 
                    <Text style={[styles.commentAuthor, { color: theme.textColor }]}>
                      {comment.userDisplayName} <Text style={{ color: muted, fontWeight: "500" }}>{comment.userHandle}</Text>
                      {(comment.isEdited || !!comment.editedAt) ? <Text style={{ color: muted, fontWeight: "500" }}> (edited)</Text> : null}
                    </Text>
                    {editingCommentId === comment.id ? (
                      <>
                        <TextInput
                          value={editingCommentText}
                          onChangeText={setEditingCommentText}
                          placeholder="Edit comment..."
                          placeholderTextColor={muted}
                          style={[styles.commentInput, { color: theme.textColor, borderColor: border, backgroundColor: isDark ? "#1b1b1b" : "#fff", marginTop: 6 }]}
                        />
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setEditingCommentId(null);
                              setEditingCommentText("");
                            }}
                            style={[styles.modalButton, { borderColor: border }]}
                          >
                            <Text style={[styles.modalButtonText, { color: muted }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => saveEditedComment(comment)}
                            disabled={commentActionBusyId === comment.id}
                            style={[styles.modalButton, { borderColor: theme.accentColor, backgroundColor: theme.accentColor + "18" }, commentActionBusyId === comment.id && { opacity: 0.7 }]}
                          >
                            <Text style={[styles.modalButtonText, { color: theme.accentColor }]}>{commentActionBusyId === comment.id ? "Saving..." : "Save"}</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.commentText, { color: theme.textColor }]}>{comment.text}</Text>
                        {comment.userId === userId && (
                          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                            <TouchableOpacity onPress={() => beginEditComment(comment)}>
                              <Text style={{ color: theme.accentColor, fontWeight: "700", fontSize: 12 }}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteComment(comment)} disabled={commentActionBusyId === comment.id}>
                              <Text style={{ color: "#c62828", fontWeight: "700", fontSize: 12 }}>{commentActionBusyId === comment.id ? "Deleting..." : "Delete"}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.commentComposerRow}>
              <TextInput
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="Add a comment..."
                placeholderTextColor={muted}
                style={[styles.commentInput, { color: theme.textColor, borderColor: border, backgroundColor: isDark ? "#1b1b1b" : "#fff" }]}
              />
              <TouchableOpacity
                onPress={addComment}
                disabled={sendingComment || commentInput.trim().length === 0}
                style={[styles.commentSendButton, { backgroundColor: theme.accentColor }, (sendingComment || commentInput.trim().length === 0) && { opacity: 0.6 }]}
              >
                <Ionicons name="send" size={15} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => setShowCommentsModal(false)} style={[styles.modalButton, { borderColor: border }]}>
              <Text style={[styles.modalButtonText, { color: muted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showUserModal} transparent animationType="fade" onRequestClose={() => setShowUserModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}> 
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>User Profile</Text>

            {!selectedUserProfile || loadingUserProfile ? (
              <Text style={[styles.modalLoadingText, { color: muted }]}>Loading profile...</Text>
            ) : (
              <>
                <View style={[styles.modalListItem, { borderColor: border, marginTop: 10 }]}> 
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{selectedUserProfile.displayName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.user, { color: theme.textColor }]}>{selectedUserProfile.displayName}</Text>
                    <Text style={[styles.handle, { color: muted }]}>{selectedUserProfile.handle}</Text>
                    <Text style={[styles.modalSubtitle, { color: muted, marginTop: 4 }]}> 
                      {friendIds.has(selectedUserProfile.userId) ? "Friend Profile" : "Public Profile"}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.modalSectionTitle, { color: theme.textColor, marginTop: 10 }]}>Allergies</Text>
                {selectedUserProfile.allergies.length === 0 ? (
                  <Text style={[styles.modalLoadingText, { color: muted }]}>No allergies listed.</Text>
                ) : (
                  <View style={styles.profileChipRow}>
                    {(friendIds.has(selectedUserProfile.userId)
                      ? selectedUserProfile.allergies
                      : selectedUserProfile.allergies.slice(0, 3)
                    ).map((allergy) => (
                      <View key={`${selectedUserProfile.userId}-${allergy}`} style={[styles.profileChip, { borderColor: border }]}> 
                        <Text style={[styles.profileChipText, { color: theme.textColor }]}>{allergy}</Text>
                      </View>
                    ))}
                    {!friendIds.has(selectedUserProfile.userId) && selectedUserProfile.allergies.length > 3 && (
                      <View style={[styles.profileChip, { borderColor: border }]}>
                        <Text style={[styles.profileChipText, { color: muted }]}>+{selectedUserProfile.allergies.length - 3} more</Text>
                      </View>
                    )}
                  </View>
                )}

                <Text style={[styles.modalSectionTitle, { color: theme.textColor, marginTop: 10 }]}>Public Recipes</Text>
                {selectedUserProfile.publicRecipes.length === 0 ? (
                  <Text style={[styles.modalLoadingText, { color: muted }]}>No public recipes yet.</Text>
                ) : (
                  <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {selectedUserProfile.publicRecipes.map((recipe) => (
                      <TouchableOpacity
                        key={recipe.id}
                        onPress={() => openPublicRecipePreview(recipe)}
                        style={[styles.modalListItem, { borderColor: border }]}
                        activeOpacity={0.8}
                      >
                        {!!recipe.imageUrl && <Image source={{ uri: recipe.imageUrl }} contentFit="cover" style={styles.profileRecipeThumb} transition={140} />}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.user, { color: theme.textColor }]} numberOfLines={1}>{recipe.name}</Text>
                          <Text style={[styles.handle, { color: muted }]}>
                            {recipe.cookTime ? `${recipe.cookTime} min` : "Time n/a"} • {recipe.difficulty || "easy"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={muted} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {friendIds.has(selectedUserProfile.userId) && (
                  <>
                    <Text style={[styles.modalSectionTitle, { color: theme.textColor, marginTop: 10 }]}>Shared With You Recently</Text>
                    {selectedUserProfile.sharedRecently.length === 0 ? (
                      <Text style={[styles.modalLoadingText, { color: muted }]}>No recent shares from this friend.</Text>
                    ) : (
                      <View style={{ gap: 8, marginTop: 8 }}>
                        {selectedUserProfile.sharedRecently.slice(0, 4).map((item) => (
                          <View key={item.id} style={[styles.modalListItem, { borderColor: border }]}> 
                            <Ionicons name="mail-outline" size={14} color={muted} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.modalBulletText, { color: theme.textColor }]} numberOfLines={1}>{item.recipeName}</Text>
                              {!!formatTimestamp(item.createdAt) && (
                                <Text style={[styles.handle, { color: muted }]}>Shared {formatTimestamp(item.createdAt)}</Text>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}

                <View style={[styles.modalListItem, { borderColor: border, marginTop: 8 }]}> 
                  <Text style={[styles.modalBulletText, { color: theme.textColor, flex: 1 }]}>Social posts: {selectedUserProfile.socialPostCount}</Text>
                </View>

                {selectedUserProfile.userId !== userId && (
                  <TouchableOpacity
                    onPress={() => sendFriendRequest(selectedUserProfile.userId, selectedUserProfile.displayName)}
                    disabled={friendIds.has(selectedUserProfile.userId) || outgoingIds.has(selectedUserProfile.userId)}
                    style={[
                      styles.modalButton,
                      { borderColor: theme.accentColor, backgroundColor: theme.accentColor + "18", marginTop: 10, alignItems: "center" },
                      (friendIds.has(selectedUserProfile.userId) || outgoingIds.has(selectedUserProfile.userId)) && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: theme.accentColor }]}>
                      {friendIds.has(selectedUserProfile.userId)
                        ? "Already Friends"
                        : outgoingIds.has(selectedUserProfile.userId)
                          ? "Request Sent"
                          : "Add Friend"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity onPress={() => setShowUserModal(false)} style={[styles.modalButton, { borderColor: border, marginTop: 10 }]}> 
              <Text style={[styles.modalButtonText, { color: muted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedPublicRecipe} transparent animationType="fade" onRequestClose={() => setSelectedPublicRecipe(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: theme.textColor }]}>{selectedPublicRecipe?.name || "Public Recipe"}</Text>
            {!!selectedPublicRecipe?.description && (
              <Text style={[styles.modalSubtitle, { color: muted }]}>{selectedPublicRecipe.description}</Text>
            )}

            {!!selectedPublicRecipe?.imageUrl && (
              <Image source={{ uri: selectedPublicRecipe.imageUrl }} contentFit="cover" style={styles.modalRecipeImage} transition={180} />
            )}

            {!!selectedPublicRecipe?.sourceUrl && (
              <TouchableOpacity
                onPress={() => {
                  if (!selectedPublicRecipe.sourceUrl) return;
                  Linking.openURL(selectedPublicRecipe.sourceUrl).catch(() => {
                    Alert.alert("Could not open source", "Please try again.");
                  });
                }}
                style={[styles.actionButton, { borderColor: border, alignSelf: "flex-start", marginBottom: 10 }]}
              >
                <Ionicons name="link-outline" size={15} color={muted} />
                <Text style={[styles.actionText, { color: muted }]}>Open Source Link</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.modalList} contentContainerStyle={{ gap: 8 }}>
              <Text style={[styles.modalSectionTitle, { color: theme.textColor }]}>Ingredients</Text>
              {(selectedPublicRecipe?.ingredients || []).length === 0 ? (
                <Text style={[styles.modalLoadingText, { color: muted }]}>No ingredients listed.</Text>
              ) : (
                (selectedPublicRecipe?.ingredients || []).map((ingredient, index) => {
                  const qty = `${ingredient.quantity ?? ""}`.trim();
                  const unit = `${ingredient.unit ?? ""}`.trim();
                  const prefix = [qty, unit].filter(Boolean).join(" ");
                  return (
                    <Text key={`public-recipe-ing-${index}`} style={[styles.modalBulletText, { color: theme.textColor }]}>
                      • {prefix ? `${prefix} ${ingredient.name}` : ingredient.name}
                    </Text>
                  );
                })
              )}

              <Text style={[styles.modalSectionTitle, { color: theme.textColor, marginTop: 10 }]}>Instructions</Text>
              {(selectedPublicRecipe?.instructions || []).length === 0 ? (
                <Text style={[styles.modalLoadingText, { color: muted }]}>No instructions listed.</Text>
              ) : (
                (selectedPublicRecipe?.instructions || []).map((instruction, index) => (
                  <Text key={`public-recipe-step-${index}`} style={[styles.modalInstructionText, { color: theme.textColor }]}>
                    {index + 1}. {instruction}
                  </Text>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => selectedPublicRecipe && savePublicRecipeToKitchen(selectedPublicRecipe)}
              style={[styles.modalButton, { borderColor: theme.accentColor, backgroundColor: theme.accentColor + "18", marginBottom: 8, alignItems: "center" }]}
            >
              <Text style={[styles.modalButtonText, { color: theme.accentColor }]}>Save to My Recipes</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSelectedPublicRecipe(null)} style={[styles.modalButton, { borderColor: border }]}>
              <Text style={[styles.modalButtonText, { color: muted }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
