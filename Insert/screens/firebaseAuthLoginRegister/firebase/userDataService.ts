/**
 * User Data Service
 * 
 * Single source of truth for all Firestore paths.
 * All user data lives under users/{uid}/ so one security rule covers everything.
 * 
 * Structure:
 *   users/{uid}                         ← profile doc
 *   users/{uid}/pantry/{itemId}
 *   users/{uid}/pendingPantry/{itemId}
 *   users/{uid}/recipes/{recipeId}
 *   users/{uid}/shoppingList/{itemId}
 *   users/{uid}/settings/preferences
 *   users/{uid}/settings/locations
 */

import { db } from "./config";
import {
  doc,
  collection,
  setDoc,
  getDoc,
  serverTimestamp,
  DocumentReference,
  CollectionReference,
} from "firebase/firestore";

// ── TypeScript interfaces ───────────────────────────────────────────────────

export interface UserProfile {
  email: string;
  displayName: string;
  allergies?: string[];
  dietaryRestrictions?: string[];
  createdAt: unknown; // serverTimestamp
  updatedAt?: unknown;
}

export interface PantryItem {
  name: string;
  type: string;
  quantity: number;
  unit: string;
  location: string;
  dateAdded: string;
  expirationDate: string;
  userId: string;
  createdAt: number;
}

export interface PendingPantryItem {
  name: string;
  quantity: number;
  unit: string;
  location: string;
  dateAdded: string;
  expirationDate: string;
  userId: string;
  createdAt: number;
}

export interface Recipe {
  userId: string;
  name: string;
  description: string;
  imageUrl?: string;
  servings: string;
  cookTime: string;
  difficulty: string;
  visibility?: "private" | "public";
  ingredients: { name: string; quantity: string; unit: string }[];
  instructions: string[];
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: unknown;
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: unknown;
  createdAt?: number;
}

export interface ShoppingItem {
  name: string;
  quantity: string;
  unit: string;
  completed: boolean;
  userId: string;
  createdAt: number;
  source?: string;
}

export interface MealPlanDay {
  date: string; // YYYY-MM-DD
  recipeIds: string[];
  updatedAt?: number;
}

// ── Path helpers ────────────────────────────────────────────────────────────

/** Reference to the user's profile document */
export const userDoc = (uid: string): DocumentReference =>
  doc(db, "users", uid);

/** Collection of pantry items for a user */
export const pantryCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "pantry");

/** Reference to a specific pantry item */
export const pantryDoc = (uid: string, id: string): DocumentReference =>
  doc(db, "users", uid, "pantry", id);

/** Collection of pending pantry items awaiting confirmation */
export const pendingCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "pendingPantry");

/** Reference to a specific pending pantry item */
export const pendingDoc = (uid: string, id: string): DocumentReference =>
  doc(db, "users", uid, "pendingPantry", id);

/** Collection of recipes for a user */
export const recipesCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "recipes");

/** Reference to a specific recipe */
export const recipesDoc = (uid: string, id: string): DocumentReference =>
  doc(db, "users", uid, "recipes", id);

/** Shared index of public recipes */
export const publicRecipesCol = (): CollectionReference =>
  collection(db, "publicRecipes");

/** Reference to a public recipe mirror document */
export const publicRecipeDoc = (recipeId: string): DocumentReference =>
  doc(db, "publicRecipes", recipeId);

/** Collection of shopping list items for a user */
export const shoppingCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "shoppingList");

/** Reference to a specific shopping list item */
export const shoppingDoc = (uid: string, id: string): DocumentReference =>
  doc(db, "users", uid, "shoppingList", id);

/** Collection of meal plans for a user (one doc per date key) */
export const mealPlansCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "mealPlans");

/** Reference to a specific meal plan day document (id: YYYY-MM-DD) */
export const mealPlanDoc = (uid: string, dateKey: string): DocumentReference =>
  doc(db, "users", uid, "mealPlans", dateKey);

/** Reference to a settings document (e.g. "preferences", "locations") */
export const settingsDoc = (uid: string, key: string): DocumentReference =>
  doc(db, "users", uid, "settings", key);

/** Collection of cook history entries for a user */
export const cookHistoryCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "cookHistory");

/** Collection of manual nutrition entries for a user */
export const nutritionEntriesCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "nutritionEntries");

export interface CookHistoryEntry {
  recipeId: string;
  recipeName: string;
  cookedAt: number; // epoch ms
  ingredients: { name: string; quantity: string; unit: string }[];
  recipeIngredientsDetailed?: { name: string; quantity: string; unit: string }[];
  recipeInstructions?: string[];
  recipeImageUrl?: string;
  stepPhotos?: SocialStepPhoto[];
  sharedAt?: number;
  userId: string;
}

export type RecipeVisibility = "private" | "public";

export interface PublicRecipe extends Recipe {
  recipeId: string;
  ownerId: string;
  ownerName?: string;
  ownerHandle?: string;
  visibility: RecipeVisibility;
  updatedAt?: unknown;
}

// ── Shared product database ─────────────────────────────────────────────────

/** Shared products collection — keyed by barcode */
export const productsCol = (): CollectionReference =>
  collection(db, "products");

/** Reference to a specific product by barcode */
export const productDoc = (barcode: string): DocumentReference =>
  doc(db, "products", barcode);

export interface ProductEntry {
  barcode: string;
  name: string;
  type: string;
  unit: string;
  defaultExpirationDays: number;
  brand?: string;
  aliases?: string[];
  netWeightGrams?: number;
  nutritionPer100?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  };
  addedBy: string;
  createdAt: number;
  updatedAt?: number;
}

// ── Social feed ─────────────────────────────────────────────────────────────

export type SocialStepPhoto = {
  stepIndex: number;
  url: string;
};

export interface SocialPost {
  userId: string;
  recipeOwnerId?: string;
  userDisplayName: string;
  userHandle: string;
  recipeId: string;
  recipeName: string;
  recipeImageUrl?: string;
  note?: string;
  ingredients: string[];
  recipeIngredientsDetailed?: { name: string; quantity: string; unit: string }[];
  recipeInstructions?: string[];
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: number | unknown;
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: number | unknown;
  cookedAt?: number;
  sharedAt?: unknown;
  stepPhotos: SocialStepPhoto[];
  likes: string[];
  createdAt: unknown; // serverTimestamp
}

/** Global social posts collection (shared feed across users) */
export const socialPostsCol = (): CollectionReference =>
  collection(db, "socialPosts");

/** Reference to a specific social post */
export const socialPostDoc = (postId: string): DocumentReference =>
  doc(db, "socialPosts", postId);

// ── Friends and shares ─────────────────────────────────────────────────────

/** Collection of accepted friends for a user */
export const friendsCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "friends");

/** Reference to a specific friend relationship doc */
export const friendDoc = (uid: string, friendUid: string): DocumentReference =>
  doc(db, "users", uid, "friends", friendUid);

/** Incoming friend requests for a user */
export const friendRequestsCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "friendRequests");

/** Outgoing friend requests for a user */
export const outgoingFriendRequestsCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "outgoingFriendRequests");

/** In-app recipe shares inbox for a user */
export const recipeSharesCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "recipeShares");

export interface FriendRequest {
  fromUserId: string;
  fromDisplayName: string;
  fromHandle: string;
  status: "pending" | "accepted" | "declined";
  createdAt: unknown; // serverTimestamp
}

export interface RecipeShare {
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  recipeId: string;
  recipeName: string;
  recipeOwnerId: string;
  recipeImageUrl?: string;
  recipeDescription?: string;
  recipeServings?: string | number;
  recipeCookTime?: string | number;
  recipeDifficulty?: string;
  recipeIngredientsDetailed?: Array<{ name: string; quantity?: string | number; unit?: string }>;
  recipeInstructions?: string[];
  sourceUrl?: string;
  originType?: "created" | "imported";
  originalCreatorUserId?: string;
  originalCreatorDisplayName?: string;
  originalCreatedAt?: number | unknown;
  originalImporterUserId?: string;
  originalImporterDisplayName?: string;
  originalImportedAt?: number | unknown;
  status?: "pending" | "accepted" | "denied";
  message?: string;
  createdAt: unknown; // serverTimestamp
}

// ── User profile management ─────────────────────────────────────────────────

/**
 * Creates the user profile doc the first time a user signs up or logs in.
 * Safe to call on every login — does nothing if the doc already exists.
 */
export async function ensureUserProfile(
  uid: string,
  email: string | null,
  displayName: string | null
): Promise<void> {
  const ref = userDoc(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: email ?? "",
      displayName: displayName ?? "",
      createdAt: serverTimestamp(),
    } satisfies UserProfile);
  }
}

/**
 * Updates the user's display name in their profile doc.
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, "displayName" | "email" | "allergies" | "dietaryRestrictions">>
): Promise<void> {
  await setDoc(userDoc(uid), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}
