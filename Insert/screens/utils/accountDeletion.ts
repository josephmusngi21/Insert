import { db } from "@/screens/firebaseAuthLoginRegister/firebase/config";
import { collection, deleteDoc, doc, getDocs, limit, query, where, writeBatch } from "firebase/firestore";

const USER_SUBCOLLECTIONS = [
  "pantry",
  "pendingPantry",
  "recipes",
  "shoppingList",
  "settings",
  "cookHistory",
  "friends",
  "friendRequests",
  "outgoingFriendRequests",
  "recipeShares",
  "notifications",
] as const;

const deleteCollectionByPath = async (pathSegments: string[]) => {
  while (true) {
    const colRef = collection(db, ...pathSegments);
    const snap = await getDocs(query(colRef, limit(300)));
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (snap.size < 300) return;
  }
};

const deletePublicRecipesOwnedByUser = async (uid: string) => {
  while (true) {
    const snap = await getDocs(query(collection(db, "publicRecipes"), where("ownerId", "==", uid), limit(150)));
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (snap.size < 150) return;
  }
};

const deleteSocialPostsOwnedByUser = async (uid: string) => {
  while (true) {
    const postsSnap = await getDocs(query(collection(db, "socialPosts"), where("userId", "==", uid), limit(80)));
    if (postsSnap.empty) return;

    for (const postDoc of postsSnap.docs) {
      await deleteCollectionByPath(["socialPosts", postDoc.id, "comments"]);
    }

    const batch = writeBatch(db);
    postsSnap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (postsSnap.size < 80) return;
  }
};

const removeReciprocalFriendLinks = async (uid: string) => {
  const friendsSnap = await getDocs(query(collection(db, "users", uid, "friends"), limit(400)));

  await Promise.all(
    friendsSnap.docs.map((friendDoc) =>
      deleteDoc(doc(db, "users", friendDoc.id, "friends", uid)).catch(() => undefined)
    )
  );
};

export const deleteUserAccountFirestoreData = async (uid: string) => {
  if (!uid) throw new Error("User ID is required.");

  await removeReciprocalFriendLinks(uid);

  for (const subCollection of USER_SUBCOLLECTIONS) {
    await deleteCollectionByPath(["users", uid, subCollection]);
  }

  await deletePublicRecipesOwnedByUser(uid);
  await deleteSocialPostsOwnedByUser(uid);

  await deleteDoc(doc(db, "users", uid)).catch(() => undefined);
};
