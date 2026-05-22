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
  servings: string;
  cookTime: string;
  difficulty: string;
  ingredients: { name: string; quantity: string; unit: string }[];
  instructions: string[];
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

/** Collection of shopping list items for a user */
export const shoppingCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "shoppingList");

/** Reference to a specific shopping list item */
export const shoppingDoc = (uid: string, id: string): DocumentReference =>
  doc(db, "users", uid, "shoppingList", id);

/** Reference to a settings document (e.g. "preferences", "locations") */
export const settingsDoc = (uid: string, key: string): DocumentReference =>
  doc(db, "users", uid, "settings", key);

/** Collection of cook history entries for a user */
export const cookHistoryCol = (uid: string): CollectionReference =>
  collection(db, "users", uid, "cookHistory");

export interface CookHistoryEntry {
  recipeId: string;
  recipeName: string;
  cookedAt: number; // epoch ms
  ingredients: { name: string; quantity: string; unit: string }[];
  userId: string;
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
  addedBy: string;
  createdAt: number;
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
  updates: Partial<Pick<UserProfile, "displayName" | "email">>
): Promise<void> {
  await setDoc(userDoc(uid), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}
